import assert from "node:assert/strict";
import test from "node:test";

const { default: AirQuality } = await import("../../src/wk3/class/AirQuality.mjs");

const pollutants = [
    { pollutantType: "PM2_5", amount: 25, units: "MICROGRAMS_PER_CUBIC_METER" },
    { pollutantType: "PM10", amount: 50, units: "MICROGRAMS_PER_CUBIC_METER" },
    { pollutantType: "OZONE", amount: 100, units: "MICROGRAMS_PER_CUBIC_METER" },
    { pollutantType: "NO2", amount: 25, units: "MICROGRAMS_PER_CUBIC_METER" },
    { pollutantType: "SO2", amount: 40, units: "MICROGRAMS_PER_CUBIC_METER" },
];
const input = { metadata: { providerName: "test" }, pollutants };
const algorithms = [
    "None", "UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN",
    "WAQI_InstantCast_CN_25_DRAFT", "CA_AQHI", "HK_AQHI", "AQHI_Multi_CN",
    "AQHI_Multi_CN_HK", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI",
];

test("WK3 exposes all twelve upstream AQ algorithms without silent UBA fallback", () => {
    for (const algorithm of algorithms) {
        if (algorithm === "None") {
            assert.equal(AirQuality.Pollutants2AQI(input, {}, { algorithm }), input);
            continue;
        }
        assert.ok(AirQuality.Config.Scales[algorithm], `missing scale: ${algorithm}`);
        const result = AirQuality.Pollutants2AQI(input, {}, { algorithm });
        assert.equal(result.metadata?.temporarilyUnavailable, false, algorithm);
        assert.ok(Number.isFinite(result.index), `${algorithm}: index`);
        assert.ok(Number.isFinite(result.categoryIndex), `${algorithm}: categoryIndex`);
        assert.equal(result.scale, AirQuality.ToWeatherKitScale(AirQuality.Config.Scales[algorithm].weatherKitScale), `${algorithm}: scale`);
    }
});

test("AQHI algorithms use their distinct upstream risk/index calculation", () => {
    const expected = {
        HK_AQHI: ["HK.AQHI", 5],
        CA_AQHI: ["CA.AQHI", 9],
        CN_DEATH_AQHI: ["CN.AQHI", 4],
        CN_DEATH_HK_AQHI: ["CN.AQHI", 5],
        AQHI_Multi_CN: ["CA.AQHI", 4],
        AQHI_Multi_CN_HK: ["CA.AQHI", 4],
    };
    for (const [algorithm, [scale, categoryIndex]] of Object.entries(expected)) {
        const result = AirQuality.Pollutants2AQI(input, {}, { algorithm });
        assert.equal(result.scale, scale, algorithm);
        assert.equal(result.categoryIndex, categoryIndex, algorithm);
        assert.equal(result.index, categoryIndex, `${algorithm}: AQHI index mirrors category`);
    }
});

test("unknown algorithm behavior remains the existing UBA fallback", () => {
    const expected = AirQuality.Pollutants2AQI(input, {}, { algorithm: "UBA" });
    const actual = AirQuality.Pollutants2AQI(input, {}, { algorithm: "not-a-supported-algorithm" });
    assert.equal(actual.index, expected.index);
    assert.equal(actual.categoryIndex, expected.categoryIndex);
    assert.equal(actual.scale, expected.scale);
});
