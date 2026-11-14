// Synthetic public protocol fixtures. Time zones are changed only in child processes.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => { throw new Error("Shared storage writes are forbidden in this fixture"); } };
globalThis.$argument = { Storage: "Argument", LogLevel: "OFF" };
const [{ default: WeatherAlerts }, { activeProviderAlerts }, { Response }, { default: QWeather }, { default: WeatherKit2 }, { Console }] = await Promise.all([
    import("../src/class/WeatherAlerts.mjs"),
    import("../src/function/providerRecovery.mjs"),
    import("../src/process/Response.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/class/WeatherKit2.mjs"),
    import("@nsnanocat/util"),
]);
Console.logLevel = "OFF";

const legacy = "9999-12-31T23:59:59Z";
const safe = "9999-12-31T00:00:00Z";
const unknown = [["missing", undefined], ["null", null], ["legacy", legacy], ["safe", safe]];
const genuine = [["future", "2099-06-01T01:02:03.456+08:00"], ["expired", "2000-06-01T01:02:03.456+08:00"]];
const context = { identifier: "fixture-101000001", language: "en-GB", countryCode: "CN", attributionUrl: "https://fixture.example/alert" };
const sourceAlert = fields => ({ description: "Fixture wind warning", eventName: "Wind warning", issuedTime: "2026-11-14T04:09:00Z", reportedAt: "2026-11-14T04:09:00Z", message: "Original notice", standard: "Definition", guidelines: ["Original guidance"], severity: "moderate", source: "Fixture issuer", ...fields });
const build = fields => WeatherAlerts.Build({ areaName: "Fixture", source: "Fixture issuer", alerts: [sourceAlert(fields)] }, context)[0];

for (const [label, value] of unknown) {
    test(`REST unknown expiry (${label}) uses the safe string and cannot invent an event end`, () => {
        const input = { expireTime: value };
        const before = structuredClone(input);
        const row = build(input);
        assert.equal(row.expireTime, safe);
        assert.equal(typeof row.expireTime, "string");
        assert.equal(Object.hasOwn(row, "eventEndTime"), false);
        assert.deepEqual(input, before);
    });
}
for (const value of [legacy, safe]) {
    test(`unknown explicit event end is omitted (${value})`, () => {
        const row = build({ expireTime: value, eventEndTime: value });
        assert.equal(row.expireTime, safe);
        assert.equal(Object.hasOwn(row, "eventEndTime"), false);
    });
}
for (const [label, value] of genuine) {
    test(`REST retains the exact ${label} source expiry, including its offset and milliseconds`, () => {
        const row = build({ expireTime: value });
        assert.equal(row.expireTime, value);
        assert.equal(row.eventEndTime, value);
        assert.equal(row.issuedTime, "2026-11-14T04:09:00Z");
    });
}
test("a genuine event end remains distinct from an unknown notice expiry", () => {
    const end = "2099-06-01T02:03:04.567+08:00";
    const row = build({ expireTime: legacy, eventEndTime: end });
    assert.equal(row.expireTime, safe);
    assert.equal(row.eventEndTime, end);
});
test("both sentinels are unknown during filtering, while a genuine end still determines availability", () => {
    const afterSafeSentinel = Date.parse("9999-12-31T12:00:00Z");
    for (const value of [legacy, safe]) {
        assert.equal(activeProviderAlerts([{ expireTime: value }], afterSafeSentinel).length, 1);
        assert.equal(activeProviderAlerts([{ eventEndTime: value }], afterSafeSentinel).length, 1);
        assert.equal(activeProviderAlerts([{ expireTime: value, eventEndTime: "2000-01-01T00:00:00Z" }], Date.parse("2026-11-14T00:00:00Z")).length, 0);
    }
    const future = { expireTime: genuine[0][1] }, expired = { expireTime: genuine[1][1] };
    assert.deepEqual(activeProviderAlerts([future, expired], Date.parse("2026-11-14T00:00:00Z")), [future]);
});

