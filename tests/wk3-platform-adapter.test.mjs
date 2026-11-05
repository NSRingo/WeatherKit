import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { Builder } from "flatbuffers";
import { encodeAirQuality, decodeWK3DataSet } from "../src/wk3/class/WeatherKit3.mjs";
import { runPlatform } from "../src/platform/wk3-adapter.mjs";
import { buildPlatform } from "../scripts/build-wk3-platform.mjs";
import { renderWK3Module } from "../scripts/build-wk3-modules.mjs";

const platforms = ["surge", "loon", "stash", "quantumultx"];
const bytes = [0, 1, 127, 128, 255];
const binary = String.fromCharCode(...bytes);

for (const platform of platforms) {
    test(`${platform}: $request/$response/$done, binary and Header contract`, async () => {
        let doneCalls = 0, returned;
        const globals = {
            $platform: platform === "quantumultx" ? "Quantumult X" : platform,
            $request: { url: "https://weatherkit.apple.com/api/v2/weather/x", method: "GET", headers: { "X-Request": "kept" } },
            $response: { status: 206, headers: { "content-type": "application/octet-stream", "content-length": "5", "content-encoding": "gzip", "x-original": "yes" }, body: binary },
            $done(value) { doneCalls++; returned = value; }, console: { error(error) { throw error; } },
        };
        let observed;
        const binaryUnsupported = platform === "quantumultx";
        await runPlatform(async ctx => {
            observed = ctx;
            assert.equal(ctx.request.url, globals.$request.url);
            assert.equal(ctx.request.headers["X-Request"], "kept");
            assert.equal(ctx.response.status, 206);
            assert.deepEqual(Array.from(new Uint8Array(await ctx.response.arrayBuffer())), bytes);
            return { status: 201, headers: { "Content-Type": binaryUnsupported ? "application/json" : "application/octet-stream", "Content-Length": "5", "Content-Encoding": "gzip", "X-Patched": "yes" }, body: binaryUnsupported ? JSON.stringify({ ok: true }) : new Uint8Array(bytes) };
        }, "response", globals);
        assert.equal(doneCalls, 1);
        if (binaryUnsupported) {
            assert.equal(observed, undefined, "Quantumult X binary handler must not run");
            assert.equal(returned, undefined, "Quantumult X raw binary response is passed through");
        } else {
            assert.ok(observed);
            const result = returned;
            assert.equal(result.status, 201);
            assert.equal(result.headers["X-Patched"], "yes");
            assert.ok(!Object.keys(result.headers).some(k => ["content-length", "content-encoding", "transfer-encoding"].includes(k.toLowerCase())));
            if (platform === "loon") {
                assert.ok(result.body instanceof Uint8Array);
                assert.deepEqual(Array.from(result.body), bytes);
            } else assert.deepEqual(Array.from(result.body, c => c.charCodeAt(0)), bytes);
        }

        doneCalls = 0;
        await runPlatform(async ctx => { assert.equal(ctx.request.url, globals.$request.url); return undefined; }, "request", globals);
        assert.equal(doneCalls, 1);
        assert.equal(returned, undefined);
    });
}

test("binary bodyBytes takes precedence over an empty text body", async () => {
    let returned;
    const globals = {
        $request: { url: "https://weatherkit.apple.com/api/v3/weather/x", headers: {} },
        $response: { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: "", bodyBytes: new Uint8Array(bytes) },
        $done(value) { returned = value; },
    };
    await runPlatform(async ctx => {
        assert.deepEqual(Array.from(new Uint8Array(await ctx.response.arrayBuffer())), bytes);
        return { status: 200, headers: {}, body: new Uint8Array(bytes) };
    }, "response", globals, "surge");
    assert.deepEqual(Array.from(returned.body, c => c.charCodeAt(0)), bytes);
});

test("all verified platforms produce executable request and response bundles", async () => {
    for (const platform of platforms) {
        const bundles = await buildPlatform(platform, { minify: false });
        for (const stage of ["request", "response"]) {
            const calls = [];
            const globals = {
                URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Response, Headers, console,
                $platform: platform === "quantumultx" ? "Quantumult X" : platform,
                $environment: {}, $request: { url: "https://elsewhere.invalid/pass-through", method: "GET", headers: {} },
                $response: { status: 503, headers: { "content-type": "text/plain" }, body: "unchanged" },
                $done(value) { calls.push(value); },
            };
            vm.runInNewContext(bundles[stage].code, globals, { timeout: 30000 });
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(calls.length, 1, `${platform} ${stage}`);
            if (stage === "request") assert.equal(calls[0], undefined);
        }
    }
});

