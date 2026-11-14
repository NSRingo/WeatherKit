import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { readLoonRules } from "../scripts/verify-loon-rewrites.mjs";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$httpClient = {
    get: () => {
        throw new Error("Unexpected real provider request");
    },
};
const [{ Response }, { Response: ResponseDev }, { default: AirQuality }, { default: ColorfulClouds }, { default: QWeather }, { default: database }, { qs }] = await Promise.all([
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/class/AirQuality.mjs"),
    import("../src/class/ColorfulClouds.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/function/database.mjs"),
    import("@nsnanocat/util/polyfill/qs.mjs"),
]);
const baseline = JSON.parse(await readFile(new URL("./fixtures/upstream-intent.json", import.meta.url)));
const metadata = () => ({ providerName: "Apple fixture", temporarilyUnavailable: false });
const pollutants = () =>
    [
        ["PM2_5", 35],
        ["PM10", 60],
        ["OZONE", 90],
        ["NO2", 35],
        ["SO2", 15],
        ["CO", 700],
    ].map(([pollutantType, amount]) => ({ pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER" }));
const product = () => ({ metadata: metadata(), index: 42, categoryIndex: 1, scale: "EPA_NowCast", previousDayComparison: "SIMILAR", pollutants: pollutants() });
const settings = values => (globalThis.$argument = qs.parse({ Storage: "Argument", LogLevel: "OFF", DataSets: "airQuality", "AirQuality.Calculate.Algorithm": "CA_AQHI", ...values }));
const request = { url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.2/121.5?country=CN&dataSets=airQuality", method: "GET" };
async function processAQ(processResponse, value) {
    const result = await processResponse(request, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ airQuality: value }) });
    return JSON.parse(result.body).airQuality;
}

test("original defaults keep target selection, source selection and comparison controls", () => {
    const s = database.WeatherKit.Settings;
    assert.deepEqual(s.Weather, baseline.weather);
    assert.deepEqual(s.AirQuality.Current.Index, baseline.airQualityIndex);
    assert.deepEqual(s.AirQuality.Comparison, baseline.airQualityComparison);
    assert.equal(s.NextHour.Provider, baseline.originalArgumentDefaults["NextHour.Provider"]);
    assert.equal(s.WeatherAlerts.Provider, baseline.originalArgumentDefaults["WeatherAlerts.Provider"]);
    for (const key of ["RequestCache", "Region", "ProviderFallback"]) assert.equal(Object.hasOwn(s, key), false);
});

test("native availability unlocks the same original capability set and preserves new Apple features", async () => {
    const rules = readLoonRules(await readFile(new URL("../template/loon.handlebars", import.meta.url), "utf8"));
    for (const apple of [[], ["weatherMaps", "currentWeather", "futureCapability", "currentWeather"]]) {
        assert.deepEqual(rules.mergeAvailability(apple), [...new Set([...apple, ...baseline.capabilities])]);
    }
});

for (const [name, processResponse] of [
    ["release", Response],
    ["development", ResponseDev],
]) {
    test(`${name}: selecting an algorithm does not override the original default target list`, async t => {
        settings({});
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", () => {
            throw new Error("No missing pollutants");
        });
        const value = await processAQ(processResponse, product());
        assert.equal(value.index, 42);
        assert.equal(value.scale, "EPA_NowCast");
        assert.equal(value.previousDayComparison, "SIMILAR");
        assert.doesNotMatch(value.metadata.providerName, /指数：/);
    });

    test(`${name}: an explicit replacement target applies the selected algorithm`, async () => {
        settings({ "AirQuality.Current.Index.Replace": "EPA_NowCast" });
        const value = await processAQ(processResponse, product());
        assert.equal(value.scale, "CA.AQHI");
        assert.equal(value.previousDayComparison, "SIMILAR");
        assert.match(value.metadata.providerName, /指数：iRingo/);
    });

    test(`${name}: partial pollutant completion respects an empty or nonmatching target list`, async t => {
        let calls = 0;
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => {
            calls++;
            return { metadata: { providerName: "Supplement", temporarilyUnavailable: false }, index: 199, categoryIndex: 4, scale: "HJ6332012", pollutants: pollutants() };
        });
        for (const target of [[], ["HJ6332012"]]) {
            settings({ "AirQuality.Current.Index.Replace": target });
            const input = product();
            input.pollutants = input.pollutants.slice(0, 1);
            const value = await processAQ(processResponse, input);
            assert.equal(value.pollutants.length, 6);
            assert.equal(value.index, 42);
            assert.equal(value.scale, "EPA_NowCast");
            assert.equal(value.previousDayComparison, "SIMILAR");
            assert.match(value.metadata.providerName, /污染物：Supplement/);
            assert.doesNotMatch(value.metadata.providerName, /指数：/);
        }
        assert.equal(calls, 2);
    });

    test(`${name}: None preserves the Apple index after a valid pollutant supplement`, async t => {
        settings({ "AirQuality.Current.Index.Replace": "EPA_NowCast", "AirQuality.Calculate.Algorithm": "None", "AirQuality.Comparison.ReplaceWhenCurrentChange": true });
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => ({ metadata: { providerName: "Supplement", temporarilyUnavailable: false }, pollutants: pollutants() }));
        const input = product();
        input.pollutants = input.pollutants.slice(0, 1);
        const value = await processAQ(processResponse, input);
        assert.equal(value.index, 42);
        assert.equal(value.scale, "EPA_NowCast");
        assert.equal(value.previousDayComparison, "SIMILAR");
        assert.equal(value.pollutants.length, 6);
    });

    test(`${name}: the original comparison switch keeps an existing trend without extra queries`, async t => {
        settings({ "AirQuality.Current.Index.Replace": "EPA_NowCast", "AirQuality.Comparison.ReplaceWhenCurrentChange": false });
        t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", () => {
            throw new Error("An existing comparison must be kept");
        });
        const value = await processAQ(processResponse, product());
        assert.equal(value.scale, "CA.AQHI");
        assert.equal(value.previousDayComparison, "SIMILAR");
        assert.doesNotMatch(value.metadata.providerName, /对比昨日/);
    });

    test(`${name}: explicit comparison replacement honors the selected independent source`, async t => {
        settings({ "AirQuality.Current.Index.Replace": "EPA_NowCast", "AirQuality.Comparison.ReplaceWhenCurrentChange": true, "AirQuality.Comparison.Yesterday.IndexProvider": "ColorfulCloudsUS" });
        let currentCalls = 0,
            yesterdayCalls = 0;
        t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", async usa => {
            assert.equal(usa, true);
            yesterdayCalls++;
            return { metadata: { providerName: "Yesterday fixture", temporarilyUnavailable: false }, index: 199, categoryIndex: 4, scale: "EPA_NowCast" };
        });
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async usa => {
            assert.equal(usa, true);
            currentCalls++;
            return { metadata: { providerName: "Current fixture", temporarilyUnavailable: false }, index: 20, categoryIndex: 1, scale: "EPA_NowCast" };
        });
        const value = await processAQ(processResponse, product());
        assert.equal(currentCalls, 1);
        assert.equal(yesterdayCalls, 1);
        assert.equal(value.previousDayComparison, AirQuality.CompareCategoryIndexes(1, 4));
        assert.match(value.metadata.providerName, /对比昨日/);
    });

    test(`${name}: a failed index source does not discard a successful pollutant supplement`, async t => {
        settings({ "AirQuality.Current.Index.Replace": "EPA_NowCast", "AirQuality.Current.Index.Provider": "QWeather" });
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => ({ metadata: { providerName: "Supplement", temporarilyUnavailable: false }, pollutants: pollutants() }));
        t.mock.method(QWeather.prototype, "CurrentAirQuality", async () => {
            throw new Error("Fixture failure");
        });
        const input = product();
        input.pollutants = input.pollutants.slice(0, 1);
        const value = await processAQ(processResponse, input);
        assert.equal(value.pollutants.length, 6);
        assert.equal(value.index, 42);
        assert.equal(value.scale, "EPA_NowCast");
    });
}
