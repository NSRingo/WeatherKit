import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { WK2, WK3 } from "@nsringo/weatherkit";
import { Builder, ByteBuffer } from "flatbuffers";

// 平台模拟回放：加载实际构建产物（dist/*.bundle.js），以 Surge 语义全局环境驱动，
// 核对响应格式与字节结果。dist 缺失时跳过（先运行 npm run build / build:dev）。
const devBundle = new URL("../dist/response.dev.bundle.js", import.meta.url);
const releaseBundle = new URL("../dist/response.bundle.js", import.meta.url);
const bundlesExist = existsSync(devBundle) && existsSync(releaseBundle);

const fixture = new Uint8Array(readFileSync(new URL("./fixtures/wk3-aq.synthetic.bin", import.meta.url)));

const wk2Empty = (() => {
    const builder = new Builder();
    WK2.Weather.startWeather(builder);
    builder.finish(WK2.Weather.endWeather(builder));
    return builder.asUint8Array();
})();

const realtimePayload = {
    status: "ok",
    result: {
        realtime: {
            status: "ok",
            air_quality: {
                obs_time: "2026-11-06T08:00:00+08:00",
                description: { usa: "Moderate", chn: "良" },
                aqi: { usa: 87, chn: 60 },
                pm25: 30,
                pm10: 40,
                o3: 50,
                no2: 20,
                so2: 5,
                co: 0.5,
            },
        },
    },
    location: [31.25, 121.5],
};
const hourlyPayload = { status: "ok", result: { hourly: { status: "ok", air_quality: { aqi: [{ value: { usa: 25, chn: 20 } }] } } } };

function replayGlobals({ url, body, withProviders = false }) {
    globalThis.$environment = { "surge-version": "test" };
    globalThis.$persistentStore = { read: () => null, write: () => true };
    globalThis.$script = { startTime: Date.now() / 1000 };
    globalThis.$request = { method: "GET", headers: {}, url };
    globalThis.$response = { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body };
    globalThis.$argument = {
        LogLevel: "OFF",
        Storage: "Argument",
        DataSets: ["airQuality", "currentWeather", "forecastNextHour", "weatherAlerts"],
        AirQuality: {
            Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["EPA_NowCast"] }, Pollutants: { Provider: "ColorfulClouds", Units: { Replace: [] } } },
            Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: "ColorfulCloudsUS" } },
        },
    };
    globalThis.$httpClient = {
        get: (request, callback) => {
            if (!withProviders) assert.fail(`unexpected provider fetch: ${request.url}`);
            const payload = request.url.includes("realtime") ? realtimePayload : request.url.includes("hourly") ? hourlyPayload : {};
            callback(null, { status: 200, headers: {} }, JSON.stringify(payload));
        },
    };
}

async function replay(bundleUrl, tag) {
    const output = await new Promise((resolve, reject) => {
        globalThis.$done = resolve;
        import(`${bundleUrl.href}?replay=${tag}`).catch(reject);
    });
    assert.ok(output.body instanceof Uint8Array);
    assert.equal(output.response, undefined);
    return output;
}

test("dev bundle replaces WK3 AQ via canned providers and keeps other roots", { skip: !bundlesExist && "dist bundles not built" }, async () => {
    replayGlobals({
        url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=airQuality,currentWeather,forecastNextHour,weatherAlerts",
        body: fixture.slice(),
        withProviders: true,
    });
    const output = await replay(devBundle, "aq-replace");
    const aq = WK3.Weather.getRootAsWeather(new ByteBuffer(output.body)).airQuality();
    assert.equal(aq.index(), 87);
    assert.equal(aq.categoryIndex(), 2);
    assert.equal(aq.previousDayComparison(), 2);
    assert.match(aq.metadata().providerName(), /彩云天气/, "providerName retains the injected provider attribution");
    assert.equal(output.body.length > fixture.length, true, "replaced AQ child grows the buffer");
});

test("dev bundle preserves the original package when WK3 AQ decode fails", { skip: !bundlesExist && "dist bundles not built" }, async () => {
    const bytes = fixture.slice();
    const bb = new ByteBuffer(bytes);
    const aq = WK3.Weather.getRootAsWeather(bb).airQuality();
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(aq.bb_pos - bb.readInt32(aq.bb_pos), bb.readUint16(aq.bb_pos - bb.readInt32(aq.bb_pos)) + 2, true);
    replayGlobals({
        url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=airQuality,currentWeather",
        body: bytes,
    });
    const output = await replay(devBundle, "aq-rejected");
    assert.deepEqual(output.body, bytes);
});

