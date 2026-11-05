import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { WK3AirQualityTable, encodeAirQuality, decodeAirQuality } from "../../src/wk3/class/WeatherKit3.mjs";
import { WK3_COMPARISON, computeWK3Comparison, injectWK3Comparison } from "../../src/wk3/class/WK3Comparison.mjs";

const aq = (categoryIndex = 2, scale = "EPA_NowCast.2604") => ({
    metadata: { providerName: "Synthetic", temporarilyUnavailable: false },
    index: [0, 25, 75, 125, 175, 250, 350][categoryIndex], categoryIndex, scale,
    previousDayComparison: 2, pollutants: [], primaryPollutant: 1,
});
const us = { currentProvider: "ColorfulCloudsUS", yesterdayProvider: "ColorfulCloudsUS" };

test("independently observed WK3 enums survive actual AQ FlatBuffer codec", () => {
    // Sanitized paired Apple v3 JSON/FlatBuffer observations, 2026-11-04.
    // BETTER observed in two US requests and one Canadian request; WORSE in US.
    const observed = [["UNKNOWN", 0], ["SAME", 3], ["BETTER", 4], ["WORSE", 2]];
    for (const [json, wire] of observed) {
        assert.equal(WK3_COMPARISON[json], wire);
        const b = new Builder();
        b.finish(encodeAirQuality(b, { ...aq(), previousDayComparison: wire }));
        const bb = new ByteBuffer(b.asUint8Array());
        const table = new WK3AirQualityTable().__init(bb.readUint32(0), bb);
        assert.equal(decodeAirQuality(table).previousDayComparison, wire);
    }
});

test("category trend uses verified BETTER=4 WORSE=2 SAME=3, not AQI arithmetic", () => {
    assert.equal(computeWK3Comparison(aq(1), aq(2), us), 4);
    assert.equal(computeWK3Comparison(aq(3), aq(2), us), 2);
    assert.equal(computeWK3Comparison({ ...aq(2), index: 51 }, { ...aq(2), index: 99 }, us), 3);
    // The two observed scale versions share category boundaries.
    assert.equal(computeWK3Comparison(aq(2), aq(2, "EPA_NowCast.2414"), us), 3);
    const cn = { currentProvider: "ColorfulCloudsCN", yesterdayProvider: "ColorfulCloudsCN" };
    assert.equal(computeWK3Comparison(aq(2, "HJ6332012.2604"), aq(3, "HJ6332012.2414"), cn), 4);
});

test("missing, unavailable, invalid or inconsistent categories fail closed", () => {
    const bad = [null, {}, { ...aq(), metadata: undefined }, { ...aq(), metadata: { temporarilyUnavailable: true } },
        ...[undefined, null, -1, 0, 7, 2.5, "2", NaN, Infinity].map(categoryIndex => ({ ...aq(), categoryIndex })),
        ...["EPA_NowCast.9999", "EPA_NowCast", "EU.2604", "HJ6332012.9999", undefined].map(scale => ({ ...aq(), scale })),
        ...[-1, 501, NaN, Infinity, "75", null, 200].map(index => ({ ...aq(), index }))];
    for (const value of bad) {
        assert.equal(computeWK3Comparison(aq(), value, us), 0);
        assert.equal(computeWK3Comparison(value, aq(), us), 0);
    }
    assert.equal(computeWK3Comparison({ ...aq(), index: undefined }, aq(), us), 3);
});

test("same category never permits cross-standard or cross-provider comparison", () => {
    const a = aq(), cn = aq(2, "HJ6332012.2604");
    assert.equal(computeWK3Comparison(a, cn, us), 0);
    assert.equal(computeWK3Comparison(cn, cn, us), 0); // US provider cannot claim CN.
    assert.equal(computeWK3Comparison(a, a, { currentProvider: "QWeather", yesterdayProvider: "QWeather" }), 0);
    assert.equal(computeWK3Comparison(a, a, { ...us, yesterdayProvider: "WeatherKit" }), 0);
    assert.equal(computeWK3Comparison(a, a), 0);
    assert.equal(computeWK3Comparison(a, a, { currentProvider: "", yesterdayProvider: "" }), 0);
    assert.equal(computeWK3Comparison(a, a, { currentProvider: "Calculate", yesterdayProvider: "Calculate" }), 0);
    assert.equal(computeWK3Comparison(a, a, { currentProvider: "Calculate:QWeather:US", yesterdayProvider: "Calculate:ColorfulClouds:US" }), 0);
});

