import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { WK3AirQualityTable, encodeAirQuality, decodeAirQuality } from "../../src/wk3/class/WeatherKit3.mjs";
import { WK3_COMPARISON, computeWK3Comparison, injectWK3Comparison } from "../../src/wk3/class/WK3Comparison.mjs";
import AirQuality from "../../src/wk3/class/AirQuality.mjs";

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

const menuStandards = [
    "HJ6332012", "IE.AQIH", "AT.AQI", "BE.BelAQI", "UBA", "FR.ATMO", "KR.CAI",
    "CA.AQHI", "CZ.AQI", "NL.LKI", "EPA_NowCast", "ICARS", "EU.EAQI", "CH.KBI",
    "ES.MITECO", "SG.NEA", "NAQI", "DAQI", "HK.AQHI", "CN.AQHI",
];
const weatherKit = { currentProvider: "WeatherKit", yesterdayProvider: "WeatherKit" };

test("all menu standards compare same-source categories without imposing CN/US AQI ranges", async () => {
    for (const name of menuStandards) {
        for (const version of ["2414", "2604"]) {
            const scale = `${name}.${version}`;
            // Category-only history is a supported provider contract. The local
            // helper does not invent concentration or foreign index boundaries.
            const current = { ...aq(2, scale), index: undefined };
            const previous = { ...aq(3, scale), index: undefined };
            assert.equal(computeWK3Comparison(current, previous, weatherKit), 4, scale);
            assert.equal(computeWK3Comparison(previous, current, weatherKit), 2, scale);
            assert.equal(computeWK3Comparison(current, current, weatherKit), 3, scale);
            const result = await injectWK3Comparison(current, { ...weatherKit, yesterday: previous });
            assert.equal(result.previousDayComparison, 4, scale);
        }
        assert.equal(computeWK3Comparison({ ...aq(2, `${name}.9999`), index: undefined },
            { ...aq(2, `${name}.9999`), index: undefined }, weatherKit), 0, name);
    }
    for (const name of ["CA.AQHI", "HK.AQHI", "CN.AQHI"]) {
        const current = { ...aq(2, name), index: 2 }, yesterday = { ...aq(3, name), index: 3 };
        assert.equal(computeWK3Comparison(current, yesterday, weatherKit), 4, name);
        assert.equal(computeWK3Comparison(current, { ...yesterday, scale: `${name}.2414` }, weatherKit), 0, name);
    }
    for (const name of menuStandards.filter(name => !["HJ6332012", "EPA_NowCast"].includes(name))) {
        assert.equal(computeWK3Comparison({ ...aq(2, `${name}.2414`), index: undefined },
            { ...aq(2, `${name}.2604`), index: undefined }, weatherKit), 0, name);
    }
});

test("non-US/CN indices use source categories, including AQHI 11 and representable WK3 values", () => {
    const local = (categoryIndex, scale, index) => ({ ...aq(), categoryIndex, scale, index });
    assert.equal(computeWK3Comparison(local(11, "CA.AQHI", 11), local(10, "CA.AQHI", 10), weatherKit), 2);
    assert.equal(computeWK3Comparison(local(7, "DAQI.2604", 7), local(9, "DAQI.2604", 9), weatherKit), 4);
    assert.equal(computeWK3Comparison(local(6, "KR.CAI.2604", 900), local(6, "KR.CAI.2604", 1000), weatherKit), 3);
    for (const [scale, categoryIndex] of [["UBA.2414", 6], ["EU.EAQI.2414", 7], ["CA.AQHI", 12], ["DAQI.2414", 128]]) {
        const value = local(categoryIndex, scale, undefined);
        assert.equal(computeWK3Comparison(value, value, weatherKit), 0, scale);
    }
    assert.equal(computeWK3Comparison(local(2, "EU.EAQI", 18), local(2, "EU.EAQI", 18), weatherKit), 3);
    for (const scale of ["UBA", "SomeFutureAQI.2604", "EPA_NowCast.2604.extra", "CA.AQHI.9999"]) {
        const value = local(2, scale, 2);
        assert.equal(computeWK3Comparison(value, value, weatherKit), 0, scale);
    }
    for (const index of [NaN, Infinity, -1, 32768, "7", null, 1.5]) {
        const value = local(2, "DAQI.2414", index);
        assert.equal(computeWK3Comparison(value, value, weatherKit), 0, String(index));
    }
});

