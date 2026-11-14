import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "Argument" };

const [{ Request }, { Response }, { default: WeatherKit3 }, { default: ColorfulClouds }, { default: QWeather }, { adaptWeatherKit3JSON, replaceWeatherKit3JSON }] = await Promise.all([
    import("../src/process/Request.dev.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/class/WeatherKit3.mjs"),
    import("../src/class/ColorfulClouds.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/function/weatherKit3JSON.mjs"),
]);

const time = 1800000000;
const metadata = { providerName: "Apple", latitude: 22.54, longitude: 114.06, readTime: time, temporarilyUnavailable: false };
const forecast = { forecastStart: time, forecastEnd: time + 3600, conditionCode: ["RAIN"], precipitationAmountByType: [{ precipitationType: ["RAIN"], expected: 6 }], temperature: 20, retainedField: "keep" };
// Synthetic reader-contract fixture derived from PR #107's documented macOS observations,
// not a capture or proof of native acceptance on this Mac.
function appleBody() {
    return structuredClone({
        currentWeather: { metadata, temperature: 20, conditionCode: ["RAIN"], humidity: 80, retainedField: "keep" },
        forecastDaily: { metadata, days: [{ ...forecast, daytimeForecast: forecast, overnightForecast: forecast }] },
        forecastHourly: { metadata, hours: [forecast] },
        forecastPeriodic: { metadata, series: [{ periods: [forecast] }] },
        weatherAlerts: { metadata, alerts: [{ id: { bytes: Array.from({ length: 16 }, (_, i) => i) }, description: "Apple alert" }] },
        unknownRoot: { conditionCode: ["DO_NOT_TOUCH"], nested: { expected: 17 } },
    });
}
function request(dataSets = "currentWeather,forecastDaily,forecastHourly,forecastPeriodic,weatherAlerts") {
    return {
        method: "GET",
        headers: { "User-Agent": "WeatherKit_Weather_macOS_Version_27.3", accept: "application/vnd.apple.flatbuffer", "If-None-Match": "old", "If-Modified-Since": "yesterday" },
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

test("main-app WK3 request negotiates JSON without changing datasets or URL", async () => {
    const input = request();
    const { $request: output } = await Request(input);
    assert.equal(output.url, request().url);
    assert.equal(output.headers.Accept, "application/json");
    assert.equal(output.headers.accept, undefined);
    assert.equal(output.headers["If-None-Match"], undefined);
    assert.equal(output.headers["If-Modified-Since"], undefined);
});

test("JSON negotiation is restricted by client, version, method, country, provider and dataset", async () => {
    const cases = [
        input => {
            input.headers["User-Agent"] = "WeatherWidget";
        },
        input => {
            input.url = input.url.replace("v3", "v2");
        },
        input => {
            input.method = "HEAD";
        },
        input => {
            input.url = input.url.replace("country=CN", "country=US");
        },
        input => {
            input.url = input.url.replace("22.54", "122.54");
        },
        input => {
            input.url = input.url.replace(/dataSets=.*/, "dataSets=forecastPeriodic");
        },
        () => {
            globalThis.$argument.Weather.Provider = "WeatherKit";
        },
        () => {
            globalThis.$argument.DataSets = "[]";
        },
    ];
    for (const configure of cases) {
        globalThis.$argument.Weather.Provider = "ColorfulClouds";
        globalThis.$argument.DataSets = ["currentWeather", "forecastDaily", "forecastHourly"];
        const input = request();
        configure(input);
        const { $request: output } = await Request(input);
        assert.equal(output.headers.accept, "application/vnd.apple.flatbuffer", configure.toString());
        assert.equal(output.headers.Accept, undefined);
    }
    const input = request();
    globalThis.$argument.DataSets = ["currentWeather"];
    input.headers["user-agent"] = input.headers["User-Agent"].replace("macOS", "iOS");
    delete input.headers["User-Agent"];
    assert.equal((await Request(input)).$request.headers.Accept, "application/json");
});

test("WK3 JSON reuses Caiyun once per product without entering the binary codec", async t => {
    t.mock.method(WeatherKit3, "decodeWithReport", () => assert.fail("negotiated JSON must not enter the FlatBuffer decoder"));
    t.mock.method(WeatherKit3, "encode", () => assert.fail("negotiated JSON must not enter the FlatBuffer encoder"));
    const now = t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "彩云天气" }, temperature: 27, humidity: 65.4, conditionCode: "CLEAR" }));
    const daily = t.mock.method(ColorfulClouds.prototype, "Daily", async () => ({ metadata: { providerName: "彩云天气" }, days: [{ forecastStart: time, temperatureMax: 30, conditionCode: "CLEAR" }] }));
    const hourly = t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata: { providerName: "彩云天气" }, hours: [{ forecastStart: time, temperature: 28, conditionCode: "CLEAR" }] }));
    const input = response();
    const outgoing = (await Request(request())).$request;
    assert.equal(outgoing.headers.Accept, "application/json");
    const output = await Response(outgoing, input);
    for (const provider of [now, daily, hourly]) assert.equal(provider.mock.callCount(), 1);
    const body = JSON.parse(output.body);
    assert.equal(body.currentWeather.temperature, 27);
    assert.equal(body.currentWeather.humidity, 65);
    assert.equal(body.currentWeather.metadata.providerName, "彩云天气");
    assert.equal(body.currentWeather.retainedField, "keep");
    assert.equal(body.forecastDaily.days[0].temperatureMax, 30);
    assert.equal(body.forecastHourly.hours[0].temperature, 28);
    assert.equal(body.forecastDaily.days[0].precipitationAmount, 6);
    assert.equal(body.forecastDaily.days[0].daytimeForecast.precipitationAmount, 6);
    assert.equal(body.forecastPeriodic.series[0].periods[0].conditionCode, "RAIN");
    assert.equal(body.weatherAlerts.alerts[0].id, "00010203-0405-0607-0809-0a0b0c0d0e0f");
    assert.deepEqual(body.unknownRoot, appleBody().unknownRoot);
    assert.equal(output.headers.ETag, undefined);
    assert.equal(output.headers.Digest, undefined);
    assert.equal(output.headers["content-length"], undefined);
    assert.equal(output.headers["Cache-Control"], "no-store");
    assert.equal(output.headers["X-Keep"], "yes");
    assert.equal(input.body, response().body, "input response stays unmodified");
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

