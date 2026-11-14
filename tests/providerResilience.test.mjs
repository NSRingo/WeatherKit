import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import ProviderTransport from "../src/class/ProviderTransport.mjs";
import QWeather from "../src/class/QWeather.mjs";
import { activeProviderAlerts, cloneWeatherProduct } from "../src/function/providerRecovery.mjs";
import utf8Length from "../src/function/utf8Length.mjs";
import { Console } from "@nsnanocat/util";
globalThis.$loon = "simulated Loon";
const persistent = new Map();
globalThis.$persistentStore = {
    read: key => persistent.get(key),
    write: (value, key) => {
        persistent.set(key, value);
        return true;
    },
};
const callbacks = [];
globalThis.$httpClient = { get: (request, callback) => callbacks.push({ request, callback }) };
Console.logLevel = "OFF";
test("an unrecognized webpage is unavailable, never a cached no-warning success", async () => {
    persistent.clear();
    callbacks.length = 0;
    const runtime = new ProviderTransport();
    const pending = QWeather.FetchWeatherAlertPage("fixture-101190110", "en-US", {}, runtime);
    callbacks.shift().callback(null, { status: 200, headers: { "Content-Type": "text/html" } }, "<html>Access denied</html>");
    const result = await pending;
    assert.equal(result.metadata.temporarilyUnavailable, true);
});

test("expired and invalid third-party alerts are excluded without altering unknown-expiry alerts", () => {
    assert.deepEqual(
        activeProviderAlerts([{ id: 1, expireTime: "2000-01-01T00:00:00Z" }, { id: 2, expireTime: "2099-01-01T00:00:00Z" }, { id: 3 }, { id: 4, expireTime: "bad" }], Date.parse("2026-10-19T00:00:00Z")).map(a => a.id),
        [2, 3],
    );
});

test("product snapshots preserve binary values and isolate partial mutations before a failed replacement", () => {
    const original = { metadata: { providerName: "Apple" }, days: [{ v: 1 }], bytes: new Uint8Array([1, 2]) },
        copy = cloneWeatherProduct(original);
    copy.days[0].v = 2;
    copy.bytes[0] = 9;
    assert.equal(original.days[0].v, 1);
    assert.equal(original.bytes[0], 1);
    assert.ok(copy.bytes instanceof Uint8Array);
});

test("UTF-8 body bounds work without TextEncoder and stop once the limit is exceeded", () => {
    for (const value of ["abc", "天气", "😀", "\ud800", "a😀天"]) assert.equal(utf8Length(value), Buffer.byteLength(value));
    assert.ok(utf8Length("天".repeat(1000), 100) > 100);
});

