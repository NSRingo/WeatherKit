import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "Argument" };

const [{ Response }, { default: WeatherKit3 }, { default: ColorfulClouds }, { default: QWeather }, { FlatBufferRootProcessor }] = await Promise.all([
    import("../src/process/Response.dev.mjs"),
    import("../src/class/WeatherKit3.mjs"),
    import("../src/class/ColorfulClouds.mjs"),
    import("../src/class/QWeather.mjs"),
    import("@nsnanocat/flatbuffer-root"),
]);

const time = 1800000000;
const metadata = { providerName: "Apple", latitude: 22.54, longitude: 114.06, readTime: time, temporarilyUnavailable: false };
const forecast = { forecastStart: time, forecastEnd: time + 3600, conditionCode: "RAIN", precipitationAmount: 6, precipitationType: "RAIN", temperature: 20, retainedField: "keep" };
// Synthetic reader-contract fixture derived from PR #107's documented macOS observations,
// not a capture or proof of native acceptance on this Mac.
function appleBody() {
    return structuredClone({
        currentWeather: { metadata, temperature: 20, conditionCode: "RAIN", humidity: 80, retainedField: "keep" },
        forecastDaily: { metadata, days: [{ ...forecast, daytimeForecast: forecast, overnightForecast: forecast }] },
        forecastHourly: { metadata, hours: [forecast] },
        forecastPeriodic: { metadata, series: [{ periods: [forecast] }] },
        weatherAlerts: { metadata, alerts: [{ id: "00010203-0405-0607-0809-0a0b0c0d0e0f", description: "Apple alert" }] },
        unknownRoot: { conditionCode: "DO_NOT_TOUCH", nested: { expected: 17 } },
    });
}
function request(dataSets = "currentWeather,forecastDaily,forecastHourly,forecastPeriodic,weatherAlerts") {
    return {
        method: "GET",
        headers: { "User-Agent": "WeatherKit_Weather_macOS_Version_27.3", accept: "application/vnd.apple.flatbuffer" },
        url: `https://weatherkit.apple.com/api/v3/weather/zh-Hans/22.54/114.06?country=CN&dataSets=${dataSets}`,
    };
}
function response(body = appleBody()) {
    return { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ETag: "old", "content-length": "100", Digest: "old", "X-Keep": "yes" }, body: JSON.stringify(body) };
}
beforeEach(() => {
    globalThis.$argument = {
        LogLevel: "OFF",
        Storage: "Argument",
        DataSets: ["currentWeather", "forecastDaily", "forecastHourly"],
        Weather: { Provider: "ColorfulClouds", Replace: ["CN"] },
    };
    globalThis.$httpClient = { get: () => assert.fail("unexpected real provider request") };
});

test("passive WK3 JSON reuses Caiyun once per product without entering the binary codec", async t => {
    t.mock.method(WeatherKit3, "decodeWithReport", () => assert.fail("JSON responses must not enter the FlatBuffer decoder"));
    t.mock.method(FlatBufferRootProcessor.prototype, "encode", () => assert.fail("JSON responses must not enter the FlatBuffer encoder"));
    const now = t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气" }, temperature: 27, humidity: 65.4, conditionCode: "CLEAR" }));
    const daily = t.mock.method(ColorfulClouds.prototype, "Daily", async () => ({ metadata: { providerName: "彩云天气" }, days: [{ forecastStart: time, temperatureMax: 30, conditionCode: "CLEAR" }] }));
    const hourly = t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata: { providerName: "彩云天气" }, hours: [{ forecastStart: time, temperature: 28, conditionCode: "CLEAR" }] }));
    const input = response();
    const output = await Response(request(), input);
    for (const provider of [now, daily, hourly]) assert.equal(provider.mock.callCount(), 1);
    const body = JSON.parse(output.body);
    assert.equal(body.currentWeather.temperature, 27);
    assert.equal(body.currentWeather.humidity, 65.4, "provider hygiene rounding is not applied");
    assert.equal(body.currentWeather.metadata.providerName, "彩云天气");
    assert.equal(body.currentWeather.retainedField, "keep");
    assert.equal(body.forecastDaily.days[0].temperatureMax, 30);
    assert.equal(body.forecastHourly.hours[0].temperature, 28);
    assert.equal(body.forecastDaily.days[0].precipitationAmount, 6);
    assert.equal(body.forecastDaily.days[0].daytimeForecast.precipitationAmount, 6);
    // 未注入的产品保持 Apple 原始表示 / Un-injected products keep Apple's original representation.
    assert.equal(body.forecastPeriodic.series[0].periods[0].conditionCode, "RAIN");
    assert.equal(body.weatherAlerts.alerts[0].id, "00010203-0405-0607-0809-0a0b0c0d0e0f");
    assert.deepEqual(body.unknownRoot, appleBody().unknownRoot);
    assert.equal(output.headers.ETag, undefined);
    assert.equal(output.headers.Digest, undefined);
    assert.equal(output.headers["content-length"], undefined);
    assert.equal(output.headers["Cache-Control"], "no-store");
    assert.equal(output.headers["X-Keep"], "yes");
});

