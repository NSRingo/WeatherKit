import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { Builder } from "flatbuffers";
import { buildEgern } from "../scripts/build-egern.mjs";
import { buildPlatform } from "../scripts/build-wk3-platform.mjs";
import { decodeWK3Alerts, patchWK3QWeatherAlerts } from "../src/wk3/class/WK3Alerts.mjs";
import { sameAlertTitle, resolveNativeAlertDetails, buildNativeAlertDetailsURL } from "../src/wk3/class/NativeAlertDetails.mjs";

const issued = Date.parse("2030-01-01T00:00:00Z") / 1000;
const pageURL = "https://www.qweather.com/severe-weather/synthetic-101010100.html?from=AppleWeatherService";
const blue = { title: "大风", severity: 4, color: "蓝" };
const yellow = { title: "寒潮", severity: 3, color: "黄" };
const orange = { title: "暴雪", severity: 2, color: "橙" }; // Upstream @nsringo/weatherkit 2.0.5 Severity.
function fixture(events) {
    const b = new Builder(), details = b.createString(pageURL);
    const offsets = events.map((event, index) => {
        const description = b.createString(event.title), source = b.createString("国家预警信息发布中心");
        b.startVector(1, 16, 1);
        for (let i = 15; i >= 0; i--) b.addInt8(index * 16 + i);
        const bytes = b.endVector();
        b.startObject(1); b.addFieldOffset(0, bytes, 0); const id = b.endObject();
        b.startObject(event.unknown ? 23 : 22);
        b.addFieldOffset(0, id, 0); b.addFieldOffset(5, description, 0); b.addFieldOffset(12, details, 0);
        b.addFieldOffset(16, source, 0); b.addFieldInt32(9, event.time ?? issued, 0); b.addFieldInt8(14, event.severity, 0);
        if (event.unknown) b.addFieldInt32(22, 42, 0);
        return b.endObject();
    });
    b.startVector(4, offsets.length, 4);
    for (const offset of [...offsets].reverse()) b.addOffset(offset);
    const alerts = b.endVector();
    b.startObject(3); b.addFieldOffset(1, details, 0); b.addFieldOffset(2, alerts, 0); const collection = b.endObject();
    b.startObject(10); b.addFieldOffset(9, collection, 0); b.finish(b.endObject()); return b.asUint8Array();
}
function html(events) {
    return events.map(event => `<div class="c-city-warning-events warning--${{ 蓝: "blue", 黄: "yellow", 橙: "orange", 红: "red" }[event.color]}"><h3>测试区气象台发布${event.title}${event.color}色预警</h3><p>发布日期：${new Date((event.time ?? issued) * 1000).toISOString()}</p><p class="warning-events__txt">测试正文。</p></div>`).join("");
}
const fetchPage = events => async () => new Response(html(events), { headers: { "Content-Type": "text/html" } });
const cases = [
    { name: "signal suffix", events: [{ ...blue, title: " 大风预警信号。 " }], page: [blue], updated: 1, native: true },
    { name: "reordered yellow and blue", events: [blue, yellow], page: [yellow, blue], updated: 2, native: true },
    { name: "time differs by one second", events: [blue, yellow], page: [blue, { ...yellow, time: issued + 1 }], updated: 1, native: false, reason: "issued-time-mismatch" },
    { name: "missing second event", events: [blue, yellow], page: [blue], updated: 1, native: false, reason: "title-mismatch" },
    { name: "orange and blue", events: [blue, orange], page: [orange, blue], updated: 2, native: true },
    { name: "red highway and yellow road ice", events: [{ title: "高速公路灾害性天气预警", severity: 1, color: "红" }, { title: "道路结冰", severity: 3, color: "黄" }], page: [{ title: "道路结冰", severity: 3, color: "黄" }, { title: "高速公路灾害性天气预警", severity: 1, color: "红" }], updated: 2, native: true },
    { name: "generic red highway and named road ice", events: [{ title: "恶劣天气", severity: 1 }, { title: "道路结冰", severity: 3 }], page: [{ title: "道路结冰", severity: 3, color: "黄" }, { title: "高速公路灾害性天气预警", severity: 1, color: "红" }], updated: 2, native: true },
    { name: "generic severity mismatch", events: [{ title: "恶劣天气", severity: 1 }], page: [blue], updated: 0, native: false, reason: "severity-mismatch" },
    { name: "generic requires exact time", events: [{ title: "恶劣天气", severity: 1 }], page: [{ title: "暴雨", severity: 1, color: "红", time: issued + 1 }], updated: 0, native: false, reason: "issued-time-mismatch" },
    { name: "generic requires nonzero Apple time", events: [{ title: "恶劣天气", severity: 1, time: 0 }], page: [{ title: "暴雨", severity: 1, color: "红" }], updated: 0, native: false, reason: "missing-issued-time" },
    { name: "generic does not choose by order", events: [{ title: "恶劣天气", severity: 1 }], page: [{ title: "暴雨", severity: 1, color: "红" }, { title: "高速公路灾害性天气预警", severity: 1, color: "红" }], updated: 0, native: false, reason: "ambiguous-match" },
    { name: "two generic alerts cannot share candidate", events: [{ title: "恶劣天气", severity: 1 }, { title: "恶劣天气", severity: 1 }], page: [{ title: "暴雨", severity: 1, color: "红" }], updated: 1, native: false, reason: "ambiguous-match" },
    { name: "unknown severity", events: [{ ...blue, severity: 231 }], page: [blue], updated: 0, native: false, reason: "unverified-severity" },
    { name: "unrelated substring", events: [blue], page: [{ ...blue, title: "雷暴大风" }], updated: 0, native: false, reason: "title-mismatch" },
    { name: "duplicate candidate", events: [blue], page: [blue, blue], updated: 0, native: false, reason: "ambiguous-match" },
    { name: "shared candidate", events: [blue, { ...blue, title: "大风蓝色预警信号" }], page: [blue], updated: 1, native: false, reason: "ambiguous-match" },
    { name: "unverified summary field", events: [{ ...blue, unknown: true }], page: [blue], updated: 0, native: false, stage: "summary-patch-failed" },
];

