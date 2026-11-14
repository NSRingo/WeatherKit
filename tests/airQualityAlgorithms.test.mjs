import assert from "node:assert/strict";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };
const [{ default: AQ }, { default: WeatherKit2 }, { Console }] = await Promise.all([import("../src/class/AirQuality.mjs"), import("../src/class/WeatherKit2.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";
const ug = "MICROGRAMS_PER_CUBIC_METER", ppb = "PARTS_PER_BILLION", mg = "MILLIGRAMS_PER_CUBIC_METER";
const algorithms = ["UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT", "CA_AQHI", "HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI"];
const pollutant = (pollutantType, amount, units = ug) => ({ pollutantType, amount, units });
const six = () => [pollutant("PM2_5", 35), pollutant("PM10", 60), pollutant("OZONE", 90), pollutant("NO2", 35), pollutant("SO2", 15), pollutant("CO", 700)];
const compute = (algorithm, pollutants, extra = {}) => AQ.Pollutants2AQI({ metadata: { providerName: "fixture" }, pollutants }, {}, { algorithm, ...extra });

for (const algorithm of algorithms) {
    test(`${algorithm}: all six concentrations survive calculation and WK2 encoding without negative subindexes`, () => {
        const input = six(), original = structuredClone(input);
        const output = compute(algorithm, input);
        assert.equal(output.metadata.temporarilyUnavailable, false);
        assert.equal(Number.isInteger(output.index) && output.index >= 0, true);
        assert.equal(Number.isInteger(output.categoryIndex) && output.categoryIndex > 0, true);
        assert.equal(output.pollutants.length, 6);
        for (const p of output.pollutants) assert.ok(p.index === undefined || Number.isFinite(p.index) && p.index >= 0);
        const decoded = WeatherKit2.decode(new ByteBuffer(WeatherKit2.encode(undefined, { airQuality: output })), ["airQuality"]).airQuality;
        assert.equal(decoded.index, output.index);
        assert.equal(decoded.categoryIndex, output.categoryIndex);
        assert.equal(decoded.scale, output.scale);
        assert.deepEqual(decoded.pollutants.map(p => p.pollutantType), input.map(p => p.pollutantType));
        assert.deepEqual(input, original, "calculation must not mutate Apple/provider objects");
    });
    test(`${algorithm}: clean zero measurements are valid; missing/invalid measurements are unavailable`, () => {
        const zero = compute(algorithm, six().map(p => ({ ...p, amount: 0 })));
        assert.equal(zero.metadata.temporarilyUnavailable, false);
        assert.ok(zero.categoryIndex >= 1);
        for (const amount of [NaN, Infinity, -1, null, undefined, "", "bad"]) {
            const result = compute(algorithm, [pollutant("PM2_5", amount)]);
            assert.equal(result.metadata.temporarilyUnavailable, true, String(amount));
            assert.equal(result.index, undefined);
        }
    });
}

test("US: EPA May 2026 truncation occurs before interpolation without changing the physical concentration", () => {
    for (const [type, amount, units, expected] of [["PM2_5", 9.05, ug, 50], ["PM2_5", 9.1, ug, 51], ["PM10", 54.99, ug, 50], ["NO2", 53.99, ppb, 50], ["SO2", 35.99, ppb, 50], ["CO", 4499, ppb, 50], ["CO", 4500, ppb, 51]]) {
        const result = compute("WAQI_InstantCast_US", [pollutant(type, amount, units)]);
        assert.equal(result.index, expected, type);
        assert.equal(result.pollutants[0].amount, amount);
    }
});

test("CN: exact breakpoint is not promoted by floating point error and SO2's capped branch remains finite", () => {
    assert.equal(compute("WAQI_InstantCast_CN", [pollutant("PM2_5", 35)]).categoryIndex, 1);
    assert.equal(compute("WAQI_InstantCast_CN", [pollutant("PM2_5", 75)]).index, 100);
    assert.equal(compute("WAQI_InstantCast_CN_25_DRAFT", [pollutant("SO2", 900)]).index, 200);
});

test("above-range US interpolation is continuous and respects the optional 500 cap", () => {
    assert.equal(compute("WAQI_InstantCast_US", [pollutant("PM10", 604)]).index, 500);
    assert.equal(compute("WAQI_InstantCast_US", [pollutant("PM10", 605)]).index, 501);
    assert.equal(compute("WAQI_InstantCast_US", [pollutant("PM10", 605)], { allowOverRange: false }).index, 500);
});

test("Canada: ppb and equivalent mass inputs produce the reference rounded AQHI 4", () => {
    const ppbInput = [pollutant("NO2", 20, ppb), pollutant("OZONE", 30, ppb), pollutant("PM2_5", 10)];
    assert.equal(compute("CA_AQHI", ppbInput).index, 4);
    const massInput = [pollutant("NO2", 20 * 1.880472698306222), pollutant("OZONE", 30 * 1.96189649169881), pollutant("PM2_5", 10)];
    assert.equal(compute("CA_AQHI", massInput).index, 4);
    // AQHI rounds 3.49 down, 3.50 up; use PM2.5-only risk with measured zero gases.
    for (const [index, expected] of [[3.49, 3], [3.51, 4]]) {
        const concentration = Math.log1p(index * 10.4 / 1000) / 0.000487;
        assert.equal(compute("CA_AQHI", [pollutant("NO2", 0, ppb), pollutant("OZONE", 0, ppb), pollutant("PM2_5", concentration)]).index, expected);
    }
});

test("HK: official 2025 coefficients and risk bands produce AQHI 5 for this complete concentration set", () => {
    const result = compute("HK_AQHI", six());
    assert.equal(result.index, 5);
    assert.equal(result.primaryPollutant, "OZONE");
});

test("inapplicable CO keeps its concentration but cannot manufacture a healthy EU/UBA/AQHI index", () => {
    for (const algorithm of algorithms.filter(a => !a.startsWith("WAQI_"))) {
        const result = compute(algorithm, [pollutant("CO", 700)]);
        assert.equal(result.metadata.temporarilyUnavailable, true, algorithm);
        assert.equal(result.pollutants[0].amount, 700);
        assert.equal(result.pollutants[0].index, undefined);
    }
});

test("risk algorithms require their actual gas inputs and accept the available configured PM alternative", () => {
    for (const algorithm of algorithms.filter(a => a.includes("AQHI"))) {
        const noOzone = compute(algorithm, six().filter(p => p.pollutantType !== "OZONE"));
        assert.equal(noOzone.metadata.temporarilyUnavailable, true, algorithm);
    }
    assert.equal(compute("HK_AQHI", six().filter(p => p.pollutantType !== "PM2_5")).metadata.temporarilyUnavailable, false);
    assert.equal(compute("CA_AQHI", six().filter(p => p.pollutantType !== "PM2_5")).metadata.temporarilyUnavailable, true);
});

test("sanitizing supplements preserves first valid concentrations and rejects malformed values/units", () => {
    const current = [pollutant("PM2_5", 0), pollutant("NO2", null), pollutant("OZONE", "12.5"), pollutant("SO2", 4, "invalid")];
    const result = AQ.MergePollutants(current, six());
    assert.equal(result.length, 6);
    assert.equal(result.find(p => p.pollutantType === "PM2_5").amount, 0);
    assert.equal(result.find(p => p.pollutantType === "OZONE").amount, 12.5);
    assert.equal(result.find(p => p.pollutantType === "NO2").amount, 35);
    assert.deepEqual(AQ.MissingPollutants(result), []);
    assert.deepEqual(AQ.MissingPollutants([pollutant("PM2_5", 0)]), ["PM10", "OZONE", "NO2", "SO2", "CO"]);
});

test("QWeather CO normalization is unit-aware and idempotent", () => {
    const input = { metadata: { providerName: "QWeather" }, pollutants: [pollutant("CO", 0.7, mg)] };
    const fixed = AQ.FixPollutantsUnits(input);
    assert.equal(fixed.pollutants[0].amount, 700);
    assert.equal(fixed.pollutants[0].units, ug);
    assert.deepEqual(AQ.FixPollutantsUnits(fixed), fixed);
    assert.equal(input.pollutants[0].amount, 0.7);
});

test("raw Apple QWeather CO repairs the mg value mislabeled as ug without reprocessing normalized provider data", () => {
    for (const providerName of ["QWeather", "和风天气"]) {
        const rawApple = { metadata: { providerName }, pollutants: [pollutant("CO", 0.7), null] };
        const normalized = AQ.FixPollutantsUnits(rawApple, { appleProduct: true });
        assert.equal(normalized.pollutants[0].amount, 700);
        assert.equal(normalized.pollutants[0].units, ug);
        assert.equal(rawApple.pollutants[0].amount, 0.7);
        assert.deepEqual(AQ.FixPollutantsUnits(normalized), normalized);
        const provider = { metadata: { providerName }, pollutants: [pollutant("CO", 700)] };
        assert.deepEqual(AQ.FixPollutantsUnits(provider), provider);
    }
    const other = { metadata: { providerName: "BreezoMeter" }, pollutants: [pollutant("CO", 700)] };
    assert.strictEqual(AQ.FixPollutantsUnits(other, { appleProduct: true }), other);
});

test("unit conversion rejects nonfinite values; numeric strings and identity ppb work without artificial STP factors", () => {
    for (const amount of [NaN, Infinity, null, undefined, "", "wrong", -1]) assert.equal(AQ.ConvertUnit(amount, ug, mg), -1);
    assert.equal(AQ.ConvertUnit("700", ug, mg), 0.7);
    assert.equal(AQ.ConvertUnit(30, ppb, ppb, 1.96189649169881), 30);
});

test("None preserves the original product and unknown algorithms fail safely", () => {
    const product = { index: 42, pollutants: six() };
    assert.strictEqual(AQ.Pollutants2AQI(product, {}, { algorithm: "None" }), product);
    assert.equal(compute("typo", six()).metadata.temporarilyUnavailable, true);
});