test("QWeather uses existing injectors; only requested AND enabled weather products are replaced", async t => {
    globalThis.$argument.Weather.Provider = "QWeather";
    globalThis.$argument.DataSets = ["currentWeather", "forecastDaily"];
    const now = t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { providerName: "和风天气" }, temperature: 25 }));
    t.mock.method(QWeather.prototype, "Daily", async () => assert.fail("daily not requested"));
    t.mock.method(QWeather.prototype, "Hourly", async () => assert.fail("hourly disabled"));
    const output = JSON.parse((await Response(request("currentWeather,forecastHourly"), response())).body);
    assert.equal(output.currentWeather.temperature, 25);
    assert.equal(now.mock.callCount(), 1);
    assert.equal(output.forecastHourly.hours[0].temperature, 20);
    assert.equal(output.forecastDaily.metadata.providerName, "Apple");
});

test("provider failure rolls back one product without discarding healthy replacements", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气" }, temperature: 27 }));
    t.mock.method(ColorfulClouds.prototype, "Daily", async () => {
        throw new Error("offline");
    });
    t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata: { providerName: "彩云天气" }, hours: [{ forecastStart: time, temperature: 29 }] }));
    const output = JSON.parse((await Response(request(), response())).body);
    assert.equal(output.currentWeather.temperature, 27);
    assert.equal(output.forecastDaily.metadata.providerName, "Apple", "throwing provider preserves the original product");
    assert.equal(output.forecastHourly.hours[0].temperature, 29);
});

test("Surge binary-body-mode JSON bytes are decoded and stale bodyBytes removed", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气" }, temperature: 27 }));
    const input = response();
    input.bodyBytes = new TextEncoder().encode(input.body);
    input.body = "stale";
    const output = await Response(request("currentWeather"), input);
    assert.equal(JSON.parse(output.body).currentWeather.temperature, 27);
    assert.equal(output.bodyBytes, undefined);
});

test("provider's unavailable result preserves usable Apple data and attribution", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气", temporarilyUnavailable: true } }));
    const output = JSON.parse((await Response(request("currentWeather"), response())).body);
    assert.equal(output.currentWeather.metadata.providerName, "Apple");
    assert.equal(output.currentWeather.metadata.temporarilyUnavailable, false);
    assert.equal(output.currentWeather.temperature, 20);
});

test("unselected products and unknown roots pass through byte-identical", async () => {
    globalThis.$argument.DataSets = ["forecastPeriodic"];
    const input = response();
    const output = await Response(request(), input);
    assert.equal(output.body, input.body);
    assert.equal(output.headers.ETag, "old");
});

test("EAQI's unsupported CO sub-index does not roll back the whole AQ product", async t => {
    globalThis.$argument.DataSets = "airQuality,currentWeather";
    globalThis.$argument.AirQuality = { Calculate: { Algorithm: "EU_EAQI" }, Comparison: { ReplaceWhenCurrentChange: false } };
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => undefined);
    // Minimal synthetic copy of the native response shape that exposed the -1 sentinel regression.
    // 官方 pollutant 仅含 amount/units/pollutantType；单项 index/categoryIndex 是内部分析字段，原样透传，App 不读取。
    const apple = appleBody();
    apple.airQuality = {
        metadata: { ...metadata, providerName: "和风天气" },
        index: 40,
        categoryIndex: 1,
        scale: "HJ6332012.2604",
        previousDayComparison: "UNKNOWN",
        pollutants: [
            ["PM10", 40],
            ["NO2", 57],
            ["CO", 0.6],
            ["OZONE", 46],
            ["PM2_5", 26],
            ["SO2", 9],
        ].map(([pollutantType, amount]) => ({ pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER" })),
    };
    const body = JSON.parse((await Response(request("airQuality,currentWeather"), response(apple))).body);
    assert.match(body.airQuality.scale, /^EU\.EAQI/);
    const co = body.airQuality.pollutants.find(pollutant => pollutant.pollutantType === "CO");
    assert.equal(co.amount, 600, "existing provider-unit correction still applies");
    assert.equal(co.index, -1, "internal sub-index sentinel passes through without special handling");
});

test("unserializable provider graphs preserve the original product", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气" }, temperature: 27, extra: 1n }));
    const output = JSON.parse((await Response(request("currentWeather"), response())).body);
    assert.equal(output.currentWeather.temperature, 20, "BigInt fails serialization and the original product is preserved");
    assert.equal(output.currentWeather.conditionCode, "RAIN");
});

test("combined products serialize without an artificial size cap", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气" }, temperature: 27 }));
    t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata: { providerName: "彩云天气" }, hours: [{ forecastStart: time, temperature: 29 }] }));
    const body = JSON.parse((await Response(request(), response())).body);
    assert.equal(body.currentWeather.temperature, 27);
    assert.equal(body.forecastHourly.hours[0].temperature, 29);
});

test("malformed/error/oversized JSON responses are returned untouched without provider calls", async () => {
    const cases = [
        { ...response(), status: 503 },
        { ...response(), body: "{" },
        { ...response(), body: "[]" },
        { ...response(), body: " ".repeat(4 * 1024 * 1024 + 1) },
    ];
    for (const input of cases) assert.equal(await Response(request(), input), input);
});
