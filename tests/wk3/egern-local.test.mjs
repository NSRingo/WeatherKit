import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { buildEgern } from "../../scripts/build-egern.mjs";
import { createRuntime } from "../../src/wk3/runtime.mjs";
import { encodeAirQuality, decodeWK3DataSet } from "../../src/wk3/class/WeatherKit3.mjs";
import { decodeWK3NextHour } from "../../src/wk3/class/WK3NextHour.mjs";
import { decodeWK3Alerts } from "../../src/wk3/class/WK3Alerts.mjs";
import vm from "node:vm";
import WeatherKit2 from "../../src/wk3/class/WeatherKit2.mjs";

const bundles = await buildEgern();
const load = async code => (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).default;
const request = await load(bundles.request.code), response = await load(bundles.response.code);
const issued = 1893456000;
const html = '<div class="c-city-warning-events warning--blue"><h3>测试区气象台发布大风蓝色预警</h3><p>发布日期：2030-01-01T08:00:00+08:00</p><p class="warning-events__txt">注意防范大风。</p></div>';
const json = data => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
const webResponse = bytes => new Response(bytes, { headers: { "content-type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather", "content-length": String(bytes.length), "content-encoding": "gzip", "x-keep": "original", etag: "old" } });
const settings = extra => ({ SETTINGS: JSON.stringify({ DataSets: ["airQuality"], AirQuality: { Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["HJ6332012"] } }, Comparison: { Yesterday: { IndexProvider: "WeatherKit" } } }, ...extra }) });
function context(bytes, datasets = "airQuality", extra = {}) {
    return { env: settings(), request: { method: "GET", url: `https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=${datasets}`, headers: new Headers({ authorization: "synthetic-apple", "x-schema-version": "lib-rc-3.0-b66" }) }, response: webResponse(bytes), http: { async get() { throw new Error("unexpected network"); } }, ...extra };
}
function source() {
    const b = new Builder(), aq = encodeAirQuality(b, { metadata: { sourceType: 3, providerName: "Synthetic Apple" }, scale: "HJ6332012.2604", index: 60, categoryIndex: 2, pollutants: [], primaryPollutant: 11 });
    const text = b.createString("preserve opaque future" ); b.startObject(1); b.addFieldOffset(0, text, 0); const opaque = b.endObject();
    b.startObject(15); b.addFieldOffset(0, aq, 0); b.addFieldOffset(14, opaque, 0); b.finish(b.endObject()); return b.asUint8Array();
}
function provider(index = 75, yesterday = 125) {
    return async function(url, options) {
        assert.equal(options.timeout, 8000); assert.equal(options.credentials, "omit"); assert.equal(options.headers.authorization, undefined);
        if (url.includes("/realtime")) return json({ status: "ok", location: [31, 121], result: { realtime: { status: "ok", air_quality: { description: { usa: "moderate" }, aqi: { usa: index, chn: 60 }, obs_time: issued, pm25: 12, pm10: 20, co: 0.4, no2: 10, so2: 5, o3: 40 } } } });
        if (url.includes("/hourly")) return json({ status: "ok", location: [31, 121], result: { server_time: issued, hourly: { status: "ok", air_quality: { aqi: [{ value: { usa: yesterday, chn: 90 } }] } } } });
        if (url.includes("/minutely")) return json({ status: "ok", server_time: 2000000040, location: [31, 121], result: { minutely: { status: "ok", description: "小雨", probability: [0.7, 0.7, 0.7, 0.7], precipitation_2h: Array(60).fill(1.5) } } });
        throw new Error(`Unexpected synthetic path: ${url}`);
    };
}

