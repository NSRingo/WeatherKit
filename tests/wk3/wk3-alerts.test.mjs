import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { decodeWK3Alerts, patchWK3Alerts, enrichWK3Alerts, patchWK3QWeatherAlerts, WK3_ALERT_ENUMS, WK3AlertsTable, wk3AlertsCodec } from "../../src/wk3/class/WK3Alerts.mjs";
import WeatherAlerts from "../../src/wk3/class/WeatherAlerts.mjs";

// All fixtures synthetic. No HAR, Apple response bytes, credentials or real location.
const html = `<h1 class="c-submenu__location">测试区</h1><div class="c-city-warning-events warning--blue"><h3>测试区气象台发布大风蓝色预警</h3><p>发布日期：2030-01-01T08:00+08:00</p><p class="warning-events__txt">注意防范大风。</p><div class="warning-defense__txt"><p>1. 停止高空作业。</p></div></div>`;
const issued = Date.parse("2030-01-01T00:00:00Z") / 1000;
function fixture({ unknown = false, missing = false, empty = false, rawSeverity = 4 } = {}) {
    const b = new Builder();
    const aq = b.createString("AQ-UNKNOWN-PRESERVE"), future = b.createString("FUTURE-WEATHER-PRESERVE");
    const details = b.createString("https://www.qweather.com/severe-weather/test-101010100.html?from=AppleWeatherService");
    const description = b.createString("大风"), source = b.createString("国家预警信息发布中心");
    b.startVector(1, 16, 1); for (let i = 15; i >= 0; i--) b.addInt8(i); const idbytes = b.endVector();
    b.startObject(1); b.addFieldOffset(0, idbytes, 0); const id = b.endObject();
    b.startVector(1, 1, 1); b.addInt8(7); const responses = b.endVector();
    b.startObject(unknown ? 23 : 22); b.addFieldOffset(0, id, 0); b.addFieldOffset(5, description, 0); b.addFieldOffset(16, source, 0);
    b.addFieldOffset(12, details, 0); b.addFieldInt8(14, rawSeverity, 0); b.addFieldOffset(21, responses, 0); b.addFieldInt32(9, issued, 0);
    if (unknown) b.addFieldInt32(22, 123456, 0); const alert = b.endObject();
    b.startVector(4, empty ? 0 : 1, 4); if (!empty) b.addOffset(alert); const alerts = b.endVector();
    b.startObject(4); b.addFieldOffset(1, details, 0); b.addFieldOffset(2, alerts, 0); b.addFieldInt32(3, 987654, 0); const collection = b.endObject();
    b.startObject(18); b.addFieldOffset(0, aq, 0); b.addFieldOffset(17, future, 0); if (!missing) b.addFieldOffset(9, collection, 0);
    b.finish(b.endObject()); return b.asUint8Array();
}
function alertVectorPointer(bytes) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), col = bb.__indirect(root + bb.__offset(root, 22));
    return bb.__vector(col + bb.__offset(col, 8));
}
const fetchPage = async () => new Response(html, { headers: { "Content-Type": "text/html" } });
test("observed WK3 enums are explicit, not WK2 arithmetic", () => {
    assert.equal(WK3_ALERT_ENUMS.severity.MINOR, 4); assert.equal(WK3_ALERT_ENUMS.significance.STATEMENT, 10);
    assert.equal(WK3_ALERT_ENUMS.responses.MONITOR, 7);
    assert.equal(WK3_ALERT_ENUMS.severity.SEVERE, 2); assert.equal(WK3_ALERT_ENUMS.severity.EXTREME, 1);
    const d = decodeWK3Alerts(fixture({ rawSeverity: 231 })); assert.equal(d.alerts[0].severity, 231);
    assert.deepEqual(d.alerts[0].responses, [7]); assert.deepEqual(d.alerts[0].id.bytes, Array.from({ length: 16 }, (_, i) => i));
});
test("patch only changes vector pointer and appends child; entire weather survives", () => {
    const bytes = fixture(), snapshot = bytes.slice(), d = decodeWK3Alerts(bytes), pointer = alertVectorPointer(bytes);
    const out = patchWK3Alerts(bytes, [{ ...d.alerts[0], description: "大风蓝色预警", eventEndTime: issued + 3600 }]);
    assert.deepEqual(bytes, snapshot); assert.ok(out.length > bytes.length);
    for (let i = 0; i < bytes.length; i++) if (i < pointer || i >= pointer + 4) assert.equal(out[i], bytes[i]);
    assert.equal(decodeWK3Alerts(out).alerts[0].description, "大风蓝色预警");
    assert.equal(decodeWK3Alerts(out).alerts[0].eventEndTime, issued + 3600);
});
test("no-op/missing/empty collections preserve original view", () => {
    const bytes = fixture(); assert.strictEqual(patchWK3Alerts(bytes, decodeWK3Alerts(bytes).alerts), bytes);
    const empty = fixture({ empty: true }); assert.strictEqual(patchWK3Alerts(empty, []), empty);
    assert.equal(decodeWK3Alerts(fixture({ missing: true })), null);
});
test("unknown summary fields and unsupported enum strings fail atomically", () => {
    const bytes = fixture({ unknown: true }), d = decodeWK3Alerts(bytes);
    assert.throws(() => patchWK3Alerts(bytes, [{ ...d.alerts[0], description: "changed" }]), /Unverified/);
    const b = fixture(), a = decodeWK3Alerts(b).alerts[0];
    assert.throws(() => patchWK3Alerts(b, [{ ...a, severity: "MINOR" }]), /wire integer/);
    assert.throws(() => patchWK3Alerts(b, [{ ...a, areaName: "unverified" }]), /Unverified/);
    assert.throws(() => patchWK3Alerts(b, []), /add\/remove/);
    assert.throws(() => patchWK3Alerts(b, [{ ...a, id: null }]), /identity/);
});
test("unobserved provider enum names are not injected", () => {
    const d = decodeWK3Alerts(fixture());
    const [a] = enrichWK3Alerts(d, [{ severity: "severe", urgency: "immediate", eventEndTime: "2030-01-02T00:00:00Z" }]);
    assert.equal(a.severity, 4); assert.equal(a.urgency, 0); assert.equal(a.eventEndTime, issued + 86400);
});
test("ByteBuffer positions, views and malformed offsets", () => {
    const bytes = fixture(), padded = new Uint8Array(bytes.length + 8); padded.set(bytes, 8);
    const bb = new ByteBuffer(padded); bb.setPosition(8);
    assert.deepEqual(decodeWK3Alerts(bb).alerts, decodeWK3Alerts(padded.subarray(8)).alerts);
    assert.throws(() => decodeWK3Alerts(new Uint8Array([255, 255, 255, 255])), /offset/);
});
test("codec embeds existing opaque collection arena without WK2 tables", () => {
    const bytes = fixture(), bb = new ByteBuffer(bytes), root = bb.readUint32(0), col = bb.__indirect(root + bb.__offset(root, 22));
    const d = wk3AlertsCodec.decode(new WK3AlertsTable().__init(col, bb)); d.alerts[0].description = "modified";
    const b = new Builder(); const offset = wk3AlertsCodec.encode(b, d); b.finish(offset);
    const out = b.asUint8Array(), childbb = new ByteBuffer(out);
    const reread = wk3AlertsCodec.decode(new WK3AlertsTable().__init(childbb.readUint32(0), childbb));
    assert.equal(reread.alerts[0].description, "modified");
    assert.throws(() => wk3AlertsCodec.encode(new Builder(), { alerts: [] }), /source arena/);
});
test("QWeather pure parser produces REST details with lowercase tokens", async () => {
    const alerts = await WeatherAlerts.DetailsForQWeather("test-101010100", "zh-CN", fetchPage);
    assert.equal(alerts[0].description, "大风蓝色预警"); assert.equal(alerts[0].source, "测试区气象台");
    assert.equal(alerts[0].severity, "minor"); assert.equal(alerts[0].effectiveTime, "2030-01-01T00:00:00.000Z");
    assert.match(alerts[0].messages.map(m => m.text).join("\n"), /注意防范/);
    assert.equal(alerts[0].name, "WeatherAlert"); assert.equal(alerts[0].detailsUrl, `#${alerts[0].id}`);
    assert.equal(WeatherAlerts.ParseWeatherAlertPageURL("https://evil.invalid/severe-weather/test-1.html?from=AppleWeatherService"), undefined);
    assert.throws(() => WeatherAlerts.BuildWeatherAlertPageURL("../evil"), /identifier/);
});
test("domestic enrichment matches event, severity, issuance; details rewrite opt-in", async () => {
    const bytes = fixture(), out = await patchWK3QWeatherAlerts(bytes, { fetchImpl: fetchPage });
    const d = decodeWK3Alerts(out); assert.equal(d.alerts[0].description, "大风蓝色预警");
    assert.equal(d.alerts[0].source, "测试区气象台"); assert.equal(d.detailsUrl, decodeWK3Alerts(bytes).detailsUrl);
    const rewrite = decodeWK3Alerts(await patchWK3QWeatherAlerts(bytes, { fetchImpl: fetchPage, rewriteDetails: true }));
    assert.equal(new URL(rewrite.detailsUrl).hostname, 'weatherkit.apple.com');
    assert.match(new URL(rewrite.detailsUrl).searchParams.get('ids'), /^wk3_/);
    assert.equal(rewrite.alerts[0].detailsUrl, rewrite.detailsUrl);
    assert.strictEqual(await patchWK3QWeatherAlerts(bytes, { fetchImpl: async () => { throw new Error("offline"); } }), bytes);
    assert.strictEqual(await patchWK3QWeatherAlerts(bytes, { fetchImpl: async () => new Response(html + html, { headers: { "Content-Type": "text/html" } }) }), bytes);
});
test("HTML fetch sends no Apple authorization and fails on status/content type", async () => {
    await WeatherAlerts.FetchWeatherAlertPage("test-101010100", "zh-CN", async (url, options) => {
        assert.ok(url.startsWith("https://www.qweather.com/")); assert.deepEqual(options.headers, { Accept: "text/html" });
        return fetchPage();
    });
    await assert.rejects(() => WeatherAlerts.FetchWeatherAlertPage("test-101010100", "zh-CN", async () => new Response("no", { status: 500 })), /unavailable/);
    await assert.rejects(() => WeatherAlerts.FetchWeatherAlertPage("test-101010100", "zh-CN", async () => new Response("{}", { headers: { "content-type": "application/json" } })), /HTML/);
});

