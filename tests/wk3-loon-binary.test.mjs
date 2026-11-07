import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { Builder } from "flatbuffers";
import { runPlatform } from "../src/platform/wk3-adapter.mjs";
import { buildPlatform } from "../scripts/build-wk3-platform.mjs";
import { encodeAirQuality, decodeWK3DataSet } from "../src/wk3/class/WeatherKit3.mjs";
import { localParameters } from "../src/wk3/parameters.mjs";

const raw = new Uint8Array([0, 1, 127, 128, 195, 255]);
for (const stage of ["request", "response"]) {
    test(`Loon ${stage}: native bytes survive $done without text encoding`, async () => {
        for (const body of [raw, raw.buffer, new Uint8Array([99, ...raw, 99]).subarray(1, -1)]) {
            let returned;
            await runPlatform(async () => ({ status: 200, headers: {}, body }), stage, {
                $request: { url: "https://example.invalid", headers: {} },
                $response: { status: 200, headers: {}, body: raw },
                $done(value) { returned = value; },
            }, "loon");
            const result = stage === "request" ? returned.response : returned;
            assert.ok(result.body instanceof Uint8Array, "binary Loon output must be native Uint8Array, never a string");
            assert.deepEqual(Array.from(result.body), Array.from(raw));
        }
    });
}

test("Loon text responses remain strings", async () => {
    let returned;
    await runPlatform(async () => ({ status: 200, headers: {}, body: "天气正常" }), "response", {
        $request: { url: "https://example.invalid", headers: {} },
        $done(value) { returned = value; },
    }, "loon");
    assert.equal(returned.body, "天气正常");
});

let built;
const bundle = () => built ??= buildPlatform("loon");
async function execute(code, body, overrides = {}) {
    const logs = [], requests = [];
    const values = localParameters.map(p => overrides[p.key] ?? p.value);
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    vm.runInNewContext(code, {
        URL, Headers, Response, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
        console: { log: line => logs.push(line) },
        $loon: "3.5.4", $argument: JSON.stringify(values),
        $request: { url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=airQuality", method: "GET", headers: {} },
        $response: { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, body },
        $httpClient: { get(options, callback) {
            requests.push(options.url);
            assert.ok(options.url.includes("/realtime"), options.url);
            callback(null, { status: 200, headers: { "content-type": "application/json" } }, JSON.stringify({ status: "ok", location: [31, 121], result: { realtime: { status: "ok", air_quality: { description: { usa: "moderate" }, aqi: { usa: 87, chn: 60 }, obs_time: 1893456000, pm25: 12, pm10: 20, co: 0.4, no2: 10, so2: 5, o3: 40 } } } }));
        } },
        $done: value => finish(value),
    }, { timeout: 30000 });
    const result = await Promise.race([completed, new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error("Loon script did not finish")), 5000);
        timer.unref();
    })]);
    return { result, logs, requests };
}

test("actual minified Loon bundle preserves binary pass-through with high bytes", async () => {
    const { response } = await bundle();
    const { result, logs, requests } = await execute(response.code, raw, { DataSets: "[]" });
    assert.ok(result.body instanceof Uint8Array, "native Loon host receives bytes, not UTF-8 text");
    assert.deepEqual(Array.from(result.body), Array.from(raw));
    assert.equal(requests.length, 0);
    assert.equal(logs[0], "☑️ response");
    assert.equal(logs.at(-1), "✅ response");
});

test("actual minified Loon bundle returns decodable WK3 US AQ after source request", async () => {
    const b = new Builder();
    const aq = encodeAirQuality(b, { metadata: { sourceType: 3, providerName: "Apple" }, scale: "HJ6332012.2604", index: 60, categoryIndex: 2, pollutants: [], primaryPollutant: 11 });
    b.startObject(15); b.addFieldOffset(0, aq, 0); b.finish(b.endObject());
    const { response } = await bundle();
    const { result, logs, requests } = await execute(response.code, b.asUint8Array(), { "AirQuality.Current.Index.Provider": "ColorfulCloudsUS", "AirQuality.Comparison.Yesterday.IndexProvider": "WeatherKit" });
    assert.ok(result.body instanceof Uint8Array, "returned WK3 must stay binary for Loon");
    const decoded = decodeWK3DataSet(result.body);
    assert.equal(decoded.index, 87);
    assert.equal(decoded.scale, "EPA_NowCast.2604");
    assert.equal(requests.length, 1);
    assert.ok(logs.some(line => /WK3 AQ patch/.test(line)));
});
