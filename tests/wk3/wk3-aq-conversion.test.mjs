import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { AirQuality, Metadata } from "../../src/wk3/proto/apple/wk2.js";
import {
    WK3_AQ_COMPARISONS, WK3_AQ_POLLUTANTS, WK3_AQ_SOURCES, WK3_AQ_UNITS,
    WK3AirQualityTable, assertWK3AirQualityReplaceable, decodeAirQuality, encodeAirQuality,
    providerToWK3AirQuality, providerToWK3USAirQuality, wk3AirQualityToProvider,
} from "../../src/wk3/class/WeatherKit3.mjs";

const source = (scale = "HJ6332012", index = 56, categoryIndex = 2) => ({
    metadata: { providerName: "Synthetic", sourceType: "MODELED" }, scale, index, categoryIndex,
    isSignificant: false, primaryPollutant: "PM2_5", previousDayComparison: "SAME",
    pollutants: [{ pollutantType: "PM2_5", amount: 0, units: "MICROGRAMS_PER_CUBIC_METER" }],
});
function roundTrip(value) {
    const b = new Builder(), child = encodeAirQuality(b, value);
    b.finish(child);
    const bytes = b.asUint8Array(), bb = new ByteBuffer(bytes), root = bb.readUint32(0);
    return decodeAirQuality(new WK3AirQualityTable().__init(root, bb));
}

test("every upstream-configured scale family converts and round-trips enums", () => {
    const scales = ["UBA", "EU.EAQI", "HJ6332012", "HJ6332025_DRAFT", "EPA_NowCast", "HK.AQHI", "CA.AQHI", "CN.AQHI"];
    for (const scale of scales) {
        const result = providerToWK3AirQuality(source(scale));
        assert.equal(result.scale, scale);
        assert.equal(wk3AirQualityToProvider(new WK3AirQualityTable().__init(...(() => {
            const b = new Builder(), child = encodeAirQuality(b, result); b.finish(child);
            const bb = new ByteBuffer(b.asUint8Array()); return [bb.readUint32(0), bb];
        })())).scale, scale);
    }
    for (const enumSet of [WK3_AQ_POLLUTANTS, WK3_AQ_UNITS, WK3_AQ_SOURCES, WK3_AQ_COMPARISONS]) {
        for (const [name, wire] of Object.entries(enumSet)) assert.equal(enumSet[name], wire);
    }
});

test("plain decoded numeric AQ reverses to symbolic provider enums", () => {
    const raw = roundTrip(providerToWK3AirQuality(source()));
    const symbolic = wk3AirQualityToProvider(raw);
    assert.equal(symbolic.pollutants[0].pollutantType, "PM2_5");
    assert.equal(symbolic.pollutants[0].units, "MICROGRAMS_PER_CUBIC_METER");
    assert.equal(symbolic.metadata.sourceType, "MODELED");
    assert.equal(wk3AirQualityToProvider({ ...raw, primaryPollutant: 1, pollutants: [] }).primaryPollutant, "NOT_AVAILABLE");
});

test("generic conversion permits NOT_AVAILABLE primary without inventing pollutants", () => {
    const result = providerToWK3AirQuality({ ...source(), primaryPollutant: "NOT_AVAILABLE" });
    assert.equal(result.primaryPollutant, 1);
});

test("provider metadata fills optional wire defaults and preserves modeled/station", () => {
    const result = providerToWK3AirQuality(source());
    assert.equal(result.metadata.latitude, 0);
    assert.equal(result.metadata.longitude, 0);
    assert.equal(result.metadata.readTime, 0);
    assert.equal(result.metadata.reportedTime, 0);
    assert.equal(result.metadata.sourceType, 2);
    assert.equal(providerToWK3AirQuality({ ...source(), metadata: { providerName: "Station", sourceType: "STATION" } }).metadata.sourceType, 3);
});

test("rejects unrecognized scales/enums, missing metadata, negative and invalid scalars", () => {
    for (const invalid of [
        { ...source(), scale: "IE.AQIH" },
        { ...source(), metadata: null },
        { ...source(), metadata: { providerName: "x" } },
        { ...source(), pollutants: [{ pollutantType: "UNKNOWN14", amount: 1, units: "PARTS_PER_BILLION" }] },
        { ...source(), pollutants: [{ pollutantType: "PM2_5", amount: -0.1, units: "PARTS_PER_BILLION" }] },
        { ...source(), index: 32768 },
        { ...source(), categoryIndex: 128 },
    ]) assert.throws(() => providerToWK3AirQuality(invalid));
});

test("generic accepts EPA AQI above 500; strict US wrapper keeps its limit", () => {
    const generic = providerToWK3AirQuality({ ...source("EPA_NowCast.2414", 501, 6), isSignificant: true });
    assert.equal(generic.scale, "EPA_NowCast.2604");
    assert.equal(generic.index, 501);
    assert.throws(() => providerToWK3AirQuality(source("EPA_NowCast", 501, 5)));
    assert.throws(() => providerToWK3USAirQuality({ ...source("EPA_NowCast.2414", 501, 6), isSignificant: true }));
    assert.equal(providerToWK3USAirQuality({ ...source("EPA_NowCast.2414", 400, 6), isSignificant: true }).scale, "EPA_NowCast.2604");
});

test("unknown AQ enum wire values fail closed on reverse mapping", () => {
    const b = new Builder();
    const child = encodeAirQuality(b, { metadata: { providerName: "x", sourceType: 1 }, scale: "UBA", index: 0, categoryIndex: 1, primaryPollutant: 13, pollutants: [] });
    b.finish(child);
    const bb = new ByteBuffer(b.asUint8Array());
    const table = new WK3AirQualityTable().__init(bb.readUint32(0), bb);
    assert.throws(() => wk3AirQualityToProvider(table));
});

test("replaceability permits missing AQ and checks nested unknown fields", () => {
    const b = new Builder();
    b.startObject(1); b.addFieldInt32(0, 1, 0); const marker = b.endObject();
    b.startObject(15); b.addFieldOffset(1, marker, 0); b.finish(b.endObject());
    assert.equal(assertWK3AirQualityReplaceable(b.asUint8Array()), true);
    const valid = roundTrip(providerToWK3AirQuality(source()));
    assert.equal(valid.scale, "HJ6332012");
    const nested = new Builder();
    const metadata = Metadata.createMetadata(nested, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, 1);
    nested.startObject(9); nested.addFieldOffset(0, metadata, 0); nested.addFieldInt32(8, 1, 0); const aq = nested.endObject();
    nested.startObject(15); nested.addFieldOffset(0, aq, 0); nested.finish(nested.endObject());
    assert.throws(() => assertWK3AirQualityReplaceable(nested.asUint8Array()), /Unknown WK3 AQ table fields/);
    const missingMeta = new Builder();
    const child = AirQuality.createAirQuality(missingMeta, 0, 1, 0, false, 0, 0, 0, 0);
    missingMeta.startObject(15); missingMeta.addFieldOffset(0, child, 0); missingMeta.finish(missingMeta.endObject());
    assert.equal(assertWK3AirQualityReplaceable(missingMeta.asUint8Array()), true);
});
