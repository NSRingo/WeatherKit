// Synthetic fixtures. Review cases tracked in NSRingo/WeatherKit #107 and #110.
// Unknown-container and output-size cases reference #110 at f4676feae89a27a8403c574c6086a433d5adb3c9 (hhh2210, Apache-2.0).
import assert from "node:assert/strict";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { Storage: "Argument", LogLevel: "OFF" };
const [{ Response }, { Response: ResponseDev }, { default: QWeather }, { default: ColorfulClouds }, { default: WeatherKit2 }, json, { Console }] = await Promise.all([
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/class/ColorfulClouds.mjs"),
    import("../src/class/WeatherKit2.mjs"),
    import("../src/process/ResponseJSONV3.mjs"),
    import("@nsnanocat/util"),
]);
Console.logLevel = "OFF";
const metadata = { temporarilyUnavailable: false, providerName: "Apple fixture" };
const request = (products = "weatherAlerts", version = "v3") => (globalThis.$request = { method: "GET", url: `https://weatherkit.apple.com/api/${version}/weather/en-US/31.2/121.5?country=CN&dataSets=${products}`, headers: {} });
const response = body => ({ status: 200, headers: { "Content-Type": "application/json", ETag: "apple-entity" }, body: JSON.stringify(body) });
const settings = () => (globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: "weatherAlerts,currentWeather,airQuality", Weather: { Provider: "QWeather", Replace: ["CN"] }, WeatherAlerts: { Provider: "QWeather" } });
const activeWarning = { description: "暴雨橙色预警", phenomenon: "Rain", severity: "severe", expireTime: "2099-01-01T00:00:00Z" };
const { default: AirQuality } = await import("../src/class/AirQuality.mjs");

for (const invalid of [true, false, 1.2, "1.5", {}, [], [2], null, undefined, "", 0, -1, Infinity, NaN])
    test(`AQ comparison rejects a malformed category: ${String(invalid)} (${typeof invalid})`, () => {
        assert.equal(AirQuality.CompareCategoryIndexes(invalid, 2), AirQuality.Config.CompareCategoryIndexes.UNKNOWN);
        assert.equal(AirQuality.CompareCategoryIndexes(2, invalid), AirQuality.Config.CompareCategoryIndexes.UNKNOWN);
    });
test("AQ comparison keeps numeric strings and valid integer category semantics", () => {
    assert.equal(AirQuality.CompareCategoryIndexes("2", 2), AirQuality.Config.CompareCategoryIndexes.SAME);
    assert.equal(AirQuality.CompareCategoryIndexes(1, 2), AirQuality.Config.CompareCategoryIndexes.BETTER);
    assert.equal(AirQuality.CompareCategoryIndexes(2, 1), AirQuality.Config.CompareCategoryIndexes.WORSE);
});

test("malformed JSON category objects are rejected before coercion or diagnostic formatting", () => {
    const invalid = JSON.parse('{"toString":null,"valueOf":null}');
    assert.equal(AirQuality.CompareCategoryIndexes(invalid, 2), AirQuality.Config.CompareCategoryIndexes.UNKNOWN);
});

