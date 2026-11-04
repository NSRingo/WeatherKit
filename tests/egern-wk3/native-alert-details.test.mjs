import test from "node:test";
import assert from "node:assert/strict";
import WeatherAlerts from "../../src/egern/wk3/class/WeatherAlerts.mjs";
import { buildNativeAlertDetailsURL, resolveNativeAlertDetails, isNativeAlertDetailsID } from "../../src/egern/wk3/class/NativeAlertDetails.mjs";

// Synthetic public HTML and UUID bytes only; no Apple sessions or coordinates.
const identifier = "synthetic-101010100";
const issuedTime = Date.parse("2030-01-01T00:00:00Z") / 1000;
const uuid = "00010203-0405-0607-0809-0a0b0c0d0e0f";
function alert(description = "大风", seed = 0, extra = {}) {
    return { id: { bytes: Array.from({ length: 16 }, (_, i) => i + seed) }, description, issuedTime, severity: 4, ...extra };
}
function block(title = "大风蓝色预警", time = "2030-01-01T08:00:00+08:00", color = "blue") {
    return `<div class="c-city-warning-events warning--${color}"><h3>测试区气象台发布${title}</h3><p>发布日期：${time}</p><p class="warning-events__txt">注意防范${title}。</p><div class="warning-defense__txt"><p>1. 停止高空作业。</p></div></div>`;
}
const htmlFetch = html => async () => new Response(html, { headers: { "content-type": "text/html" } });
function idsFor(alerts = [alert()], options = {}) {
    return new URL(buildNativeAlertDetailsURL({ identifier, alerts, ...options })).searchParams.get("ids");
}
function encodePayload(payload) {
    return "wk3_" + Buffer.from(JSON.stringify(payload)).toString("base64url");
}
function readPayload(ids) {
    return JSON.parse(Buffer.from(ids.slice(4), "base64url").toString("utf8"));
}
const validPayload = () => readPayload(idsFor());

test("native Apple page URL carries a minimal UTF-8 event mapping and optional timezone", () => {
    const original = alert("大风蓝色预警 🌬", 0, { latitude: 1, apiKey: "excluded", source: "excluded" });
    const before = structuredClone(original);
    const url = new URL(buildNativeAlertDetailsURL({ identifier, language: "zh-Hans", alerts: [original], timezone: "Asia/Shanghai" }));
    assert.equal(url.origin, "https://weatherkit.apple.com");
    assert.equal(url.pathname, "/alertDetails/index.html");
    assert.equal(url.searchParams.get("party"), "qweather");
    assert.equal(url.searchParams.get("lang"), "zh-Hans");
    assert.equal(url.searchParams.get("timezone"), "Asia/Shanghai");
    const ids = url.searchParams.get("ids");
    assert.match(ids, /^wk3_[A-Za-z0-9_-]+$/);
    assert.deepEqual(readPayload(ids), { region: identifier, alerts: [{ id: uuid, description: original.description, issuedTime, severity: 4 }] });
    assert.deepEqual(original, before);
    assert.equal(new URL(buildNativeAlertDetailsURL({ identifier, alerts: [alert()] })).searchParams.has("timezone"), false);
    assert.equal(isNativeAlertDetailsID("wk3_!"), true);
    assert.equal(isNativeAlertDetailsID(identifier), false);
    assert.equal(isNativeAlertDetailsID(null), false);
});

test("single event keeps every REST field, Apple UUID and fragment with matching message language", async () => {
    const fetchImpl = htmlFetch(block());
    const source = await WeatherAlerts.DetailsForQWeather(identifier, "zh-Hans", fetchImpl);
    const result = await resolveNativeAlertDetails(idsFor(), "zh-Hans", fetchImpl);
    assert.notEqual(source[0].id, uuid);
    assert.deepEqual(result, [{ ...source[0], id: uuid, detailsUrl: `#${uuid}` }]);
    assert.equal(result[0].description, "大风蓝色预警");
    assert.equal(result[0].severity, "minor");
    assert.equal(result[0].effectiveTime, "2030-01-01T00:00:00.000Z");
    assert.equal(result[0].source, "测试区气象台");
    assert.ok(result[0].messages.length);
    assert.ok(result[0].messages.every(message => message.language === "zh-Hans"));
    assert.equal(result[0].name, "WeatherAlert");
    assert.equal(result[0].responses[0], "monitor");
});