test('production Response routes to Apple native details while preserving summary UUID', async()=>{
 const {Response:processResponse}=await import('../../src/wk3/process/Response.mjs');
 const {default:database}=await import('../../src/wk3/function/database.mjs');
 const {default:buildSettings}=await import('../../src/wk3/function/buildSettings.mjs');
 const saved=globalThis.fetch;globalThis.fetch=fetchPage;
 try{const bytes=fixture(),before=decodeWK3Alerts(bytes);const out=await processResponse({url:'https://weatherkit.apple.com/api/v3/weather/zh-CN/31/121?country=CN&dataSets=weatherAlerts',headers:{}},{status:200,headers:{'content-type':'application/vnd.apple.flatbuffer;messageType=WK3.Weather'},body:bytes},{Settings:buildSettings(database).Settings,Configs:{}});const after=decodeWK3Alerts(out.body);assert.equal(after.alerts[0].description,'大风蓝色预警');assert.equal(new URL(after.detailsUrl).origin,'https://weatherkit.apple.com');assert.equal(new URL(after.detailsUrl).pathname,'/alertDetails/index.html');assert.equal(after.alerts[0].detailsUrl,after.detailsUrl);assert.deepEqual(after.alerts[0].id,before.alerts[0].id);const u=new URL(after.detailsUrl);const {resolveNativeAlertDetails}=await import('../../src/wk3/class/NativeAlertDetails.mjs');const details=await resolveNativeAlertDetails(u.searchParams.get('ids'),u.searchParams.get('lang'),fetchPage);assert.equal(details.length,1);assert.equal(details[0].id,'00010203-0405-0607-0809-0a0b0c0d0e0f');assert.equal(details[0].detailsUrl,'#'+details[0].id);assert.match(details[0].messages[0].text,/注意防范/);}finally{globalThis.fetch=saved;}
});