test("Surge bundle patches WK3 AQ using platform HTTP callbacks", async () => {
    const builder = new Builder();
    const aq = encodeAirQuality(builder, { metadata: { sourceType: 3, providerName: "Apple" }, scale: "HJ6332012.2604", index: 60, categoryIndex: 2, pollutants: [], primaryPollutant: 11 });
    builder.startObject(15); builder.addFieldOffset(0, aq, 0); builder.finish(builder.endObject());
    const original = builder.asUint8Array();
    const bundles = await buildPlatform("surge", { minify: false });
    const calls = [], requests = [], payload = String.fromCharCode(...original);
    const globals = {
        URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Response, Headers, console,
        $argument: 'AirQuality.Current.Index.Provider="ColorfulCloudsUS"&AirQuality.Current.Index.Replace="HJ6332012"&AirQuality.Comparison.Yesterday.IndexProvider="WeatherKit"&DataSets="airQuality"',
        $request: { url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=airQuality", headers: {} },
        $response: { status: 200, headers: { "content-type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, body: payload },
        $httpClient: { get(options, done) {
            requests.push(options.url);
            if (!options.url.includes("/realtime")) throw new Error(`Unexpected source: ${options.url}`);
            done(null, { status: 200, headers: { "content-type": "application/json" } }, JSON.stringify({ status: "ok", location: [31, 121], result: { realtime: { status: "ok", air_quality: { description: { usa: "moderate" }, aqi: { usa: 87, chn: 60 }, obs_time: 1893456000, pm25: 12, pm10: 20, co: 0.4, no2: 10, so2: 5, o3: 40 } } } }));
        } },
        $done(value) { calls.push(value); },
    };
    vm.runInNewContext(bundles.response.code, globals, { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(calls.length, 1);
    assert.ok(requests.some(url => url.includes("/realtime")), `No provider request: ${JSON.stringify(requests)}`);
    const result = calls[0];
    assert.equal(decodeWK3DataSet(Uint8Array.from(result.body, char => char.charCodeAt(0))).index, 87);
});

test("unknown platform is refused instead of advertised as supported", async () => {
    await assert.rejects(buildPlatform("shadowrocket", { minify: false }), /Unverified platform/);
});

test("platform arguments preserve nested list settings and booleans", async () => {
    let captured;
    const globals = {
        $environment: { "Weather.Provider": "ColorfulClouds" },
        $argument: 'DataSets:["airQuality","forecastNextHour"],Weather.Replace:["CN","HK"],Weather.Provider:QWeather,AirQuality.Calculate.Algorithm:WAQI_InstantCast_CN_25_DRAFT,AirQuality.Calculate.AllowOverRange:false',
        $request: { url: "https://weatherkit.apple.com/api/v2/weather/x", headers: {} },
        $done() {},
    };
    let env;
    await runPlatform(async ctx => { env = ctx.env; }, "request", globals, "surge");
    assert.deepEqual(env.DataSets, ["airQuality", "forecastNextHour"]);
    assert.deepEqual(env["Weather.Replace"], ["CN", "HK"]);
    assert.equal(env["Weather.Provider"], "QWeather");
    assert.equal(env["AirQuality.Calculate.Algorithm"], "WAQI_InstantCast_CN_25_DRAFT");
    assert.equal(env["AirQuality.Calculate.AllowOverRange"], false);

    const surge = renderWK3Module("surge", "3.3.2");
    const argumentTemplate = surge.split("\n").find(line => line.startsWith("WeatherKit.api.weather.response =")).split("argument=")[1];
    const actualArgument = argumentTemplate.replaceAll(/\{\{\{([^}]+)\}\}\}/g, (_, key) => key === "Weather.Provider" ? "QWeather" : key === "AirQuality.Calculate.Algorithm" ? "HK_AQHI" : "");
    await runPlatform(async ctx => { env = ctx.env; }, "request", { ...globals, $argument: actualArgument }, "surge");
    assert.equal(env["Weather.Provider"], "QWeather");
    assert.equal(env["AirQuality.Calculate.Algorithm"], "HK_AQHI");

    let loonEnv;
    const loon = { $argument: '["airQuality,forecastNextHour","CN,HK","QWeather","false","false","QWeatherWeb","ColorfulClouds","ColorfulCloudsUS","HJ6332012","true","ColorfulClouds","[]","Scale","true","ColorfulCloudsUS","ColorfulCloudsCN","WAQI_InstantCast_CN_25_DRAFT","false"]', $request: globals.$request, $done() {} };
    await runPlatform(async ctx => { loonEnv = ctx.env; }, "request", loon, "loon");
    assert.equal(loonEnv.DataSets, "airQuality,forecastNextHour");
    assert.equal(loonEnv["Weather.Provider"], "QWeather");
    assert.equal(loonEnv["AirQuality.Calculate.Algorithm"], "WAQI_InstantCast_CN_25_DRAFT");
    assert.equal(loonEnv["AirQuality.Calculate.AllowOverRange"], false);
});