test("dev bundle passes WK3 through untouched when AQ is not requested", { skip: !bundlesExist && "dist bundles not built" }, async () => {
    replayGlobals({
        url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=forecastNextHour",
        body: fixture.slice(),
    });
    const output = await replay(devBundle, "aq-not-requested");
    assert.deepEqual(output.body, fixture);
});

test("release bundle leaves v3 traffic byte-identical", { skip: !bundlesExist && "dist bundles not built" }, async () => {
    replayGlobals({
        url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=airQuality,currentWeather",
        body: fixture.slice(),
    });
    const output = await replay(releaseBundle, "release-v3");
    assert.deepEqual(output.body, fixture);
});

test("release bundle keeps the WK2 path byte-identical without injections", { skip: !bundlesExist && "dist bundles not built" }, async () => {
    replayGlobals({
        url: "https://weatherkit.apple.com/api/v2/weather/en-US/31.25/121.5?dataSets=currentWeather",
        body: wk2Empty.slice(),
    });
    globalThis.$argument.DataSets = [];
    const output = await replay(releaseBundle, "release-v2");
    assert.deepEqual(output.body, wk2Empty);
});

test("dev request/response bundles negotiate WK3 JSON and replace weather via the real Caiyun adapter", { skip: !bundlesExist && "dist bundles not built" }, async () => {
    const date = 1800000000;
    const metadata = { providerName: "Apple", temporarilyUnavailable: false };
    const original = { currentWeather: { metadata, temperature: 20, conditionCode: ["RAIN"], retainedField: 42 }, unknown: { conditionCode: ["untouched"] } };
    replayGlobals({ url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans/22.54/114.06?country=CN&dataSets=currentWeather", body: new Uint8Array() });
    globalThis.$request.headers = { "User-Agent": "WeatherKit_Weather_macOS_Version_27.3", accept: "application/vnd.apple.flatbuffer" };
    globalThis.$argument = { LogLevel: "OFF", Storage: "Argument", DataSets: "currentWeather", Weather: { Provider: "ColorfulClouds", Replace: "CN" } };
    const negotiated = await new Promise((resolve, reject) => {
        globalThis.$done = resolve;
        import(`${new URL("../dist/request.dev.bundle.js", import.meta.url).href}?replay=wk3-json`).catch(reject);
    });
    assert.equal(negotiated.headers.Accept, "application/json");
    globalThis.$request = negotiated;
    globalThis.$response = { status: 200, headers: { "Content-Type": "application/json", ETag: "old" }, body: new TextEncoder().encode(JSON.stringify(original)) };
    let calls = 0;
    globalThis.$httpClient.get = (request, callback) => {
        calls++;
        assert.match(request.url, /realtime/);
        const payload = {
            status: "ok",
            location: [22.54, 114.06],
            result: {
                server_time: date,
                realtime: {
                    status: "ok",
                    cloudrate: 0.25,
                    skycon: "CLEAR_DAY",
                    humidity: 0.65,
                    precipitation: { local: { intensity: 0 } },
                    pressure: 101300,
                    temperature: 27,
                    apparent_temperature: 28,
                    visibility: 10,
                    wind: { direction: 90, speed: 3 },
                },
            },
        };
        callback(null, { status: 200, headers: {} }, JSON.stringify(payload));
    };
    const output = await new Promise((resolve, reject) => {
        globalThis.$done = resolve;
        import(`${devBundle.href}?replay=wk3-json-weather`).catch(reject);
    });
    assert.equal(calls, 1);
    assert.equal(output.response, undefined, "Surge response-stage $done is unwrapped");
    assert.equal(output.bodyBytes, undefined);
    const body = JSON.parse(output.body);
    assert.equal(body.currentWeather.temperature, 27);
    assert.equal(body.currentWeather.conditionCode, "CLEAR");
    assert.equal(body.currentWeather.humidity, 65);
    assert.equal(body.currentWeather.metadata.providerName, "彩云天气");
    assert.equal(body.currentWeather.retainedField, 42);
    assert.deepEqual(body.unknown, original.unknown);
    assert.equal(output.headers.ETag, undefined);
});