const algorithms = [
    "UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT",
    "CA_AQHI", "HK_AQHI", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK",
];
function calculatedAQ(algorithm, amount) {
    return AirQuality.Pollutants2AQI({
        metadata: { providerName: "Synthetic QWeather", temporarilyUnavailable: false },
        pollutants: ["PM2_5", "PM10", "OZONE", "NO2", "SO2"].map(pollutantType => ({
            pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER",
        })),
    }, {}, { algorithm });
}

test("all eleven actual built-in algorithms compare precomputed same-source pairs in every direction", async () => {
    for (const algorithm of algorithms) {
        const current = calculatedAQ(algorithm, 1), yesterday = calculatedAQ(algorithm, 300);
        assert.equal(current.metadata.temporarilyUnavailable, false, algorithm);
        assert.equal(yesterday.metadata.temporarilyUnavailable, false, algorithm);
        assert.ok(current.categoryIndex < yesterday.categoryIndex, algorithm);
        const provider = `Calculate:QWeather:${algorithm}`;
        const options = { currentProvider: provider, yesterdayProvider: provider };
        assert.equal(computeWK3Comparison(current, yesterday, options), 4, algorithm);
        assert.equal(computeWK3Comparison(yesterday, current, options), 2, algorithm);
        assert.equal(computeWK3Comparison(current, current, options), 3, algorithm);
        const injected = await injectWK3Comparison(current, { currentProvider: provider, yesterday: Promise.resolve(yesterday) });
        assert.equal(injected.previousDayComparison, 4, algorithm);
        assert.equal(injected.pollutants, current.pollutants, algorithm);
        assert.equal(injected.metadata, current.metadata, algorithm);
    }
});

test("calculated pairs require a complete identical source+algorithm identity consistent with scale", () => {
    const current = calculatedAQ("AQHI_Multi_CN", 1), yesterday = calculatedAQ("AQHI_Multi_CN", 300);
    assert.equal(current.scale, "CA.AQHI");
    for (const provider of ["Calculate", "Calculate:", "Calculate::AQHI_Multi_CN", "Calculate:QWeather",
        "Calculate:QWeather:None", "Calculate:QWeather:unknown", "Calculate:QWeather:HK_AQHI",
        "Calculate:QWeather:UBA", "Calculate:QWeather:AQHI_Multi_CN:extra", "CalculateBogus"]) {
        assert.equal(computeWK3Comparison(current, yesterday, { currentProvider: provider, yesterdayProvider: provider }), 0, provider);
    }
    const provider = "Calculate:QWeather:AQHI_Multi_CN";
    for (const yesterdayProvider of ["Calculate:ColorfulClouds:AQHI_Multi_CN", "Calculate:QWeather:CA_AQHI",
        "Calculate:QWeather:AQHI_Multi_CN_HK", "QWeather", "Calculate"]) {
        assert.equal(computeWK3Comparison(current, yesterday, { currentProvider: provider, yesterdayProvider }), 0, yesterdayProvider);
    }
    const sameScaleAlgorithms = [
        ["WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT"], ["CN_DEATH_AQHI", "CN_DEATH_HK_AQHI"],
        ["CA_AQHI", "AQHI_Multi_CN"], ["AQHI_Multi_CN", "AQHI_Multi_CN_HK"],
    ];
    for (const [todayAlgorithm, yesterdayAlgorithm] of sameScaleAlgorithms) {
        assert.equal(computeWK3Comparison(calculatedAQ(todayAlgorithm, 1), calculatedAQ(yesterdayAlgorithm, 300), {
            currentProvider: `Calculate:QWeather:${todayAlgorithm}`, yesterdayProvider: `Calculate:QWeather:${yesterdayAlgorithm}`,
        }), 0, `${todayAlgorithm}/${yesterdayAlgorithm}`);
    }
});

