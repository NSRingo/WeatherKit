import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { Builder } from "flatbuffers";
import { buildPlatform } from "../scripts/build-wk3-platform.mjs";
import { readAlertHeader, encodeAlertBase64, decodeAlertBase64 } from "../src/platform/wk3-alert-compat.mjs";
import { buildNativeAlertDetailsURL } from "../src/wk3/class/NativeAlertDetails.mjs";
import { decodeWK3Alerts } from "../src/wk3/class/WK3Alerts.mjs";

const identifier = "synthetic-101010100";
const issuedTime = Date.parse("2030-01-01T00:00:00Z") / 1000;
const uuid = "00010203-0405-0607-0809-0a0b0c0d0e0f";
const original = { id: { bytes: Array.from({ length: 16 }, (_, i) => i) }, description: "大风", issuedTime, severity: 4 };
const html = '<div class="c-city-warning-events warning--blue"><h3>测试区气象台发布大风蓝色预警</h3><p>发布日期：2030-01-01T08:00:00+08:00</p><p class="warning-events__txt">注意防范大风。</p></div>';
const nativeURL = () => new URL(buildNativeAlertDetailsURL({ identifier, alerts: [original] }));
const detailsURL = ids => `https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=${ids}`;

function fixture() {
    const b = new Builder();
    const details = b.createString(`https://www.qweather.com/severe-weather/${identifier}.html?from=AppleWeatherService`);
    const description = b.createString(original.description);
    b.startVector(1, 16, 1);
    for (let i = 15; i >= 0; i--) b.addInt8(i);
    const bytes = b.endVector();
    b.startObject(1); b.addFieldOffset(0, bytes, 0); const id = b.endObject();
    b.startObject(22);
    b.addFieldOffset(0, id, 0); b.addFieldOffset(5, description, 0); b.addFieldOffset(12, details, 0);
    b.addFieldInt32(9, issuedTime, 0); b.addFieldInt8(14, 4, 0);
    const alert = b.endObject();
    b.startVector(4, 1, 4); b.addOffset(alert); const alerts = b.endVector();
    b.startObject(3); b.addFieldOffset(1, details, 0); b.addFieldOffset(2, alerts, 0); const collection = b.endObject();
    b.startObject(10); b.addFieldOffset(9, collection, 0); b.finish(b.endObject());
    return b.asUint8Array();
}

async function execute(code, platform, url, { stage = "request", header = "Content-Type", contentType = "text/html" } = {}) {
    const requests = [];
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    const globals = {
        URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
        console: { log() {}, info() {}, debug() {}, warn() {}, error() {} },
        $argument: { DataSets: ["weatherAlerts"] },
        $request: { url, method: "GET", headers: {} },
        $response: stage === "response" ? { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, body: fixture() } : undefined,
        $done: finish,
    };
    const fetch = options => {
        requests.push(options);
        assert.equal(options.url, `https://www.qweather.com/severe-weather/${identifier}.html?from=AppleWeatherService`);
        assert.deepEqual(Object.keys(options.headers), ["accept"]);
        assert.equal(options.headers.accept, "text/html");
        return { status: 200, headers: { [header]: contentType }, body: html };
    };
    if (platform === "quantumultx") globals.$task = { fetch: async options => ({ ...fetch(options), statusCode: 200 }) };
    else globals.$httpClient = { get(options, callback) { const response = fetch(options); callback(null, response, response.body); } };
    assert.equal("btoa" in globals, false);
    assert.equal("atob" in globals, false);
    vm.runInNewContext(code, globals, { timeout: 30000 });
    const timer = setTimeout(() => finish({ timeout: true }), 5000);
    try {
        const result = await completed;
        assert.ok(!result?.timeout, "platform completed");
        return { result: platform !== "quantumultx" && stage === "request" ? result?.response : result, requests };
    } finally { clearTimeout(timer); }
}

