// All payloads are synthetic. Exercise shared release/development paths.
import assert from "node:assert/strict";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
const [{ default: ForecastNextHour }, { Response }, { Response: ResponseDev }, { Request }, { Request: RequestDev }, { default: WeatherKit2 }, { default: QWeather }, { default: ColorfulClouds }, { qs }, { Console }] = await Promise.all([
    import("../src/class/ForecastNextHour.mjs"),
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/process/Request.mjs"),
    import("../src/process/Request.dev.mjs"),
    import("../src/class/WeatherKit2.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/class/ColorfulClouds.mjs"),
    import("@nsnanocat/util/polyfill/qs.mjs"),
    import("@nsnanocat/util"),
]);
Console.logLevel = "OFF";
const BASE = 1_800_000_000;
const minute = (index, rain, intensity = 1) => ({ startTime: BASE + index * 60, precipitationChance: rain ? 80 : 0, precipitationIntensity: rain ? intensity : 0 });
const summary = minutes => ForecastNextHour.Summary(ForecastNextHour.Minute(minutes, "有小雨"));
const settings = overrides => (globalThis.$argument = qs.parse({ Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather", "Weather.Provider": "WeatherKit", ...overrides }));
const request = (version = "v3", dataSets = "currentWeather") => (globalThis.$request = { method: "GET", url: `https://weatherkit.apple.com/api/${version}/weather/en-US/31.2/121.5?country=CN&dataSets=${dataSets}`, headers: {} });
const headers = type => ({ "Content-Type": type, eTaG: '"apple"', "Last-Modified": "yesterday", "cOnTeNt-LeNgTh": "1", "Content-Encoding": "gzip", "Transfer-Encoding": "chunked", Digest: "old", "Cache-Control": "max-age=60", "X-Apple": "retain" });

test("a single minute still produces a summary and a condition", () => {
    const value = summary([minute(0, true)]);
    assert.equal(value.length, 1);
    assert.equal(value[0].startTime, BASE);
    assert.equal(value[0].endTime, 0);
    assert.equal(ForecastNextHour.Condition(value)[0].forecastToken, "CONSTANT");
    assert.deepEqual(summary([]), []);
});

for (const rainAtEnd of [true, false])
    test(`a transition on the last minute is retained (${rainAtEnd ? "start" : "stop"})`, () => {
        const values = summary([minute(0, !rainAtEnd), minute(1, !rainAtEnd), minute(2, rainAtEnd)]);
        assert.deepEqual(
            values.map(value => value.clear),
            [rainAtEnd, !rainAtEnd],
        );
        assert.equal(values[0].endTime, BASE + 120);
        assert.equal(values[1].startTime, BASE + 120);
        assert.equal(values[1].endTime, 0);
        assert.equal(ForecastNextHour.Condition(values).length, 2);
    });

test("the final minute contributes its probability, intensity and strongest condition", () => {
    const value = summary([minute(0, true, 0.2), { ...minute(1, true, 20), precipitationChance: 100 }])[0];
    assert.equal(value.precipitationIntensity, 20);
    assert.equal(value.precipitationChance, 100);
    assert.equal(value.maxCondition, "HEAVY_RAIN");
});

test("the existing 71-minute summary horizon excludes later samples", () => {
    const value = summary(Array.from({ length: 72 }, (_, index) => minute(index, index === 71)));
    assert.equal(value.length, 1);
    assert.equal(value[0].clear, true);
    assert.equal(value[0].endTime, 0);
});

for (const [name, processResponse, processRequest] of [
    ["release", Response, Request],
    ["development", ResponseDev, RequestDev],
]) {
    for (const product of ["forecastPeriodic", "weatherChanges"])
        test(`${name}: ${product}-only JSON still adapts known native fields without supplier work`, async () => {
            settings({ DataSets: "" });
            globalThis.$httpClient = {
                get() {
                    assert.fail("No supplier request is needed");
                },
            };
            const body = { [product]: { metadata: {}, forecasts: [{ conditionCode: ["RAIN"], precipitationAmountByType: [{ expected: 0.4, precipitationType: ["RAIN"] }] }] }, futureProduct: { conditionCode: ["UNKNOWN_FUTURE"] } };
            const input = { status: 200, headers: headers("application/json"), body: JSON.stringify(body) };
            const actual = await processResponse(request("v3", product), input);
            const parsed = JSON.parse(actual.body);
            assert.equal(parsed[product].forecasts[0].conditionCode, "RAIN");
            assert.equal(parsed[product].forecasts[0].precipitationAmount, 0.4);
            assert.deepEqual(parsed.futureProduct, body.futureProduct);
            assert.equal(actual.headers["Cache-Control"], "no-store");
            for (const key of ["eTaG", "Content-Encoding", "Transfer-Encoding", "cOnTeNt-LeNgTh"]) assert.equal(actual.headers[key], undefined);
        });

    test(`${name}: a changed WK2 body invalidates original HTTP validators and stale bodyBytes`, async t => {
        settings({ "Weather.Provider": "QWeather" });
        t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { temporarilyUnavailable: false, providerName: "fixture" }, temperature: 23 }));
        const bytes = WeatherKit2.encode(undefined, {
            currentWeather: {
                metadata: { temporarilyUnavailable: false },
                conditionCode: "CLEAR",
                temperature: 18,
                precipitationAmountNext1hByType: [],
                precipitationAmountNext6hByType: [],
                precipitationAmountNext24hByType: [],
                precipitationAmountPrevious1hByType: [],
                precipitationAmountPrevious6hByType: [],
                precipitationAmountPrevious24hByType: [],
            },
        });
        const input = { status: 200, headers: headers("application/vnd.apple.flatbuffer"), body: bytes, bodyBytes: bytes };
        const actual = await processResponse(request("v2"), input);
        assert.equal(WeatherKit2.decode(new ByteBuffer(bytes), ["currentWeather"]).currentWeather.temperature, 18);
        assert.equal(WeatherKit2.decode(new ByteBuffer(actual.body), ["currentWeather"]).currentWeather.temperature, 23);
        assert.equal(actual.headers["Cache-Control"], "no-store");
        for (const key of ["eTaG", "Last-Modified", "Content-Encoding", "Transfer-Encoding", "cOnTeNt-LeNgTh", "Digest"]) assert.equal(actual.headers[key], undefined);
        assert.equal(actual.headers["X-Apple"], "retain");
        assert.equal(actual.bodyBytes, undefined);
        assert.equal(input.headers.eTaG, '"apple"');
        assert.strictEqual(input.body, bytes);
    });

    test(`${name}: unchanged WK2 output keeps its validators`, async () => {
        settings({ DataSets: "" });
        const body = WeatherKit2.encode(undefined, {});
        const input = { status: 200, headers: headers("application/vnd.apple.flatbuffer"), body };
        assert.strictEqual((await processResponse(request("v2"), input)).body, body);
        assert.equal(input.headers.eTaG, '"apple"');
    });

    test(`${name}: a rejected WK2 product preserves the original body and validators`, async t => {
        settings({ "Weather.Provider": "QWeather" });
        t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { temporarilyUnavailable: false }, temperature: 23, precipitationAmountNext1hByType: 42 }));
        const body = WeatherKit2.encode(undefined, { currentWeather: { metadata: {}, temperature: 18 } });
        const input = { status: 200, headers: headers("application/vnd.apple.flatbuffer"), body };
        assert.strictEqual(await processResponse(request("v2"), input), input);
        assert.strictEqual(input.body, body);
        assert.equal(input.headers.eTaG, '"apple"');
    });

    test(`${name}: provider-only WK2 current weather encodes absent optional precipitation vectors`, async t => {
        settings({ "Weather.Provider": "QWeather" });
        t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { temporarilyUnavailable: false }, temperature: 23 }));
        const input = { status: 200, headers: headers("application/vnd.apple.flatbuffer"), body: WeatherKit2.encode(undefined, {}) };
        const actual = await processResponse(request("v2"), input);
        const product = WeatherKit2.decode(new ByteBuffer(actual.body), ["currentWeather"]).currentWeather;
        assert.equal(product.temperature, 23);
        assert.deepEqual(product.precipitationAmountNext1hByType, []);
        assert.equal(actual.headers["Cache-Control"], "no-store");
    });

    test(`${name}: native Apple warning IDs pass through with their conditional headers`, async () => {
        settings();
        globalThis.$httpClient = {
            get() {
                assert.fail("Opaque Apple IDs must pass through");
            },
        };
        const input = { method: "GET", url: "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=00112233-4455-6677-8899-aabbccddeeff", headers: { "If-None-Match": '"apple"', "If-Modified-Since": "yesterday" } };
        const actual = await processRequest(input);
        assert.equal(actual.$response, undefined);
        assert.equal(actual.$request.headers["If-None-Match"], '"apple"');
    });

    test(`${name}: WeatherKit-selected coordinate warning details pass through`, async () => {
        settings({ "WeatherAlerts.Provider": "WeatherKit" });
        globalThis.$httpClient = {
            get() {
                assert.fail("WeatherKit source must pass through");
            },
        };
        const actual = await processRequest({ method: "GET", url: "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=31.2,121.5", headers: {} });
        assert.equal(actual.$response, undefined);
    });
}