test("one title normalizer accepts suffix, whitespace and punctuation but rejects unrelated events and colors", () => {
    for (const title of ["大风", "大风预警", "大风预警信号", " 大 风 蓝色预警信号。 "]) assert.equal(sameAlertTitle(title, "大风蓝色预警"), true);
    for (const title of ["雷暴大风", "风", "大风黄色预警", "", null]) assert.equal(sameAlertTitle(title, "大风蓝色预警"), false);
    assert.equal(sameAlertTitle("Ｗｉｎｄ", "wind"), true);
    assert.equal(sameAlertTitle("高速公路灾害性天气预警", "高速公路灾害性天气预警红色预警信号"), true);
    assert.equal(sameAlertTitle("高速公路灾害性天气", "高速公路灾害性天气预警红色预警"), true);
    assert.equal(sameAlertTitle("高速公路灾害性天气预警黄色预警", "高速公路灾害性天气预警红色预警"), false);
});

test("summary report describes only committed changes and retains every matching safeguard", async () => {
    for (const scenario of cases) {
        const raw = fixture(scenario.events), report = {};
        const out = await patchWK3QWeatherAlerts(raw, { fetchImpl: fetchPage(scenario.page), rewriteDetails: true, report });
        assert.equal(report.summariesUpdated, scenario.updated, scenario.name);
        assert.equal(report.detailsConverted, scenario.native, scenario.name);
        assert.equal(new URL(decodeWK3Alerts(out).detailsUrl).hostname, scenario.native ? "weatherkit.apple.com" : "www.qweather.com", scenario.name);
        if (scenario.reason) assert.equal(report.unmatched[scenario.reason], 1, scenario.name);
        if (scenario.reason === "title-mismatch") {
            assert.deepEqual(Object.keys(report.titleMismatches[0]), ["appleTitle", "pageTitles", "parsedTitles"]);
            assert.ok(report.titleMismatches[0].appleTitle);
            assert.ok(report.titleMismatches[0].pageTitles[0].startsWith("测试区气象台发布"));
            assert.equal(report.titleMismatches[0].parsedTitles.length, scenario.page.length);
        } else assert.deepEqual(report.titleMismatches, []);
        if (scenario.stage) { assert.equal(report.reason, scenario.stage); assert.strictEqual(out, raw); }
    }
    const report = {}, raw = fixture([blue]);
    assert.strictEqual(await patchWK3QWeatherAlerts(raw, { report, fetchImpl: async () => { throw new Error("offline"); }, rewriteDetails: true }), raw);
    assert.equal(report.reason, "page-fetch-failed");
    assert.equal(report.summariesUpdated, 0); assert.equal(report.detailsConverted, false);
});