test("ColorfulClouds US fetch uses YesterdayAirQuality(true) and never fetches another current AQ", async () => {
    const original = aq(1), snapshot = structuredClone(original), calls = [];
    const sources = { colorfulClouds: {
        YesterdayAirQuality: async useUsa => { calls.push(useUsa); return aq(2, "EPA_NowCast.2414"); },
        CurrentAirQuality: async () => { throw new Error("Must not substitute another current index"); },
    } };
    const result = await injectWK3Comparison(original, { ...us, sources });
    assert.deepEqual(calls, [true]);
    assert.equal(result.previousDayComparison, 4);
    assert.deepEqual(original, snapshot);
    assert.notEqual(result, original);
    assert.equal(result.metadata, original.metadata);
    assert.equal(result.pollutants, original.pollutants);
    assert.equal(result.index, original.index);
    assert.equal(result.scale, original.scale);
});

test("CN selection uses YesterdayAirQuality(false), without relabeling its standard", async () => {
    const options = { currentProvider: "ColorfulCloudsCN", sources: { colorfulClouds: {
        YesterdayAirQuality: async useUsa => { assert.equal(useUsa, false); return aq(1, "HJ6332012.2414"); },
    } } };
    assert.equal((await injectWK3Comparison(aq(3, "HJ6332012.2604"), options)).previousDayComparison, 2);
    assert.equal((await injectWK3Comparison(aq(3), options)).previousDayComparison, 0);
});

test("mismatched configured provider never triggers fallback to another provider", async () => {
    let calls = 0;
    const sources = { colorfulClouds: { YesterdayAirQuality: async () => { calls++; return aq(); } } };
    const result = await injectWK3Comparison(aq(), { currentProvider: "WeatherKit", yesterdayProvider: "ColorfulCloudsUS", sources });
    assert.equal(result.previousDayComparison, 0);
    assert.equal(calls, 0);
    assert.equal((await injectWK3Comparison(aq(), { currentProvider: "WeatherKit", sources })).previousDayComparison, 0);
});

test("already fetched data and promises bypass network and preserve caller source identity", async () => {
    let calls = 0;
    const sources = { colorfulClouds: { YesterdayAirQuality: () => { calls++; throw new Error("No network needed"); } } };
    for (const yesterday of [aq(3), Promise.resolve(aq(3))]) {
        assert.equal((await injectWK3Comparison(aq(2), { ...us, yesterday, sources })).previousDayComparison, 4);
    }
    const provider = "Calculate:QWeather:WAQI_InstantCast_US";
    assert.equal((await injectWK3Comparison(aq(3), { currentProvider: provider, yesterday: aq(1) })).previousDayComparison, 2);
    assert.equal((await injectWK3Comparison(aq(2), { ...us, yesterday: null, sources })).previousDayComparison, 0);
    assert.equal(calls, 0);
});

test("QWeather receives caller-resolved locationInfo only for its own CN standard", async () => {
    const locationInfo = { id: "synthetic" }; let calls = 0;
    const options = { currentProvider: "QWeather", locationInfo, sources: { qWeather: {
        YesterdayAirQuality: async location => { calls++; assert.equal(location, locationInfo); return aq(2, "HJ6332012.2414"); },
    } } };
    assert.equal((await injectWK3Comparison(aq(2, "HJ6332012.2604"), options)).previousDayComparison, 3);
    assert.equal((await injectWK3Comparison(aq(), options)).previousDayComparison, 0);
    assert.equal((await injectWK3Comparison(aq(2, "HJ6332012.2604"), { ...options, locationInfo: undefined })).previousDayComparison, 0);
    assert.equal(calls, 1);
});

test("provider errors, rejected prefetch and unsupported data clear stale comparison, keeping AQ usable", async () => {
    const original = aq();
    const scenarios = [
        { sources: {} },
        { sources: { colorfulClouds: { YesterdayAirQuality: async () => { throw new Error("private provider failure"); } } } },
        { sources: { colorfulClouds: { YesterdayAirQuality: () => { throw new Error("sync failure"); } } } },
        { yesterday: Promise.reject(new Error("prefetch failed")) },
        { yesterday: { ...aq(), metadata: { temporarilyUnavailable: true } } },
        { yesterday: aq(2, "HJ6332012.2414") },
        { yesterday: { ...aq(), categoryIndex: -1 } },
    ];
    for (const scenario of scenarios) {
        const result = await injectWK3Comparison(original, { ...us, ...scenario });
        assert.deepEqual(result, { ...original, previousDayComparison: 0 });
    }
    assert.equal(original.previousDayComparison, 2);
});

test("rejected prefetch is consumed even if mismatch skips comparison", async () => {
    const result = await injectWK3Comparison(aq(), { ...us, yesterdayProvider: "QWeather", yesterday: Promise.reject(new Error("already dispatched")) });
    assert.equal(result.previousDayComparison, 0);
    await new Promise(resolve => setImmediate(resolve));
});