test("bundles have one native ESM export and no cloud runtime, runtime imports or global mutation", () => {
    for (const { code, inputs } of Object.values(bundles)) {
        assert.match(code, /export default async function\(ctx\)/);
        assert.doesNotMatch(code, /node:async_hooks|AsyncLocalStorage|caches\.default|waitUntil|globalThis\.fetch|\beval\(|new Function|\$done\(/);
        assert.doesNotMatch(code, /\bimport\s*(?:\(|["'{*])/);
        assert.ok(!inputs.some(path => /node_modules\/hono\/|src\/Hono\.js/.test(path)));
    }
});

test("HTTP adapter respects native methods, body bytes, milliseconds and response shape", async () => {
    const calls = [];
    const runtime = createRuntime({ env: { HTTP_TIMEOUT_MS: "2500" }, http: { async post(url, options) { calls.push({ url, options }); return json({ ok: true }); }, async get() { return new Response(new Uint8Array([0, 255, 127]), { status: 200, headers: { "content-type": "application/octet-stream" } }); } } });
    const bytes = new Uint8Array([9, 0, 255, 8]).subarray(1, 3);
    const result = await runtime.fetch({ url: "https://synthetic.invalid", bodyBytes: bytes, timeout: 4, headers: { Host: "wrong", "Content-Length": "99" } });
    assert.deepEqual(JSON.parse(result.body), { ok: true }); assert.equal(result.ok, true); assert.equal(result.statusCode, 200);
    assert.equal(calls[0].options.timeout, 4000); assert.deepEqual(calls[0].options.body, bytes); assert.deepEqual(calls[0].options.headers, {});
    const binary = await runtime.fetch("https://synthetic.invalid/binary"); assert.deepEqual(new Uint8Array(binary.bodyBytes), new Uint8Array([0, 255, 127]));
    assert.equal(binary.body, "");
});

test("availability follows upstream response stage; UUID details and Apple native page pass through", async () => {
    const ctx = { env: {}, request: { url: "https://weatherkit.apple.com/api/v2/availability/zh-Hans/31/121" }, response: new Response('["currentWeather"]', { headers: { 'content-type':'application/json' } }), http: {} };
    assert.equal(await request(ctx), undefined);
    const reply = await response(ctx); assert.equal(reply.status, 200); assert.ok(JSON.parse(reply.body).includes("airQuality")); assert.ok(JSON.parse(reply.body).includes("forecastNextHour"));
    for (const url of ["https://weatherkit.apple.com/alertDetails/index.html?ids=wk3_x", "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=00010203-0405-0607-0809-0a0b0c0d0e0f"]) assert.equal(await request({ ...ctx, request: { url } }), undefined);
});

test("binary response reuses real WK3 provider conversion and clears stale transport headers", async () => {
    const bytes = source(), before = bytes.slice();
    const out = await response(context(bytes, "airQuality", { http: { get: provider(87) } }));
    assert.ok(out.body instanceof Uint8Array); assert.equal(decodeWK3DataSet(out.body).index, 87); assert.equal(decodeWK3DataSet(out.body).scale, "EPA_NowCast.2604");
    assert.equal(out.headers.get("x-keep"), "original"); assert.equal(out.headers.get("content-length"), null); assert.equal(out.headers.get("content-encoding"), null); assert.equal(out.headers.get("etag"), null);
    assert.deepEqual(bytes, before);
});

test("AQ, actual provider minutes and yesterday comparison patch together, preserving future arena", async () => {
    const bytes = source();
    const env = settings({ DataSets: ["airQuality", "forecastNextHour"], NextHour: { Provider: "ColorfulClouds" }, AirQuality: { Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["HJ6332012"] } }, Comparison: { Yesterday: { IndexProvider: "ColorfulCloudsUS" } } } });
    const out = await response(context(bytes, "airQuality,forecastNextHour", { env, http: { get: provider() } }));
    const aq = decodeWK3DataSet(out.body), rain = decodeWK3NextHour(out.body);
    assert.equal(aq.index, 75); assert.equal(aq.previousDayComparison, 4); assert.equal(rain.minutes.length, 60); assert.equal(rain.minutes[0].precipitationIntensity, 1.5);
    const bb = new ByteBuffer(out.body), root = bb.readUint32(0); assert.ok(bb.__offset(root, 32));
});

test("same imported module keeps concurrent ctx HTTP and Settings isolated", async () => {
    let enter, release; const entered = new Promise(resolve => { enter = resolve; }); const blocked = new Promise(resolve => { release = resolve; });
    const bytes = source(), calls = [];
    const first = response(context(bytes, "airQuality", { http: { async get(url, options) { calls.push("first"); enter(); await blocked; return provider(75)(url, options); } } }));
    await entered;
    const disabled = await response(context(bytes, "airQuality", { env: { SETTINGS: '{"DataSets":[]}' } }));
    const secondEnv = settings({ API: { ColorfulClouds: { Token: "synthetic-second" } } });
    const second = await response(context(bytes, "airQuality", { env: secondEnv, http: { async get(url, options) { assert.ok(url.includes("/synthetic-second/")); calls.push("second"); return provider(125)(url, options); } } }));
    release(); const firstResult = await first;
    assert.deepEqual(disabled.body, bytes);
    assert.equal(decodeWK3DataSet(firstResult.body).index, 75); assert.equal(decodeWK3DataSet(second.body).index, 125); assert.deepEqual(calls, ["first", "second"]);
    assert.equal(globalThis.fetch.name, "fetch");
});

test("consumed binary input is restored on invalid config or provider failure; other paths untouched", async () => {
    const bytes = source();
    for (const extra of [{ env: { SETTINGS: "{" } }, { http: { async get() { throw new Error("offline"); } } }]) {
        const out = await response(context(bytes, "airQuality", extra)); assert.deepEqual(out.body, bytes); assert.equal(out.status, 200);
    }
    let read = false;
    const unrelated = { request: { url: "https://weatherkit.apple.com/alertDetails/index.html" }, response: { arrayBuffer() { read = true; } } };
    assert.equal(await response(unrelated), undefined); assert.equal(read, false);
});

function alertSource() {
    const b = new Builder(), details = b.createString("https://www.qweather.com/severe-weather/test-101010100.html?from=AppleWeatherService"), title = b.createString("大风"), source = b.createString("国家预警信息发布中心");
    b.startVector(1, 16, 1); for (let i = 15; i >= 0; i--) b.addInt8(i); const idbytes = b.endVector(); b.startObject(1); b.addFieldOffset(0, idbytes, 0); const id = b.endObject();
    b.startObject(22); b.addFieldOffset(0, id, 0); b.addFieldOffset(5, title, 0); b.addFieldOffset(16, source, 0); b.addFieldOffset(12, details, 0); b.addFieldInt8(14, 4, 0); b.addFieldInt32(9, issued, 0); const alert = b.endObject();
    b.startVector(4, 1, 4); b.addOffset(alert); const alerts = b.endVector(); b.startObject(4); b.addFieldOffset(1, details, 0); b.addFieldOffset(2, alerts, 0); const collection = b.endObject(); b.startObject(18); b.addFieldOffset(9, collection, 0); b.finish(b.endObject()); return b.asUint8Array();
}

test("unchanged Response default fetch binds to ctx; native Apple details complete with original UUID", async () => {
    const calls = [];
    const http = { async get(url, options) { calls.push({ url, options }); return new Response(html, { headers: { "content-type": "text/html" } }); } };
    const ctx = context(alertSource(), "weatherAlerts", { env: settings({ DataSets: ["weatherAlerts"] }), http });
    const out = await response(ctx), alerts = decodeWK3Alerts(out.body);
    assert.equal(alerts.alerts[0].description, "大风蓝色预警");
    const details = new URL(alerts.detailsUrl); assert.equal(details.hostname, "weatherkit.apple.com"); assert.match(details.searchParams.get("ids"), /^wk3_/);
    const reply = await request({ env: {}, request: { url: "https://weatherkit.apple.com/api/v1/weatherAlerts?" + details.searchParams, headers: ctx.request.headers }, http, respond: value => value });
    const data = JSON.parse(reply.body); assert.equal(data.length, 1); assert.equal(data[0].id, "00010203-0405-0607-0809-0a0b0c0d0e0f"); assert.equal(data[0].detailsUrl, "#" + data[0].id); assert.match(data[0].messages[0].text, /注意防范/);
    assert.equal(calls.length, 2); for (const call of calls) { assert.equal(call.options.headers.authorization, undefined); assert.equal(call.options.redirect, "error"); assert.equal(call.options.credentials, "omit"); }
});

test("malformed reserved native locator replies empty without upstream; disabled details pass through", async () => {
    const ctx = { env: {}, request: { url: "https://weatherkit.apple.com/api/v2/weatherAlerts?ids=wk3_!" }, http: { async get() { throw new Error("must not fetch"); } }, respond: value => value };
    assert.equal((await request(ctx)).body, "[]");
    assert.equal(await request({ ...ctx, env: { SETTINGS: '{"DataSets":[]}' } }), undefined);
});

test("bundle runs in restricted host without Node, Fetch globals, ALS or Cloudflare globals", async () => {
    const host = vm.createContext({ URL, TextEncoder, TextDecoder, atob, btoa, console: { log() {}, info() {}, debug() {}, warn() {}, error() {} } });
    const compiled = vm.runInContext(`(${bundles.response.code.replace("export default ", "")})`, host);
    const ctx = context(source(), "airQuality", { http: { get: provider(75) } });
    const out = await compiled(ctx);
    assert.equal(decodeWK3DataSet(out.body).index, 75);
    for (const name of ["process", "Buffer", "fetch", "Request", "Response", "Headers", "caches", "AbortController", "setTimeout"]) assert.equal(vm.runInContext(`typeof ${name}`, host), "undefined");
});

test("minimal official Headers methods preserve unknown headers and malformed body bytes", async () => {
    const native = new Headers({ "content-type": "application/vnd.apple.flatbuffer", "x-unlisted": "keep", "content-encoding": "gzip", "content-length": "4" });
    const documentedHeaders = { get: name => native.get(name), set: (name, value) => native.set(name, value), delete: name => native.delete(name) };
    const bytes = new Uint8Array([255, 255, 255, 255]);
    const ctx = context(bytes, "airQuality", { env: { SETTINGS: '{"DataSets":[]}' }, response: { status: 200, headers: documentedHeaders, async arrayBuffer() { return bytes.buffer; } } });
    const out = await response(ctx); assert.deepEqual(out.body, bytes); assert.equal(out.headers.get("x-unlisted"), "keep"); assert.equal(out.headers.get("content-length"), null);
});

test("airQualityScale fallback returns local JSON without third-party weather requests", async () => {
    const ctx = context(new Uint8Array(), "", { request: { url: "https://weatherkit.apple.com/api/v2/airQualityScale/zh-Hans/EPA_NowCast.2604", headers: {} }, response: new Response("{}", { status: 404, headers: { "content-type": "application/json" } }) });
    const out = await response(ctx); assert.equal(out.status, 200); assert.equal(typeof out.body, "string"); assert.ok(JSON.parse(out.body));
});

test("v2 selective codec and early iOS27 binary route run through native response adapter", async () => {
    const bytes = WeatherKit2.encode(undefined, { airQuality: { metadata: { sourceType: "MODELED", providerName: "Synthetic" }, scale: "HJ6332012.2604", index: 52, categoryIndex: 2, pollutants: [{ pollutantType: "PM2_5", amount: 10, units: "MICROGRAMS_PER_CUBIC_METER" }], primaryPollutant: "PM2_5", previousDayComparison: "SAME" } });
    for (const ios27 of [false, true]) {
        const ctx = context(bytes, "airQuality", { env: settings({ AirQuality: { Current: { Index: { Provider: "WeatherKit", Replace: [] }, Pollutants: { Provider: "WeatherKit" } }, Comparison: { ReplaceWhenCurrentChange: false, Yesterday: { IndexProvider: "WeatherKit" } } } }) });
        ctx.request.url = ctx.request.url.replace("/v3/", "/v2/"); if (ios27) ctx.request.headers.set("user-agent", "WeatherKit_Weather_iOS_Version 27.2");
        const out = await response(ctx); assert.equal(WeatherKit2.decode(new ByteBuffer(out.body), ["airQuality"]).airQuality.index, 52);
    }
});

test('upstream scale request category preserves Apple-first result and local fallback',async()=>{
 const u='https://weatherkit.apple.com/api/v2/airQualityScale/zh-Hans/EPA_NowCast.2604';
 for(const status of [200,404]){
  let calls=0;const result=await request({env:{},request:{url:u,headers:{Authorization:'synthetic-apple'}},http:{async get(url,options){calls++;assert.equal(url,u);assert.equal(options.headers.authorization,'synthetic-apple');return new Response('{"name":"Apple original"}',{status,headers:{'content-type':'application/json','x-original':'keep'}})}},respond:x=>x});
  assert.equal(calls,1);assert.equal(result.status,200);const j=JSON.parse(result.body);if(status===200){assert.equal(j.name,'Apple original');assert.equal(result.headers.get('x-original'),'keep');}else assert.equal(j.name,'EPA_NowCast');
 }
 let responded=false;assert.equal(await request({env:{},request:{url:u,headers:{}},http:{async get(){throw Error('offline')}},respond(){responded=true}}),undefined);assert.equal(responded,false);
});