test("fractional QWeather hourly rainfall is not truncated to an integer", async () => {
    globalThis.$httpClient = {
        get(_request, callback) {
            callback(null, { status: 200, headers: {} }, JSON.stringify({ code: "200", updateTime: "2026-11-13T00:00:00Z", hourly: [{ fxTime: "2026-11-13T01:00:00Z", temp: "18", precip: "0.4" }] }));
        },
    };
    const value = await new QWeather({ country: "CN", latitude: 31.2, longitude: 121.5, language: "en", version: "v2" }, "fixture").Hourly();
    assert.equal(value.hours[0].precipitationIntensity, 0.4);
    assert.equal(value.hours[0].precipitationAmount, 0.4);
});

test("invalid Caiyun temperature cannot replace healthy Apple current weather", async () => {
    settings({ "Weather.Provider": "ColorfulClouds" });
    globalThis.$httpClient = {
        get(_request, callback) {
            callback(null, { status: 200, headers: {} }, JSON.stringify({ status: "ok", result: { realtime: { status: "ok", temperature: null, skycon: "RAIN", precipitation: { local: { intensity: 0 } }, wind: { direction: 90, speed: 2 } } } }));
        },
    };
    const input = { status: 200, headers: { "Content-Type": "application/json", ETag: '"apple"' }, body: JSON.stringify({ currentWeather: { metadata: { temporarilyUnavailable: false }, temperature: 18, conditionCode: "CLEAR" } }) };
    assert.strictEqual(await Response(request(), input), input);
    const provider = new ColorfulClouds({ country: "CN", latitude: 31.2, longitude: 121.5, language: "en", version: "v2" }, "fixture");
    assert.equal((await provider.CurrentWeather()).metadata.temporarilyUnavailable, true);
});