async function executePlatform(code, platform, raw, page, stage = "response", url = "https://weatherkit.apple.com/api/v3/weather/zh-CN/31/121?country=CN&dataSets=weatherAlerts") {
    const logs = [], requests = [];
    const logger = Object.fromEntries(["log", "info", "debug", "warn", "error"].map(key => [key, (...args) => logs.push(args.join(" "))]));
    const fetch = async (requestURL, options) => {
        assert.equal(String(requestURL), pageURL);
        assert.deepEqual(Object.keys(options.headers).map(key => key.toLowerCase()), ["accept"]);
        requests.push(requestURL);
        return new Response(html(page), { headers: { "Content-Type": "text/html" } });
    };
    const headers = { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" };
    let result;
    if (platform === "egern") {
        const transformed = code.replace("export default async function(ctx)", "globalThis.run = async function(ctx)");
        const context = { URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Headers, btoa, atob, console: logger };
        vm.createContext(context); vm.runInContext(transformed, context, { timeout: 30000 });
        result = await context.run({ env: { DataSets: "weatherAlerts", LogLevel: "INFO" }, request: { url, method: "GET", headers: new Headers() }, response: { status: 200, headers: new Headers(headers), arrayBuffer: async () => raw.slice().buffer }, http: { get: fetch }, respond: value => value });
    } else {
        let finish;
        const complete = new Promise(resolve => { finish = resolve; });
        const globals = { URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, console: logger,
            $argument: { DataSets: ["weatherAlerts"], LogLevel: "INFO" },
            $request: { url, method: "GET", headers: {} },
            $response: stage === "response" ? { status: 200, headers, body: raw } : undefined,
            $done: finish };
        if (platform === "quantumultx") globals.$task = { fetch: async options => { const r = await fetch(options.url, options); return { statusCode: r.status, headers: Object.fromEntries(r.headers), body: await r.text() }; } };
        else globals.$httpClient = { get(options, callback) { fetch(options.url, options).then(async r => callback(null, { status: r.status, headers: Object.fromEntries(r.headers) }, await r.text())); } };
        vm.runInNewContext(code, globals, { timeout: 30000 });
        let timer;
        try { result = await Promise.race([complete, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("platform completion timeout")), 5000); })]); }
        finally { clearTimeout(timer); }
        if (stage === "request" && platform !== "quantumultx") result = result?.response;
    }
    return { result, logs, requests };
}