test("multiple events match by title and issuance across source reorder, excluding unrequested events", async () => {
    const originals = [alert(), alert("暴雨蓝色预警", 16), alert("大风", 32, { issuedTime: issuedTime + 3600 })];
    const fetchImpl = htmlFetch(block("大风蓝色预警", "2030-01-01T09:00:00+08:00") + block("雷电蓝色预警") + block("暴雨蓝色预警") + block());
    const result = await resolveNativeAlertDetails(idsFor(originals), "zh-CN", fetchImpl);
    assert.deepEqual(result.map(item => item.id), readPayload(idsFor(originals)).alerts.map(item => item.id));
    assert.deepEqual(result.map(item => item.description), ["大风蓝色预警", "暴雨蓝色预警", "大风蓝色预警"]);
    assert.deepEqual(result.map(item => Date.parse(item.issuedTime) / 1000), [issuedTime, issuedTime, issuedTime + 3600]);
    assert.ok(result.every(item => item.detailsUrl === `#${item.id}`));
});

test("missing, expired, different issuance, unrelated substring and severity never fall back by index", async () => {
    for (const html of ["", block("暴雨蓝色预警"), block("雷暴大风蓝色预警"), block("大风蓝色预警", "2030-01-01T08:01:00+08:00"), block("大风黄色预警", undefined, "yellow")]) {
        await assert.rejects(resolveNativeAlertDetails(idsFor(), "zh-CN", htmlFetch(html)), /Missing or ambiguous/);
    }
    await assert.rejects(resolveNativeAlertDetails(idsFor([alert("大风黄色预警")]), "zh-CN", htmlFetch(block())), /Missing or ambiguous/);
    // A full title's exact event name is accepted; a prefix is not a match.
    await assert.rejects(resolveNativeAlertDetails(idsFor([alert("风")]), "zh-CN", htmlFetch(block())), /Missing or ambiguous/);
});

test("ambiguity is atomic: duplicate source or two originals sharing a candidate fails", async () => {
    await assert.rejects(resolveNativeAlertDetails(idsFor(), "zh-CN", htmlFetch(block() + block())), /ambiguous/);
    await assert.rejects(resolveNativeAlertDetails(idsFor([alert(), alert("大风蓝色预警", 16)]), "zh-CN", htmlFetch(block())), /Ambiguous shared/);
    await assert.rejects(resolveNativeAlertDetails(idsFor([alert(), alert("暴雨", 16)]), "zh-CN", htmlFetch(block())), /Missing or ambiguous/);
});

test("source failures propagate and only fixed public QWeather requests receive fetch", async () => {
    await assert.rejects(resolveNativeAlertDetails(idsFor(), "zh-CN", async () => { throw new Error("offline"); }), /offline/);
    for (const response of [new Response("no", { status: 503 }), new Response("{}", { headers: { "content-type": "application/json" } })]) {
        await assert.rejects(resolveNativeAlertDetails(idsFor(), "zh-CN", async () => response));
    }
    await resolveNativeAlertDetails(idsFor(), "en-US", async (url, options) => {
        assert.equal(url, `https://www.qweather.com/en/severe-weather/${identifier}.html?from=AppleWeatherService`);
        assert.deepEqual(options, { redirect: "error", headers: { Accept: "text/html" } });
        return htmlFetch(block())();
    });
});