for (const zone of ["UTC", "Asia/Taipei", "Pacific/Kiritimati", "Etc/GMT+12"]) {
    test(`${zone}: the existing Apple local-year guard clears unknown expiry and retains real times`, () => {
        const script = `
            import assert from 'node:assert/strict';
            import WeatherAlerts from './src/class/WeatherAlerts.mjs';
            const values = [undefined, null, '${legacy}', '${safe}'];
            const make = value => WeatherAlerts.Build({areaName:'Fixture', source:'Fixture', alerts:[{description:'Wind warning', issuedTime:'2026-11-14T04:09:00Z', reportedAt:'2026-11-14T04:09:00Z', message:'Original notice', guidelines:['Original guidance'], severity:'moderate', expireTime:value}]}, ${JSON.stringify(context)})[0];
            for (const value of values) {
                const row = make(value);
                const parsed = new Date(row.expireTime);
                assert.equal(parsed.getFullYear(), 9999);
                // Contract used by the actual cached Apple consumer, independent of our producer.
                const consumedExpiry = parsed.getFullYear() === 9999 ? null : parsed;
                assert.equal(consumedExpiry, null);
                assert.equal(Object.hasOwn(row, 'eventEndTime'), false);
                assert.equal(row.messages[0].text, 'Original notice');
            }
            for (const value of ${JSON.stringify(genuine.map(([, value]) => value))}) {
                const row = make(value);
                assert.equal(row.expireTime, value);
                const parsed = new Date(row.expireTime);
                assert.notEqual(parsed.getFullYear(), 9999);
                assert.equal(parsed.getTime(), Date.parse(value));
            }
            console.log('EXPIRY_CHECK=' + JSON.stringify({zone:process.env.TZ, unknown:values.length, genuine:2}));
        `;
        const before = process.env.TZ;
        const stdout = execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: new URL("..", import.meta.url), encoding: "utf8", env: { ...process.env, TZ: zone } });
        assert.equal(process.env.TZ, before);
        const result = JSON.parse(stdout.split("\n").find(line => line.startsWith("EXPIRY_CHECK=")).slice("EXPIRY_CHECK=".length));
        assert.deepEqual(result, { zone, unknown: 4, genuine: 2 });
    });
}

const realAppleTimes = { issuedTime: 1_794_628_800, effectiveTime: 1_794_629_000, eventOnsetTime: 1_794_629_200, eventEndTime: 1_794_632_000, expireTime: 1_794_633_000 };
const nativeWarning = fields => ({ id: "00112233-4455-6677-8899-aabbccddeeff", description: "Fixture wind warning", phenomenon: "Wind", severity: "moderate", responses: [], ...fields });
for (const version of ["v2", "v3"]) {
    for (const populated of [false, true]) {
        test(`${version}: unknown source times cannot replace genuine Apple times or manufacture end times (existing=${populated})`, async t => {
            let supplied;
            t.mock.method(QWeather.prototype, "WeatherAlert", async () => structuredClone(supplied));
            for (const [label, value] of unknown) {
                globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: "weatherAlerts", WeatherAlerts: { Provider: "QWeather" } };
                const request = globalThis.$request = { method: "GET", url: `https://weatherkit.apple.com/api/${version}/weather/en-US/31.2/121.5?country=CN&dataSets=weatherAlerts`, headers: {} };
                const warning = nativeWarning(populated ? realAppleTimes : {});
                const body = { weatherAlerts: { metadata: { temporarilyUnavailable: false, providerName: "National Early Warning Center" }, alerts: [warning] } };
                supplied = { metadata: { temporarilyUnavailable: false, providerName: "Fixture" }, alerts: [sourceAlert({ expireTime: value, eventEndTime: value, areaName: "Source area" })] };
                const response = version === "v2"
                    ? { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: WeatherKit2.encode(undefined, body) }
                    : { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
                const output = await Response(request, response);
                const actual = version === "v2" ? WeatherKit2.decode(new ByteBuffer(output.body), ["weatherAlerts"]).weatherAlerts.alerts[0] : JSON.parse(output.body).weatherAlerts.alerts[0];
                assert.equal(actual.areaName, "Source area", `${version}/${label}: actual enrichment occurred`);
                if (populated) {
                    for (const [key, expected] of Object.entries(realAppleTimes)) assert.equal(actual[key], expected, `${version}/${label}/${key}`);
                } else {
                    assert.ok(actual.expireTime == null || actual.expireTime === 0, `${version}/${label}: no unknown expiry installed`);
                    assert.ok(actual.eventEndTime == null || actual.eventEndTime === 0, `${version}/${label}: no unknown end installed`);
                }
            }
        });
    }
}