test("actual response processing preserves Apple products on provider failure and waits for every native callback", async () => {
    persistent.clear();
    callbacks.length = 0;
    const saved = globalThis.$argument;
    globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: ["currentWeather", "forecastHourly"], Weather: { Provider: "QWeather", Replace: ["CN"] } };
    try {
        const [{ default: WeatherKit2 }, { Response }, { ByteBuffer }] = await Promise.all([import("../src/class/WeatherKit2.mjs"), import("../src/process/Response.mjs"), import("flatbuffers")]);
        const raw = WeatherKit2.encode(undefined, {
            currentWeather: {
                metadata: { providerName: "Apple", temporarilyUnavailable: false },
                temperature: 27,
                precipitationAmountNext1hByType: [],
                precipitationAmountNext24hByType: [],
                precipitationAmountNext6hByType: [],
                precipitationAmountPrevious1hByType: [],
                precipitationAmountPrevious24hByType: [],
                precipitationAmountPrevious6hByType: [],
            },
            forecastHourly: { metadata: { providerName: "Apple", temporarilyUnavailable: false }, hours: [] },
        });
        const before = WeatherKit2.decode(new ByteBuffer(raw), ["currentWeather", "forecastHourly"]);
        assert.equal(before.currentWeather?.temperature, 27);
        const pending = Response({ url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?country=CN&dataSets=currentWeather,forecastHourly", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw });
        let settled = false;
        pending.then(() => {
            settled = true;
        });
        assert.equal(callbacks.length, 2);
        callbacks.shift().callback("timeout fixture-secret", {}, "");
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(settled, false);
        callbacks.shift().callback("timeout fixture-secret", {}, "");
        const result = await pending;
        const after = WeatherKit2.decode(new ByteBuffer(result.body), ["currentWeather", "forecastHourly"]);
        assert.deepEqual(after, before);
        assert.deepEqual(Array.from(result.body), Array.from(raw));
        assert.equal(after.currentWeather.temperature, 27);
    } finally {
        globalThis.$argument = saved;
    }
});

test("sequential requests cannot mutate shared defaults or inherit another credential", async () => {
    const [{ default: setENV }, { default: database }] = await Promise.all([import("../src/function/setENV.mjs"), import("../src/function/database.mjs")]);
    const token = database.WeatherKit.Settings.API.QWeather.Token,
        saved = globalThis.$argument;
    try {
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", API: { QWeather: { Token: "dedicated-fixture" } } };
        const a = setENV("iRingo", "WeatherKit", database);
        assert.equal(a.Settings.API.QWeather.Token, "dedicated-fixture");
        assert.equal(database.WeatherKit.Settings.API.QWeather.Token, token);
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF" };
        const b = setENV("iRingo", "WeatherKit", database);
        assert.equal(b.Settings.API.QWeather.Token, token);
        assert.notEqual(a.Settings.API, b.Settings.API);
    } finally {
        globalThis.$argument = saved;
    }
});

test("bounded fallback encoder matches Unicode replacement behavior without host TextEncoder", async () => {
    const countSource = (await readFile(new URL("../src/function/utf8Length.mjs", import.meta.url), "utf8")).replace("export default function", "function");
    const encoderSource = (await readFile(new URL("../src/function/ensureTextEncoder.mjs", import.meta.url), "utf8")).replace(/^import .+$/m, "");
    const context = vm.createContext({});
    vm.runInContext(`${countSource}\n${encoderSource}`, context);
    for (const value of ["", "ASCII", "天气雨雪🌦️", "a\ud800b\udc00c", "\ud83c\udf27\ud83c\udf08", "\u0000\u07ff\u0800\uffff"]) {
        const actual = vm.runInContext(`new TextEncoder().encode(${JSON.stringify(value)})`, context);
        assert.deepEqual(Array.from(actual), Array.from(new TextEncoder().encode(value)));
    }
    assert.throws(() => vm.runInContext('new TextEncoder().encode("x".repeat(2 * 1024 * 1024 + 1))', context), /encoding limit/);
    const nativeContext = vm.createContext({ TextEncoder });
    vm.runInContext(`${countSource}\n${encoderSource}`, nativeContext);
    assert.equal(nativeContext.TextEncoder, TextEncoder);
});

test("missing Apple daily and hourly roots can receive available provider forecasts", { timeout: 2000 }, async () => {
    const [{ Response }, { default: WeatherKit2 }, { ByteBuffer }] = await Promise.all([import("../src/process/Response.mjs"), import("../src/class/WeatherKit2.mjs"), import("flatbuffers")]);
    const savedArgument = globalThis.$argument,
        daily = QWeather.prototype.Daily,
        hourly = QWeather.prototype.Hourly;
    const metadata = { providerName: "QWeather", temporarilyUnavailable: false };
    try {
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: ["forecastDaily", "forecastHourly"], Weather: { Provider: "QWeather", Replace: ["CN"] } };
        QWeather.prototype.Daily = async () => ({ metadata, days: [{ forecastStart: 1792368000, temperatureMax: 29, precipitationAmountByType: [] }] });
        QWeather.prototype.Hourly = async () => ({ metadata, hours: [{ forecastStart: 1792368000, temperature: 25 }] });
        const raw = WeatherKit2.encode(undefined, {});
        const result = await Response({ url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?country=CN&dataSets=forecastDaily,forecastHourly", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw });
        const decoded = WeatherKit2.decode(new ByteBuffer(result.body), ["forecastDaily", "forecastHourly"]);
        assert.equal(decoded.forecastDaily.days[0].temperatureMax, 29);
        assert.equal(decoded.forecastHourly.hours[0].temperature, 25);
    } finally {
        globalThis.$argument = savedArgument;
        QWeather.prototype.Daily = daily;
        QWeather.prototype.Hourly = hourly;
    }
});