for (const [label, process] of [
    ["release", Response],
    ["development", ResponseDev],
]) {
    for (const sourceAlerts of [[activeWarning], [], [{ ...activeWarning, expireTime: "2000-01-01T00:00:00Z" }]])
        test(`${label}: an unavailable empty Apple alert collection stays unavailable when no native warning can be merged (${sourceAlerts.length}, ${sourceAlerts[0]?.expireTime ?? "none"})`, async t => {
            settings();
            t.mock.method(QWeather.prototype, "WeatherAlert", async () => ({ metadata: { temporarilyUnavailable: false, providerName: "provider" }, alerts: sourceAlerts, detailsUrl: "https://fixture.example/alert" }));
            const body = { weatherAlerts: { metadata: { ...metadata, temporarilyUnavailable: true }, alerts: [], detailsUrl: "https://weatherkit.apple.com/original" } };
            const original = response(body);
            const output = await process(request(), original);
            assert.equal(output.body, original.body);
            assert.equal(output.headers.ETag, "apple-entity");
            assert.deepEqual(JSON.parse(output.body).weatherAlerts, body.weatherAlerts);
        });

    test(`${label}: a failed alert source keeps Apple's unavailable state and exact entity`, async t => {
        settings();
        t.mock.method(QWeather.prototype, "WeatherAlert", async () => ({ metadata: { temporarilyUnavailable: true }, alerts: [] }));
        const original = response({ weatherAlerts: { metadata: { ...metadata, temporarilyUnavailable: true }, alerts: [] } });
        assert.equal((await process(request(), original)).body, original.body);
    });

    test(`${label}: healthy no-warning data stays byte-identical when a source also reports no warnings`, async t => {
        settings();
        const fetch = t.mock.method(QWeather.prototype, "WeatherAlert", async () => ({ metadata: { temporarilyUnavailable: false, providerName: "provider" }, alerts: [] }));
        const original = response({ weatherAlerts: { metadata: { ...metadata, providerName: "National Early Warning Center" }, alerts: [] } });
        assert.equal((await process(request(), original)).body, original.body);
        assert.equal(fetch.mock.callCount(), 1);
    });

    test(`${label}: an actual warning merge can restore availability without replacing the native ID`, async t => {
        settings();
        t.mock.method(QWeather.prototype, "WeatherAlert", async () => ({ metadata: { temporarilyUnavailable: false, providerName: "provider", providerLogo: "https://fixture.example/logo.png" }, alerts: [activeWarning] }));
        const warning = { id: "00112233-4455-6677-8899-aabbccddeeff", description: "暴雨橙色预警", phenomenon: "Rain", severity: "severe", message: "" };
        const original = response({ weatherAlerts: { metadata: { ...metadata, temporarilyUnavailable: true }, alerts: [warning] } });
        const output = JSON.parse((await process(request(), original)).body).weatherAlerts;
        assert.equal(output.metadata.temporarilyUnavailable, false);
        assert.equal(output.alerts[0].id, warning.id);
        assert.equal(output.metadata.providerLogo, "https://fixture.example/logo.png");
    });

    test(`${label}: WK2 empty unavailable alerts retain original binary bytes`, async t => {
        settings();
        t.mock.method(QWeather.prototype, "WeatherAlert", async () => ({ metadata: { temporarilyUnavailable: false }, alerts: [activeWarning] }));
        const raw = WeatherKit2.encode(undefined, { weatherAlerts: { metadata: { ...metadata, temporarilyUnavailable: true }, alerts: [] } });
        const original = { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer", ETag: "apple-binary" }, body: raw };
        const output = await process(request("weatherAlerts", "v2"), original);
        assert.deepEqual(output.body, raw);
        assert.equal(WeatherKit2.decode(new ByteBuffer(output.body), ["weatherAlerts"]).weatherAlerts.metadata.temporarilyUnavailable, true);
        assert.equal(output.headers.ETag, "apple-binary");
    });

    test(`${label}: EAQI omits unsupported CO sub-indices without losing the normalized concentration`, async () => {
        settings();
        globalThis.$argument.DataSets = "airQuality";
        globalThis.$argument.AirQuality = { Calculate: { Algorithm: "EU_EAQI" }, Comparison: { ReplaceWhenCurrentChange: false } };
        const pollutants = [["PM10", 40], ["NO2", 57], ["CO", 0.6], ["OZONE", 46], ["PM2_5", 26], ["SO2", 9]].map(([pollutantType, amount]) => ({ pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER" }));
        const original = response({ airQuality: { metadata: { ...metadata, providerName: "QWeather" }, index: 40, categoryIndex: 1, scale: "HJ6332012.2604", pollutants } });
        const output = JSON.parse((await process(request("airQuality"), original)).body).airQuality;
        assert.match(output.scale, /^EU\.EAQI/);
        const co = output.pollutants.find(p => p.pollutantType === "CO");
        assert.equal(co.amount, 600);
        assert.equal(co.index, undefined);
        assert.equal(co.categoryIndex, undefined);
    });
}

const future = () => ({ conditionCode: ["FUTURE"], precipitationAmount: { expected: 8 }, index: "opaque", humidity: 101, metadata: { latitude: "opaque" }, hours: [{ conditionCode: ["ALSO_FUTURE"] }], values: [null] });
test("Apple unknown nested containers keep their original types while known rest-of-day and periodic rows adapt", () => {
    const unknown = future();
    const value = { days: [{ restOfDayForecast: { conditionCode: ["RAIN"], precipitationAmountByType: [{ expected: 3, precipitationType: ["RAIN"] }] }, future: structuredClone(unknown) }], future: structuredClone(unknown) };
    json.adaptV3ClientProduct(value, "forecastDaily");
    assert.equal(value.days[0].restOfDayForecast.conditionCode, "RAIN");
    assert.equal(value.days[0].restOfDayForecast.precipitationAmount, 3);
    assert.deepEqual(value.future, unknown);
    assert.deepEqual(value.days[0].future, unknown);
});

test("provider adaptation and validation preserve opaque nested containers", () => {
    const unknown = future();
    const value = { metadata: { ...metadata }, temperature: 23, conditionCode: ["RAIN"], future: structuredClone(unknown), futureNull: null };
    json.adaptV3ProviderProduct(value, "currentWeather");
    assert.equal(value.conditionCode, "RAIN");
    assert.doesNotThrow(() => json.validateWeatherJSONV3(value, "currentWeather"));
    assert.deepEqual(value.future, unknown);
    assert.equal(value.futureNull, null);
});

test("a provider result exceeding the final output limit falls back to normalized Apple JSON", async () => {
    settings();
    const apple = { currentWeather: { metadata, temperature: 18, conditionCode: ["CLOUDY"] }, forecastPeriodic: { metadata, forecasts: [{ periods: [{ conditionCode: ["RAIN"] }] }] } };
    const output = await json.default(request("currentWeather"), response(apple), { currentWeather: async () => ({ metadata, temperature: 23, conditionCode: "RAIN", future: "x".repeat(json.MAX_WEATHER_JSON_CHARACTERS) }) });
    const actual = JSON.parse(output.body);
    assert.equal(actual.currentWeather.temperature, 18);
    assert.equal(actual.currentWeather.conditionCode, "CLOUDY");
    assert.equal(actual.forecastPeriodic.forecasts[0].periods[0].conditionCode, "RAIN");
    assert.equal(output.headers.ETag, undefined);
});

test("periodic-only responses normalize without querying a provider", async () => {
    settings();
    const value = { forecastPeriodic: { metadata, forecasts: [{ periods: [{ conditionCode: ["RAIN"], precipitationAmountByType: [{ expected: 2, precipitationType: ["RAIN"] }] }] }] } };
    const result = JSON.parse((await json.default(request("forecastPeriodic"), response(value), { currentWeather: () => assert.fail("No replacement target") })).body);
    assert.equal(result.forecastPeriodic.forecasts[0].periods[0].precipitationAmount, 2);
});

test("Caiyun concurrent current weather cannot supply alerts after the alert-specific request fails", async () => {
    const pending = [];
    globalThis.$httpClient = { get: (outgoing, callback) => pending.push({ outgoing, callback }) };
    const provider = new ColorfulClouds({ country: "CN", latitude: 31.2, longitude: 121.5, language: "en" }, "fixture");
    const current = provider.CurrentWeather();
    const alerts = provider.WeatherAlert();
    assert.equal(pending.length, 2);
    const body = {
        status: "ok",
        server_time: 1800000000,
        result: {
            alert: { status: "ok", content: [{ code: "0202", title: "fixture rain", pubtimestamp: 1800000000 }] },
            realtime: { status: "ok", temperature: 23, apparent_temperature: 24, cloudrate: 0.8, skycon: "CLOUDY", humidity: 0.5, precipitation: { local: { intensity: 0 } }, pressure: 100000, visibility: 10, wind: { direction: 90, speed: 2 } },
        },
    };
    pending[0].callback(null, { status: 200, headers: {} }, JSON.stringify(body));
    pending[1].callback("timeout", {}, "");
    assert.equal((await current).cloudCover, 80);
    const result = await alerts;
    assert.equal(result.metadata.temporarilyUnavailable, true);
    assert.deepEqual(result.alerts, []);
});
