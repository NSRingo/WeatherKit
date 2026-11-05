// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", "Weather.Provider": "QWeather", "WeatherAlerts.Provider": "QWeatherWeb" };
const [{ Response }, { Response: ResponseDev }, { default: WeatherKit2 }, { default: QWeather }, WK, { ByteBuffer }, fixtures] = await Promise.all([
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/class/WeatherKit2.mjs"),
    import("../src/class/QWeather.mjs"),
    import("@nsringo/weatherkit"),
    import("flatbuffers"),
    import("./fixtures/processingMemoryFixture.mjs"),
]);
const request = products => {
    const value = { url: `https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/32.39/119.499?country=CN&dataSets=${products}`, method: "GET", headers: {} };
    globalThis.$request = value;
    return value;
};
const response = body => ({ status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body });

for (const [name, processResponse] of [
    ["release", Response],
    ["development", ResponseDev],
]) {
    test(`${name}: failed hourly replacement preserves its future binary fields when current weather changes`, async () => {
        const raw = fixtures.futureHourlyFixture(),
            original = raw.slice();
        const savedNow = QWeather.prototype.WeatherNow,
            savedHourly = QWeather.prototype.Hourly,
            encode = WeatherKit2.encode;
        let patchKeys;
        QWeather.prototype.WeatherNow = async () => ({ metadata: { providerName: "Fixture", temporarilyUnavailable: false }, temperature: 29 });
        QWeather.prototype.Hourly = async () => undefined;
        WeatherKit2.encode = function (source, patch) {
            patchKeys = Object.keys(patch);
            return encode.call(this, source, patch);
        };
        try {
            const result = await processResponse(request("currentWeather,forecastHourly"), response(raw));
            assert.deepEqual(patchKeys, ["currentWeather"]);
            assert.equal(fixtures.readFutureHourly(result.body), fixtures.futureHourlyText);
            assert.equal(WeatherKit2.decode(new ByteBuffer(result.body), ["currentWeather"]).currentWeather.temperature, 29);
            assert.deepEqual(raw, original);
        } finally {
            QWeather.prototype.WeatherNow = savedNow;
            QWeather.prototype.Hourly = savedHourly;
            WeatherKit2.encode = encode;
        }
    });

    for (const success of [false, true])
        test(`${name}: alerts are copied only after a usable provider result (${success})`, async () => {
            const raw = fixtures.weatherFixture(0, 3),
                originalBytes = raw.slice();
            const decode = WeatherKit2.decode,
                savedWeb = QWeather.prototype.WeatherAlertWeb;
            let readAlerts = 0,
                original,
                complete;
            WeatherKit2.decode = function (...args) {
                const data = decode.apply(this, args);
                original = data.weatherAlerts;
                const alerts = original.alerts;
                Object.defineProperty(original, "alerts", {
                    enumerable: true,
                    get() {
                        readAlerts++;
                        return alerts;
                    },
                });
                return data;
            };
            QWeather.prototype.WeatherAlertWeb = () =>
                new Promise(resolve => {
                    complete = resolve;
                });
            try {
                const pending = processResponse(request("weatherAlerts"), response(raw));
                await new Promise(resolve => setImmediate(resolve));
                assert.equal(typeof complete, "function");
                assert.equal(readAlerts, 0, "Pending callbacks must not retain a deep copy of alerts");
                complete(success ? { metadata: { providerName: "Fixture", temporarilyUnavailable: false }, alerts: [{ areaId: "0", description: "Updated warning", responses: [], guidelines: [] }] } : undefined);
                const result = await pending;
                if (success) {
                    assert.equal(decode.call(WeatherKit2, new ByteBuffer(result.body), ["weatherAlerts"]).weatherAlerts.alerts[0].description, "Updated warning");
                    assert.equal(original.alerts[0].description, "Apple warning 0");
                    assert.notDeepEqual(result.body, raw);
                } else {
                    assert.equal(readAlerts, 0);
                    assert.strictEqual(result.body, raw);
                }
                assert.deepEqual(raw, originalBytes);
            } finally {
                WeatherKit2.decode = decode;
                QWeather.prototype.WeatherAlertWeb = savedWeb;
            }
        });
}

test("alert decode uses one schema view per record and preserves the full decoded payload", () => {
    const raw = fixtures.weatherFixture(0, 48);
    const expected = WeatherKit2.decode(new ByteBuffer(raw), ["weatherAlerts"]);
    const alerts = WK.WeatherAlertCollectionData.prototype.alerts;
    let calls = 0;
    WK.WeatherAlertCollectionData.prototype.alerts = function (...args) {
        calls++;
        return alerts.apply(this, args);
    };
    try {
        assert.deepEqual(WeatherKit2.decode(new ByteBuffer(raw), ["weatherAlerts"]), expected);
        assert.equal(calls, 48);
    } finally {
        WK.WeatherAlertCollectionData.prototype.alerts = alerts;
    }
});
