import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { WK3_CODECS, WK3_ROOT_SLOTS, decodeWK3DataSet, encodeAirQuality, decodeAirQuality, WK3AirQualityTable } from "../../src/egern/wk3/class/WeatherKit3.mjs";

// Synthetic only. No HAR bytes, provider URLs, coordinates or authorization.
function finish(builder, offset) { builder.finish(offset); return builder.asUint8Array(); }
function root(data) {
    const b = new Builder(), offset = data ? encodeAirQuality(b, data) : 0;
    b.startObject(15); if (offset) b.addFieldOffset(0, offset, 0);
    return finish(b, b.endObject());
}
function child(bytes) { const bb = new ByteBuffer(bytes); return new WK3AirQualityTable().__init(bb.readUint32(0), bb); }
const aq = {
    metadata: { providerName: "Synthetic", sourceType: 3, expireTime: 2000000000, temporarilyUnavailable: false },
    categoryIndex: 2, index: 42, isSignificant: true,
    pollutants: [{ pollutantType: 12, amount: 0.5, units: 2 }, { pollutantType: 231, amount: 16.25, units: 202 }],
    previousDayComparison: 3, primaryPollutant: 11, scale: "SYNTHETIC",
};

test("AQ keeps raw enums, float32 amounts and metadata", () => {
    const actual = decodeWK3DataSet(root(aq));
    assert.deepEqual(actual.pollutants, aq.pollutants);
    assert.equal(actual.primaryPollutant, 11);
    assert.equal(actual.metadata.sourceType, 3);
    assert.equal(actual.metadata.expireTime, 2000000000);
    assert.equal(actual.index, 42);
    assert.equal(actual.isSignificant, true);
    const b = new Builder(), bytes = finish(b, encodeAirQuality(b, actual));
    assert.deepEqual(decodeAirQuality(child(bytes)), actual);
});
test("index/category/scale edits preserve source primary and pollutant integers", () => {
    const actual = decodeWK3DataSet(root(aq));
    const patch = { ...actual, index: 75, categoryIndex: 3, scale: "ANOTHER_SYNTHETIC", previousDayComparison: 4 };
    const b = new Builder(), bytes = finish(b, encodeAirQuality(b, patch));
    assert.deepEqual(decodeAirQuality(child(bytes)), patch);
    assert.equal(patch.primaryPollutant, actual.primaryPollutant);
    assert.deepEqual(patch.pollutants, actual.pollutants);
});
test("root positions explicitly separate periodic, nextHour and articles", () => {
    assert.deepEqual(WK3_ROOT_SLOTS, { airQuality: 0, forecastPeriodic: 4, forecastNextHour: 5, news: 14 });
    assert.deepEqual(Object.keys(WK3_CODECS), ["airQuality"]);
    assert.throws(() => decodeWK3DataSet(root(), "forecastNextHour"), /Unsupported/);
});
test("missing AQ and omitted fields use generated wire defaults", () => {
    assert.equal(decodeWK3DataSet(root()), null);
    const actual = decodeWK3DataSet(root({}));
    assert.equal(actual.metadata, null);
    assert.equal(actual.scale, null);
    assert.equal(actual.index, 0);
    assert.equal(actual.isSignificant, false);
    assert.deepEqual(actual.pollutants, []);
});
test("WK2 enum strings including UNKNOWN13 are rejected", () => {
    for (const name of ["CO", "UNKNOWN13", "PM2_5"]) assert.throws(() => encodeAirQuality(new Builder(), { primaryPollutant: name }), /raw integer/);
    assert.throws(() => encodeAirQuality(new Builder(), { pollutants: [{ pollutantType: "NO2" }] }), /raw integer/);
    assert.throws(() => encodeAirQuality(new Builder(), { metadata: { sourceType: "STATION" } }), /raw integer/);
    assert.throws(() => encodeAirQuality(new Builder(), { pollutants: [{ pollutantType: 6, units: "UNKNOWN2" }] }), /raw integer/);
    for (const value of [-1, 256, 1.5, NaN, Infinity]) assert.throws(() => encodeAirQuality(new Builder(), { categoryIndex: value }));
    assert.throws(() => encodeAirQuality(new Builder(), { index: 65536 }));
    assert.throws(() => encodeAirQuality(new Builder(), { pollutants: [{ amount: 1e100 }] }));
});
test("raw 13 is preserved as a number without claiming a pollutant name", () => {
    const actual = decodeWK3DataSet(root({ primaryPollutant: 13, pollutants: [{ pollutantType: 13, units: 2, amount: 10 }] }));
    assert.equal(actual.primaryPollutant, 13);
    assert.deepEqual(actual.pollutants, [{ pollutantType: 13, units: 2, amount: 10 }]);
});
test("ByteBuffer position and Uint8Array view offsets are honored", () => {
    const bytes = root(aq), padded = new Uint8Array(bytes.length + 8); padded.set(bytes, 8);
    const bb = new ByteBuffer(padded); bb.setPosition(8);
    assert.deepEqual(decodeWK3DataSet(bb).pollutants, aq.pollutants);
    assert.deepEqual(decodeWK3DataSet(padded.subarray(8)).pollutants, aq.pollutants);
});