test("Calculate history is never fabricated from ColorfulClouds categories or another source", async () => {
    let calls = 0;
    const sources = {
        colorfulClouds: { YesterdayAirQuality: () => { calls++; throw new Error("category-only source"); } },
        qWeather: { YesterdayAirQuality: () => { calls++; throw new Error("caller must compute history first"); } },
    };
    for (const source of ["QWeather", "ColorfulClouds", "WeatherKit"]) {
        const current = calculatedAQ("UBA", 1);
        const result = await injectWK3Comparison(current, { currentProvider: `Calculate:${source}:UBA`, sources, locationInfo: { id: "synthetic" } });
        assert.equal(result.previousDayComparison, 0, source);
        assert.equal(result.index, current.index, source);
    }
    assert.equal(calls, 0);
    const current = calculatedAQ("UBA", 1), categoryOnly = { ...aq(), pollutants: [], index: undefined };
    assert.equal((await injectWK3Comparison(current, {
        currentProvider: "Calculate:ColorfulClouds:UBA", yesterday: categoryOnly,
    })).previousDayComparison, 0);
});

test("all algorithm scale collisions still reject cross-standard history and inconsistent calculated indices", () => {
    for (const algorithm of algorithms) {
        const current = calculatedAQ(algorithm, 1), previous = calculatedAQ(algorithm, 300);
        const provider = `Calculate:QWeather:${algorithm}`, options = { currentProvider: provider, yesterdayProvider: provider };
        const different = { ...previous, scale: current.scale === "CA.AQHI" ? "HK.AQHI" : "CA.AQHI" };
        assert.equal(computeWK3Comparison(current, different, options), 0, algorithm);
        assert.equal(computeWK3Comparison(current, { ...previous, index: 0 }, options), 0, algorithm);
    }
    const current = { ...aq(6), index: 700 }, previous = { ...aq(6), index: 900 };
    const provider = "Calculate:QWeather:WAQI_InstantCast_US";
    assert.equal(computeWK3Comparison(current, previous, { currentProvider: provider, yesterdayProvider: provider }), 3);
    assert.equal(computeWK3Comparison(current, previous, us), 0);
});

test("every pair of distinct menu standards refuses same-source category comparison", () => {
    for (const todayName of menuStandards) {
        for (const yesterdayName of menuStandards) {
            if (todayName === yesterdayName) continue;
            const today = { ...aq(2, `${todayName}.2604`), index: undefined };
            const yesterday = { ...aq(2, `${yesterdayName}.2604`), index: undefined };
            assert.equal(computeWK3Comparison(today, yesterday, weatherKit), 0, `${todayName}/${yesterdayName}`);
        }
    }
});

test("calculated over-range injection preserves index and consumes failed skipped prefetch", async () => {
    const current = { ...aq(6), index: 700 }, provider = "Calculate:QWeather:WAQI_InstantCast_US";
    const result = await injectWK3Comparison(current, { currentProvider: provider, yesterday: { ...current, index: 900 } });
    assert.equal(result.previousDayComparison, 3);
    assert.equal(result.index, 700);
    assert.equal(current.previousDayComparison, 2);
    const mismatch = await injectWK3Comparison(current, {
        currentProvider: provider, yesterdayProvider: "Calculate:ColorfulClouds:WAQI_InstantCast_US",
        yesterday: Promise.reject(new Error("already dispatched calculated history")),
    });
    assert.equal(mismatch.previousDayComparison, 0);
    await new Promise(resolve => setImmediate(resolve));
});
