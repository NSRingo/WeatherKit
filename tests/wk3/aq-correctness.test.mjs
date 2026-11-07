import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import AirQualityWK3 from "../../src/wk3/class/AirQuality.mjs";

// Exercise the legacy implementation without installing its runtime logger dependency.
// Only imports are redirected; all algorithm code and configuration remain unchanged.
const legacyURL = new URL("../../src/class/AirQuality.mjs", import.meta.url);
const legacySource = (await readFile(legacyURL, "utf8"))
    .replace('"@nsnanocat/util"', JSON.stringify(new URL("../../src/wk3/utils/index.mjs", import.meta.url).href))
    .replace('"./SimplePrecisionMath.mjs"', JSON.stringify(new URL("../../src/class/SimplePrecisionMath.mjs", import.meta.url).href));
const { default: AirQualityLegacy } = await import(`data:text/javascript;base64,${Buffer.from(legacySource).toString("base64")}`);
const ug = "MICROGRAMS_PER_CUBIC_METER", mg = "MILLIGRAMS_PER_CUBIC_METER";
const ppb = "PARTS_PER_BILLION", ppm = "PARTS_PER_MILLION";
const p = (pollutantType, amount, units = ug) => ({ pollutantType, amount, units });
const sample = () => [p("PM2_5", 25), p("PM10", 50), p("OZONE", 100), p("NO2", 25), p("SO2", 40), p("CO", 700)];
const input = pollutants => ({ metadata: { providerName: "test" }, pollutants });
const freezeInput = pollutants => {
    const value = input(pollutants.map(Object.freeze));
    Object.freeze(value.pollutants);
    Object.freeze(value.metadata);
    return Object.freeze(value);
};
for (const [entry, AQ] of [["wk3", AirQualityWK3], ["legacy", AirQualityLegacy]]) {
    const calc = (pollutants, algorithm = "WAQI_InstantCast_US", options = {}) => AQ.Pollutants2AQI(input(pollutants), {}, { algorithm, ...options });
    test(`${entry}: US concentration truncation affects index only, including decimal boundaries`, () => {
        // Fixed boundary expectations from the configured InstantCast breakpoints.
        for (const [type, amount, units, expected] of [
            ["PM2_5", 9.09, ug, 50], ["PM2_5", 9.1, ug, 51],
            ["PM2_5", 35.49, ug, 100], ["PM2_5", 35.5, ug, 101],
            ["PM10", 54.99, ug, 50], ["PM10", 55, ug, 51],
            ["OZONE", 62.59, ppb, 50], ["OZONE", 62.6, ppb, 51],
            ["SO2", 35.99, ppb, 50], ["SO2", 36, ppb, 51],
            ["NO2", 53.99, ppb, 50], ["NO2", 54, ppb, 51],
            ["CO", 4499, ppb, 50],
        ]) {
            const result = calc([p(type, amount, units)]);
            assert.equal(result.index, expected, `${type} ${amount}`);
            assert.equal(result.pollutants[0].amount, amount, "physical concentration must not be truncated");
        }
    });
    test(`${entry}: identical mixing-ratio units do not depend on STP factors`, () => {
        assert.equal(AQ.ConvertUnit(53, ppb, ppb, 1.88, -1), 53);
        assert.equal(AQ.ConvertUnit(53, ppb, ppb, 1.88, 1.91), 53);
        assert.equal(AQ.ConvertUnit(0.053, ppm, ppb, 1.88, 1.91), 53);
        assert.equal(AQ.ConvertUnit(53, ppb, ppm, -1, 1.91), 0.053);
        for (const amount of [NaN, Infinity, -1, null, undefined, ""]) assert.equal(AQ.ConvertUnit(amount, ug, ug), -1);
    });
    test(`${entry}: PM10 over-range extrapolation is continuous at 604/605`, () => {
        assert.equal(calc([p("PM10", 604)], undefined, { allowOverRange: true }).index, 500);
        assert.equal(calc([p("PM10", 605)], undefined, { allowOverRange: true }).index, 501);
        assert.equal(calc([p("PM10", 605)], undefined, { allowOverRange: false }).index, 500);
    });
    test(`${entry}: CN25 zero concentration is valid category 1`, () => {
        const result = calc(sample().map(x => ({ ...x, amount: 0 })), "WAQI_InstantCast_CN_25_DRAFT");
        assert.equal(result.index, 0);
        assert.equal(result.categoryIndex, 1);
        assert.equal(result.metadata.temporarilyUnavailable, false);
        assert.equal(result.primaryPollutant, "NOT_AVAILABLE");
    });
    test(`${entry}: Canadian AQHI ppb/mass equivalents use all required model inputs`, () => {
        const gases = [p("NO2", 20, ppb), p("OZONE", 40, ppb), p("PM2_5", 10)];
        const mass = [p("NO2", 37.60945396612444), p("OZONE", 78.4758596679524), p("PM2_5", 10)];
        // (1000/10.4) * (expm1(.000871*20)+expm1(.000537*40)+expm1(.000487*10)) = 4.2468121822.
        for (const pollutants of [gases, mass]) {
            const result = calc(pollutants, "CA_AQHI");
            assert.equal(result.index, 4);
            assert.equal(result.categoryIndex, 4);
            assert.equal(result.metadata.temporarilyUnavailable, false);
        }
    });
    test(`${entry}: Canadian AQHI rounds rather than ceiling, minimum 1 and maximum 10+`, () => {
        // Only NO2 is nonzero; these fixed concentrations yield 2.49, 2.51, and 11.2 before rounding.
        for (const [amount, expected] of [[0, 1], [29.352901364443454, 2], [29.58565572211123, 3], [126.49928704508866, 11]]) {
            const result = calc([p("NO2", amount, ppb), p("OZONE", 0, ppb), p("PM2_5", 0)], "CA_AQHI");
            assert.equal(result.index, expected, String(amount));
        }
    });
    test(`${entry}: AQHI missing required gas or particle inputs is unavailable`, () => {
        for (const algorithm of ["CA_AQHI", "HK_AQHI", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK"]) {
            for (const absent of [["NO2"], ["OZONE"], ["PM10", "PM2_5"]]) {
                const result = calc(sample().filter(x => !absent.includes(x.pollutantType)), algorithm);
                assert.equal(result.metadata.temporarilyUnavailable, true, `${algorithm} absent ${absent}`);
            }
            // A PM10 alternative is valid only when the model defines its coefficient.
            const pm10Only = calc(sample().filter(x => x.pollutantType !== "PM2_5"), algorithm);
            assert.equal(pm10Only.metadata.temporarilyUnavailable, !["HK_AQHI", "CN_DEATH_HK_AQHI", "AQHI_Multi_CN_HK"].includes(algorithm), algorithm);
            const invalid = sample().map(x => x.pollutantType === "NO2" ? { ...x, amount: NaN } : x);
            assert.equal(calc(invalid, algorithm).metadata.temporarilyUnavailable, true, `${algorithm} invalid gas`);
        }
    });
    test(`${entry}: QWeather CO conversion is unit-driven, immutable and idempotent`, () => {
        for (const providerName of ["QWeather", "和风天气"]) {
            const original = Object.freeze({ metadata: Object.freeze({ providerName }), pollutants: Object.freeze([Object.freeze(p("CO", 0.7, mg)), Object.freeze(p("PM10", 20))]) });
            const fixed = AQ.FixPollutantsUnits(original);
            assert.deepEqual(fixed.pollutants[0], p("CO", 700));
            assert.deepEqual(AQ.FixPollutantsUnits(fixed), fixed);
            assert.deepEqual(original.pollutants[0], p("CO", 0.7, mg));
            const normalized = { metadata: { providerName }, pollutants: [p("CO", 700)] };
            assert.deepEqual(AQ.FixPollutantsUnits(normalized), normalized);
        }
    });
    test(`${entry}: invalid category comparisons are UNKNOWN`, () => {
        for (const invalid of [-1, 0, null, undefined, NaN, Infinity, "", "bad", true, 1.5]) {
            assert.equal(AQ.CompareCategoryIndexes(invalid, 2), "UNKNOWN", String(invalid));
            assert.equal(AQ.CompareCategoryIndexes(2, invalid), "UNKNOWN", String(invalid));
        }
        assert.equal(AQ.CompareCategoryIndexes("2", 2), "SAME");
        assert.equal(AQ.CompareCategoryIndexes(1, 2), "BETTER");
        assert.equal(AQ.CompareCategoryIndexes(3, 2), "WORSE");
    });
    test(`${entry}: empty Units.Replace retains physical source units even with calculated index`, () => {
        const original = { ...input(sample()), scale: "EPA_NowCast" };
        const injectedIndex = { ...input([p("CO", 600, ppb)]), index: 10, scale: "EPA_NowCast", pollutants: [{ ...p("CO", 600, ppb), index: 10 }] };
        const settings = { AirQuality: { Current: { Index: { Provider: "Calculate" }, Pollutants: { Units: { Mode: "Scale", Replace: [] } } } } };
        assert.deepEqual(AQ.ConvertPollutants(original, undefined, true, injectedIndex, settings), original.pollutants);
        settings.AirQuality.Current.Pollutants.Units.Replace = ["EPA_NowCast"];
        assert.deepEqual(AQ.ConvertPollutants(original, undefined, true, injectedIndex, settings), injectedIndex.pollutants);
        settings.AirQuality.Current.Index.Provider = "WeatherKit";
        assert.doesNotThrow(() => AQ.ConvertPollutants(original, undefined, false, undefined, settings));
    });
    test(`${entry}: explicit CA.AQHI replacement handles versionless scale; unknown CN scale is safe`, () => {
        const settings = { AirQuality: { Current: { Pollutants: { Units: { Mode: "Scale", Replace: ["CA.AQHI"] } } } } };
        const original = { ...input([p("NO2", 18.80472698306222), p("OZONE", 19.6189649169881), p("PM2_5", 10)]), scale: "CA.AQHI" };
        const result = AQ.ConvertPollutants(original, undefined, false, undefined, settings);
        assert.deepEqual(result.map(x => x.units), [ppb, ppb, ug]);
        assert.ok(Math.abs(result[0].amount - 10) < 1e-10);
        assert.equal(original.pollutants[0].units, ug);
        settings.AirQuality.Current.Pollutants.Units.Replace = ["CN.AQHI"];
        assert.doesNotThrow(() => AQ.ConvertPollutants({ ...original, scale: "CN.AQHI" }, undefined, false, undefined, settings));
    });
    test(`${entry}: unknown algorithms fail closed and None remains identity`, () => {
        const original = freezeInput(sample());
        for (const algorithm of ["unsupported", "toString", "constructor", "__proto__"]) {
            const result = AQ.Pollutants2AQI(original, {}, { algorithm });
            assert.equal(result.metadata.temporarilyUnavailable, true, algorithm);
            assert.notEqual(result.scale, "UBA");
            assert.deepEqual(result.pollutants, original.pollutants);
        }
        assert.equal(AQ.Pollutants2AQI(original, {}, { algorithm: "None" }), original);
        assert.equal(AQ.Pollutants2AQI(original, {}).scale, AQ.ToWeatherKitScale(AQ.Config.Scales.UBA.weatherKitScale));
        assert.equal(AQ.Pollutants2AQI(input([]), {}, { algorithm: "UBA" }).metadata.temporarilyUnavailable, true);
    });
    test(`${entry}: no supported pollutant index is unavailable, not a negative usable AQI`, () => {
        const raw = freezeInput([p("NOX", 12)]);
        const result = AQ.Pollutants2AQI(raw, {}, { algorithm: "WAQI_InstantCast_US" });
        assert.equal(result.metadata.temporarilyUnavailable, true);
        assert.deepEqual(result.pollutants.map(x => [x.pollutantType, x.amount, x.units]), [["NOX", 12, ug]]);
    });
    test(`${entry}: calculations preserve six physical pollutants and never mutate inputs`, () => {
        for (const algorithm of ["UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT", "CA_AQHI", "HK_AQHI", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK"]) {
            const original = freezeInput(sample());
            const result = AQ.Pollutants2AQI(original, {}, { algorithm });
            assert.equal(result.pollutants.length, 6, algorithm);
            assert.deepEqual(result.pollutants.map(x => x.pollutantType), original.pollutants.map(x => x.pollutantType));
            for (const pollutant of result.pollutants) {
                const source = original.pollutants.find(x => x.pollutantType === pollutant.pollutantType);
                const targetFactor = AQ.Config.Scales[algorithm].pollutants[pollutant.pollutantType]?.stpConversionFactor;
                const expected = pollutant.units === source.units ? source.amount : AQ.ConvertUnit(pollutant.amount, pollutant.units, source.units, targetFactor);
                assert.ok(Math.abs(expected - source.amount) < 1e-8, `${algorithm}: ${pollutant.pollutantType} physical concentration`);
                assert.equal(Object.hasOwn(source, "index"), false);
            }
        }
    });
}
