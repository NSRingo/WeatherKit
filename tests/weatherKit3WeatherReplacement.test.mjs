import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { beforeEach } from "node:test";
import { ByteBuffer } from "flatbuffers";
import { WK3 } from "@nsringo/weatherkit";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "Argument" };
const [{ Response }, { Request }, { default: ColorfulClouds }] = await Promise.all([
    import("../src/process/Response.dev.mjs"), import("../src/process/Request.dev.mjs"), import("../src/class/ColorfulClouds.mjs"),
]);
const source = new Uint8Array(readFileSync(new URL("./fixtures/wk3-paired/hangzhou/apple.bin", import.meta.url)));
const original = WK3.Codec.decode("Weather", WK3.Weather.getRootAsWeather(new ByteBuffer(source)));
const metadata = { providerName: "Controlled provider", sourceType: "MODELED", temporarilyUnavailable: false, latitude: "30", longitude: "120" };
const request = () => ({ method: "GET", url: "https://weatherkit.apple.com/api/v3/weather/en-US/30/120?country=CN&dataSets=currentWeather,forecastDaily,forecastHourly,weatherAlerts", headers: { Accept: "application/vnd.apple.flatbuffer;messageType=WK3.Weather", "User-Agent": "WeatherWidget" } });
const response = (body = source) => Response(request(), { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, bodyBytes: body });
function pointer(bytes, slot) { const b = new ByteBuffer(bytes), root = b.readUint32(0), off = b.__offset(root, 4 + 2 * slot); return off ? b.__indirect(root + off) : 0; }
beforeEach(() => { globalThis.$request = request(); globalThis.$argument = { LogLevel: "OFF", Storage: "Argument", DataSets: "currentWeather,forecastDaily,forecastHourly", Weather: { Replace: "CN", Provider: "ColorfulClouds" } }; });
function mockWeather(t) {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata, temperature: 27.125, conditionCode: "RAIN" }));
    t.mock.method(ColorfulClouds.prototype, "Daily", async () => ({ metadata, days: [{ forecastStart: original.forecastDaily.days[0].forecastStart, temperatureMax: 31.25, conditionCode: "SNOW", daytimeForecast: { cloudCover: 80 } }] }));
    t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata, hours: [{ forecastStart: original.forecastHourly.hours[0].forecastStart, temperature: 24.5, conditionCode: "RAIN", precipitationAmount: 2.5 }] }));
}

test("WK3 FlatBuffer requests stay binary and preserve every unrelated root arena", async t => {
    mockWeather(t);
    const req = (await Request(request())).$request;
    assert.equal(req.headers.Accept, "application/vnd.apple.flatbuffer;messageType=WK3.Weather");
    const output = (await response()).body;
    assert.ok(output instanceof Uint8Array);
    const body = WK3.Codec.decode("Weather", WK3.Weather.getRootAsWeather(new ByteBuffer(output)));
    assert.equal(body.currentWeather.temperature, 27.125);
    assert.deepEqual(body.currentWeather.conditionCode, ["RAIN"]);
    assert.equal(body.forecastDaily.days[0].temperatureMax, 31.25);
    assert.deepEqual(body.forecastDaily.days[0].conditionCode, ["SNOW"]);
    assert.equal(body.forecastDaily.days[0].daytimeForecast.cloudCover, 80);
    assert.equal(body.forecastHourly.hours[0].temperature, 24.5);
    assert.deepEqual(body.forecastHourly.hours[0].precipitationAmount, { expected: 2.5, minimum: 2.5, maximum: 2.5 });
    const shift = pointer(output, 9) - pointer(source, 9);
    assert.deepEqual(output.subarray(shift, shift + source.length), source);
    for (const slot of [0, 4, 6, 7, 9, 14]) assert.equal(pointer(output, slot) - shift, pointer(source, slot));
});

test("a failed current-weather provider leaves that arena intact while hourly replacement succeeds", async t => {
    mockWeather(t);
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => { throw new Error("offline"); });
    const output = (await response()).body, shift = pointer(output, 9) - pointer(source, 9);
    assert.equal(pointer(output, 1) - shift, pointer(source, 1));
    assert.equal(WK3.Weather.getRootAsWeather(new ByteBuffer(output)).forecastHourly().hours(0).temperature(), 24.5);
});

test("a future current-weather field is kept opaque and never reaches the provider", async t => {
    mockWeather(t);
    const now = t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => assert.fail("future product must not be rewritten"));
    const bytes = source.slice(), bb = new ByteBuffer(bytes), p = pointer(bytes, 1), vtable = p - bb.readInt32(p);
    new DataView(bytes.buffer).setUint16(vtable, 4 + 34 * 2, true);
    const output = (await response(bytes)).body, shift = pointer(output, 9) - pointer(bytes, 9);
    assert.equal(now.mock.callCount(), 0);
    assert.equal(pointer(output, 1) - shift, pointer(bytes, 1));
    assert.deepEqual(output.subarray(shift, shift + bytes.length), bytes);
});

test("disabled or native-provider weather stays byte-identical", async t => {
    mockWeather(t);
    globalThis.$argument.DataSets = "[]";
    assert.deepEqual((await response()).body, source);
    globalThis.$argument.DataSets = "currentWeather,forecastDaily,forecastHourly";
    globalThis.$argument.Weather.Provider = "WeatherKit";
    assert.deepEqual((await response()).body, source);
});