test("platform alert helpers cover case-insensitive headers and all base64 byte/padding boundaries", () => {
    for (const key of ["content-type", "Content-Type", "CONTENT-TYPE", "cOnTeNt-TyPe"]) assert.equal(readAlertHeader({ [key]: "text/html" }, "content-type"), "text/html");
    assert.equal(readAlertHeader(new Headers({ "Content-Type": "text/html" }), "content-type"), "text/html");
    assert.equal(readAlertHeader(undefined, "content-type"), undefined);
    for (const length of [0, 1, 2, 3, 4, 255, 256, 257, 11998, 11999, 12000]) {
        const bytes = Uint8Array.from({ length }, (_, i) => i & 255);
        const encoded = encodeAlertBase64(bytes);
        assert.equal(encoded, Buffer.from(bytes).toString("base64"));
        assert.equal(decodeAlertBase64(encoded), Buffer.from(bytes).toString("latin1"));
    }
    for (const value of ["!", "a", "aa=", "====", "a==="]) assert.throws(() => decodeAlertBase64(value));
});

for (const platform of ["surge", "loon", "stash", "quantumultx"]) {
    test(`${platform}: minified alerts accept plain Content-Type without host base64 and retain native UUID roundtrip`, async () => {
        const bundles = await buildPlatform(platform, { outdir: process.env.WK3_TEST_OUTDIR ? `${process.env.WK3_TEST_OUTDIR}/${platform}` : undefined });
        for (const stage of ["request", "response"]) assert.doesNotMatch(bundles[stage].code, /\b(?:btoa|atob)\b/);
        let url = nativeURL();
        const response = await execute(bundles.response.code, platform, "https://weatherkit.apple.com/api/v3/weather/zh-CN/31/121?country=CN&dataSets=weatherAlerts", { stage: "response" });
        if (platform === "quantumultx") {
            assert.equal(response.result, undefined, "existing Quantumult X binary pass-through is retained");
            assert.equal(response.requests.length, 0);
        } else {
            assert.equal(response.requests.length, 1);
            const bytes = typeof response.result.body === "string" ? Uint8Array.from(response.result.body, c => c.charCodeAt(0)) : response.result.body;
            const patched = decodeWK3Alerts(bytes);
            assert.equal(patched.alerts[0].description, "大风蓝色预警");
            assert.deepEqual(patched.alerts[0].id, original.id);
            url = new URL(patched.detailsUrl);
            assert.equal(url.origin, "https://weatherkit.apple.com");
            assert.equal(patched.alerts[0].detailsUrl, url.toString());
            assert.equal(url.searchParams.get("ids"), new URL(buildNativeAlertDetailsURL({ identifier, alerts: [{ ...original, description: "大风蓝色预警" }] })).searchParams.get("ids"));
        }
        const ids = url.searchParams.get("ids");
        for (const header of ["Content-Type", "content-type", "cOnTeNt-TyPe"]) {
            const { result, requests } = await execute(bundles.request.code, platform, detailsURL(ids), { header });
            assert.equal(requests.length, 1);
            const details = JSON.parse(result.body);
            assert.equal(details.length, 1);
            assert.equal(details[0].id, uuid);
            assert.equal(details[0].detailsUrl, `#${uuid}`);
            assert.equal(details[0].description, "大风蓝色预警");
            assert.equal(details[0].severity, "minor");
            assert.equal(details[0].issuedTime, "2030-01-01T00:00:00.000Z");
            assert.match(details[0].messages[0].text, /注意防范/);
        }
        const region = await execute(bundles.request.code, platform, detailsURL(identifier));
        assert.equal(JSON.parse(region.result.body).length, 1);
        const wrongType = await execute(bundles.request.code, platform, detailsURL(ids), { contentType: "application/json" });
        assert.deepEqual(JSON.parse(wrongType.result.body), []);
        const payload = JSON.parse(Buffer.from(ids.slice(4), "base64url"));
        const invalidShape = "wk3_" + Buffer.from(JSON.stringify({ ...payload, extra: true })).toString("base64url");
        // Valid JSON with noncanonical unused bits must still fail before HTTP.
        const noncanonical = "wk3_" + Buffer.from("{}").toString("base64url").slice(0, -1) + "1";
        for (const malformed of ["wk3_!", "wk3_a", "wk3__w", ids + "=", invalidShape, noncanonical]) {
            const rejected = await execute(bundles.request.code, platform, detailsURL(malformed));
            assert.deepEqual(JSON.parse(rejected.result.body), []);
            assert.equal(rejected.requests.length, 0);
        }
    });
}