test("provider failure/invalid number rolls back one product without discarding healthy replacements", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata: { providerName: "Invalid" }, temperature: Number.NaN }));
    t.mock.method(ColorfulClouds.prototype, "Daily", async () => {
        throw new Error("offline");
    });
    t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata: { providerName: "彩云天气" }, hours: [{ forecastStart: time, temperature: 29 }] }));
    const output = JSON.parse((await Response(request(), response())).body);
    assert.equal(output.currentWeather.temperature, 20);
    assert.equal(output.currentWeather.metadata.providerName, "Apple");
    assert.equal(output.currentWeather.conditionCode, "RAIN", "fallback still satisfies the negotiated reader format");
    assert.equal(output.forecastDaily.metadata.providerName, "Apple");
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

test("unknown nested fields retain their own shapes", () => {
    const unknown = { conditionCode: ["FUTURE"], precipitationAmount: { expected: 8 } };
    const value = { conditionCode: ["RAIN"], unknown: structuredClone(unknown) };
    adaptWeatherKit3JSON(value, "currentWeather");
    assert.equal(value.conditionCode, "RAIN");
    assert.deepEqual(value.unknown, unknown);
});

test("native 27.3 precipitation ranges, rest-of-day and periodic forecasts use scalar conditions", () => {
    const current = { precipitationAmountPrevious1hByType: [{ expected: 2, precipitationType: ["RAIN"] }] };
    adaptWeatherKit3JSON(current, "currentWeather");
    assert.equal(current.precipitationAmountPrevious1hByType[0].precipitationType, "RAIN");
    const daily = { days: [{ restOfDayForecast: { conditionCode: ["CLOUDY"], precipitationAmountByType: [{ expected: 3, precipitationType: ["RAIN"] }] } }] };
    adaptWeatherKit3JSON(daily, "forecastDaily");
    assert.equal(daily.days[0].restOfDayForecast.conditionCode, "CLOUDY");
    assert.equal(daily.days[0].restOfDayForecast.precipitationAmountByType[0].precipitationType, "RAIN");
    const periodic = { forecasts: [{ periods: [{ conditionCode: ["RAIN"] }] }] };
    adaptWeatherKit3JSON(periodic, "forecastPeriodic");
    assert.equal(periodic.forecasts[0].periods[0].conditionCode, "RAIN");
});

test("EAQI's unsupported CO sub-index does not roll back the whole AQ product", async t => {
    globalThis.$argument.DataSets = "airQuality,currentWeather";
    globalThis.$argument.AirQuality = { Calculate: { Algorithm: "EU_EAQI" }, Comparison: { ReplaceWhenCurrentChange: false } };
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => undefined);
    // Minimal synthetic copy of the native response shape that exposed the -1 sentinel regression.
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
    assert.equal(co.index, undefined);
    assert.equal(co.categoryIndex, undefined);
});

test("oversized/invalid provider graphs keep normalized Apple data instead of raw WK3 JSON", async () => {
    for (const extra of ["x".repeat(4 * 1024 * 1024), [Number.NaN], 1n]) {
        const output = await replaceWeatherKit3JSON(response(), ["currentWeather"], {
            currentWeather: product => ({ ...product, temperature: 27, extra }),
        });
        const body = JSON.parse(output.body);
        assert.equal(body.currentWeather.temperature, 20);
        assert.equal(body.currentWeather.conditionCode, "RAIN");
        assert.equal(body.currentWeather.extra, undefined);
    }
});

test("combined product size fallback keeps the reader-compatible response", async () => {
    const extra = "x".repeat(3 * 1024 * 1024);
    const output = await replaceWeatherKit3JSON(response(), ["currentWeather", "forecastHourly"], {
        currentWeather: product => ({ ...product, temperature: 27, extra }),
        forecastHourly: product => ({ ...product, extra }),
    });
    const body = JSON.parse(output.body);
    assert.equal(body.currentWeather.temperature, 20);
    assert.equal(body.currentWeather.conditionCode, "RAIN");
    assert.equal(body.forecastHourly.extra, undefined);
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

test("periodic-only normalization works independently of replaceable products", async () => {
    const output = await replaceWeatherKit3JSON(response({ forecastPeriodic: appleBody().forecastPeriodic }), [], {});
    assert.equal(JSON.parse(output.body).forecastPeriodic.series[0].periods[0].precipitationAmount, 6);
});

test("condition record arrays stay intact; provider timestamp absence and integer rules are explicit", () => {
    const condition = [{ startTime: time, forecastToken: "START" }];
    const value = { condition, humidity: 65.6, reportedTime: 0, temperature: -2, metadata: { latitude: "22.54", longitude: "114.06" } };
    adaptWeatherKit3JSON(value, "currentWeather", true);
    assert.deepEqual(value.condition, condition);
    assert.equal(value.humidity, 66);
    assert.equal(value.reportedTime, undefined);
    assert.equal(value.temperature, -2);
    assert.equal(value.metadata.latitude, 22.54);
    assert.throws(() => adaptWeatherKit3JSON({ humidity: 120 }, "currentWeather", true), RangeError);
});