test("malformed payloads, SSRF regions and extra fields are rejected before any fetch", async () => {
    let calls = 0;
    const neverFetch = async () => { calls++; throw new Error("must not fetch"); };
    const malformed = [undefined, "", identifier, "wk3_", "wk3_!", "wk3_a", "wk3_e30=", "wk3__w", "wk3_" + "a".repeat(16384)];
    for (const mutate of [
        p => { p.region = "https://evil.invalid/a-101010100"; },
        p => { p.region = "../synthetic-101010100"; },
        p => { p.region = "synthetic-123"; },
        p => { p.region = "a".repeat(129) + "-101010100"; },
        p => { p.alerts = []; },
        p => { p.alerts = Array.from({ length: 33 }, () => p.alerts[0]); },
        p => { p.alerts.push({ ...p.alerts[0] }); },
        p => { p.alerts[0].id = "not-a-uuid"; },
        p => { p.alerts[0].id = uuid.toUpperCase(); },
        p => { p.alerts[0].description = " "; },
        p => { p.alerts[0].description = "x".repeat(513); },
        p => { p.alerts[0].issuedTime = 0; },
        p => { p.alerts[0].issuedTime = "2030-01-01T00:00:00Z"; },
        p => { p.alerts[0].issuedTime = 1.5; },
        p => { p.alerts[0].issuedTime = 0x100000000; },
        p => { p.alerts[0].severity = "minor"; },
        p => { p.alerts[0].severity = 256; },
        p => { delete p.alerts[0].description; },
        p => { p.latitude = 1; },
        p => { p.alerts[0].authorization = "excluded"; },
    ]) {
        const payload = validPayload(); mutate(payload); malformed.push(encodePayload(payload));
    }
    malformed.push(encodePayload(null), encodePayload([]));
    malformed.push("wk3_" + Buffer.from("not JSON").toString("base64url"));
    // Noncanonical unused base64 bits decode to valid JSON, but are rejected.
    const emptyObject = Buffer.from("{}").toString("base64url");
    malformed.push("wk3_" + emptyObject.slice(0, -1) + "1");
    for (const ids of malformed) await assert.rejects(resolveNativeAlertDetails(ids, "zh-CN", neverFetch));
    await assert.rejects(resolveNativeAlertDetails(idsFor(), "en?bad", neverFetch), /language/);
    assert.equal(calls, 0);
});

test("builder validates UUID bytes, region, count, field size, locale and timezone", () => {
    const build = options => buildNativeAlertDetailsURL({ identifier, alerts: [alert()], ...options });
    for (const bytes of [[], Array(16).fill(-1), Array(16).fill(256), Array(16).fill(1.5), Array(16).fill("1"), Array(16)]) {
        assert.throws(() => build({ alerts: [alert("大风", 0, { id: { bytes } })] }), /UUID/);
    }
    assert.doesNotThrow(() => build({ alerts: [alert("大风", 0, { id: { bytes: new Uint8Array(16) } })] }));
    for (const options of [
        { identifier: "https://evil.invalid" }, { alerts: [] }, { alerts: null },
        { alerts: [alert(), alert()] }, { alerts: [alert("x".repeat(513))] },
        { alerts: [alert("大风", 0, { issuedTime: 0 })] },
        { language: "zh-CN&ids=other" }, { timezone: "Asia/Shanghai?x=1" }, { timezone: 1 },
    ]) assert.throws(() => build(options));
    assert.throws(() => build({ alerts: Array.from({ length: 32 }, (_, i) => alert("风".repeat(500), i)) }), /too long/);
});

test("unverified WK3 severity integers are never guessed or added to the wire mapping", async () => {
    for (const severity of [0, 1, 2, 5, 231]) {
        await assert.rejects(resolveNativeAlertDetails(idsFor([alert("大风", 0, { severity })]), "zh-CN", async () => { assert.fail("must not fetch"); }), /Unverified WK3 severity/);
    }
});

test('paired MODERATE=3 supports reordered yellow/yellow and yellow/blue event groups', async()=>{
 for(const originals of [[alert('寒潮黄色预警',0,{severity:3}),alert('大风蓝色预警',16)], [alert('大风',0,{severity:3}),alert('寒潮',16,{severity:3})]]){
  const page=originals.slice().reverse().map(a=>block(a.description.includes('寒潮')?'寒潮黄色预警':a.severity===3?'大风黄色预警':'大风蓝色预警',undefined,a.severity===3?'yellow':'blue')).join('');
  const result=await resolveNativeAlertDetails(idsFor(originals),'zh-CN',htmlFetch(page));
  assert.deepEqual(result.map(a=>a.severity),originals.map(a=>a.severity===3?'moderate':'minor'));
  assert.deepEqual(result.map(a=>a.id),readPayload(idsFor(originals)).alerts.map(a=>a.id));
  assert.ok(result.every(a=>a.messages.length&&a.detailsUrl==='#'+a.id));
 }
});