for (const precipitation of [[], [null], [-1], ["bad"]])
    test(`invalid Caiyun minute measurements are unavailable: ${JSON.stringify(precipitation)}`, async () => {
        globalThis.$httpClient = {
            get(_request, callback) {
                callback(null, { status: 200, headers: {} }, JSON.stringify({ status: "ok", server_time: BASE, result: { minutely: { status: "ok", precipitation_2h: precipitation, probability: [0.8, 0.8, 0.8, 0.8], description: "有小雨" } } }));
            },
        };
        const provider = new ColorfulClouds({ country: "CN", latitude: 31.2, longitude: 121.5, language: "en", version: "v2" }, "fixture");
        assert.equal(await provider.Minutely(), undefined);
    });

for (const row of [
    { fxTime: "invalid", precip: "0.2" },
    { fxTime: "2026-11-13T01:00:00Z", precip: "" },
    { fxTime: "2026-11-13T01:00:00Z", precip: "-1" },
])
    test(`invalid QWeather minute measurements are unavailable: ${JSON.stringify(row)}`, async () => {
        globalThis.$httpClient = {
            get(_request, callback) {
                callback(null, { status: 200, headers: {} }, JSON.stringify({ code: "200", updateTime: "2026-11-13T00:00:00Z", summary: "有小雨", minutely: [row] }));
            },
        };
        assert.equal(await new QWeather({ country: "CN", latitude: 31.2, longitude: 121.5, language: "en", version: "v2" }, "fixture").Minutely(), undefined);
    });

for (const [name, Provider] of [
    ["Caiyun", ColorfulClouds],
    ["QWeather", QWeather],
])
    test(`${name} minute source retains its existing region restriction`, async () => {
        globalThis.$httpClient = {
            get() {
                assert.fail("Unsupported regions require no supplier request");
            },
        };
        assert.equal(await new Provider({ country: "US", latitude: 40, longitude: -74, language: "en", version: "v2" }, "fixture").Minutely(), undefined);
    });