for (const platform of ["egern", "surge", "loon", "stash", "quantumultx"]) {
    test(`${platform}: built scripts normalize titles and log summary and native conversion independently`, async () => {
        const outdir = process.env.WK3_TEST_OUTDIR ? `${process.env.WK3_TEST_OUTDIR}/${platform}` : undefined;
        const bundles = process.env.WK3_TEST_BUNDLE_DIR
            ? Object.fromEntries(await Promise.all(["request", "response"].map(async stage => [stage, { code: await readFile(`${process.env.WK3_TEST_BUNDLE_DIR}/${platform}/wk3-${platform}-${stage}.bundle.js`, "utf8") }])))
            : platform === "egern" ? await buildEgern({ outdir, filePrefix: "wk3-egern-" }) : await buildPlatform(platform, { outdir });
        if (platform !== "egern") {
            const url = new URL(buildNativeAlertDetailsURL({ identifier: "synthetic-101010100", alerts: [{ id: { bytes: Array.from({ length: 16 }, (_, i) => i) }, description: " 大风预警信号。 ", issuedTime: issued, severity: 4 }] }));
            const requestURL = `https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=${url.searchParams.get("ids")}`;
            const detail = await executePlatform(bundles.request.code, platform, fixture([blue]), [blue], "request", requestURL);
            const parsed = JSON.parse(detail.result.body);
            assert.equal(parsed.length, 1);
            assert.equal(parsed[0].id, "00010203-0405-0607-0809-0a0b0c0d0e0f");
            assert.equal(parsed[0].description, "大风蓝色预警");
        }
        for (const scenario of cases) {
            const raw = fixture(scenario.events);
            const { result, logs, requests } = await executePlatform(bundles.response.code, platform, raw, scenario.page);
            if (platform === "quantumultx") {
                assert.equal(result, undefined); assert.equal(requests.length, 0);
                assert.equal(logs.some(line => line.includes("WK3 alerts summary") || line.includes("WK3 alerts details")), false);
                continue;
            }
            const bytes = typeof result.body === "string" ? Uint8Array.from(result.body, c => c.charCodeAt(0)) : result.body;
            const after = decodeWK3Alerts(bytes);
            assert.equal(new URL(after.detailsUrl).hostname, scenario.native ? "weatherkit.apple.com" : "www.qweather.com", scenario.name);
            const summaryLogs = logs.filter(line => line.includes("WK3 alerts summary"));
            const detailLogs = logs.filter(line => line.includes("WK3 alerts details"));
            assert.equal(summaryLogs.length, 1); assert.equal(detailLogs.length, 1);
            assert.ok(summaryLogs[0].includes(`摘要补全：${scenario.updated}/${scenario.events.length}`), scenario.name);
            assert.ok(detailLogs[0].includes(scenario.native ? "已切换苹果原生详情" : "未转换，保留原链接"), scenario.name);
            if (scenario.reason) assert.ok(detailLogs[0].includes(scenario.reason), scenario.name);
            const titleLogs = logs.filter(line => line.includes("WK3 alerts titles"));
            assert.equal(titleLogs.length, scenario.reason === "title-mismatch" ? 1 : 0, scenario.name);
            if (titleLogs.length) {
                assert.ok(titleLogs[0].includes('"appleTitle"'));
                assert.ok(titleLogs[0].includes('"pageTitles"'));
                assert.ok(titleLogs[0].includes('"parsedTitles"'));
                assert.ok(!titleLogs[0].includes(pageURL));
                assert.ok(!titleLogs[0].includes("issuedTime"));
            }
            if (scenario.native) {
                const native = new URL(after.detailsUrl);
                const details = await resolveNativeAlertDetails(native.searchParams.get("ids"), "zh-CN", fetchPage(scenario.page));
                assert.equal(details.length, scenario.events.length);
                if (scenario.name === "generic red highway and named road ice") {
                    assert.equal(after.alerts[0].description, "高速公路灾害性天气预警红色预警");
                    const payload = JSON.parse(Buffer.from(native.searchParams.get("ids").slice(4), "base64url").toString("utf8"));
                    assert.equal(payload.alerts[0].description, after.alerts[0].description);
                    const requestURL = `https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=${native.searchParams.get("ids")}`;
                    const resolved = await executePlatform(bundles.request.code, platform, raw, scenario.page, "request", requestURL);
                    assert.deepEqual(JSON.parse(resolved.result.body), details);
                }
                assert.deepEqual(details.map(item => item.id), scenario.events.map((_, i) => {
                    const h = Array.from({ length: 16 }, (_, j) => (i * 16 + j).toString(16).padStart(2, "0")).join("");
                    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
                }));
            }
        }
    });
}
