import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { WK3 } from "@nsringo/weatherkit";
import { ByteBuffer, Builder } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "Argument" };
const [{ Response }, { Request }, { default: ColorfulClouds }] = await Promise.all([import("../src/process/Response.dev.mjs"), import("../src/process/Request.dev.mjs"), import("../src/class/ColorfulClouds.mjs")]);

// 合成的 WK3 根响应，所有取值均为虚构；真机成对样本保留在闭源协议仓 apple.WeatherKit。
// Synthetic WK3 root response with fictional values only; the paired on-device
// captures live in the private apple.WeatherKit protocol repository.
function buildWeather({ futureCurrentField = false } = {}) {
	const builder = new Builder(4096);
	const airQuality = WK3.Codec.encode("AirQuality", builder, { metadata: { providerName: "synthetic" }, pollutants: [] });
	const forecastDaily = WK3.Codec.encode("DailyForecastData", builder, { days: [{ forecastStart: 1763200000, temperatureMax: 30 }] });
	const forecastHourly = WK3.Codec.encode("HourlyForecastData", builder, { hours: [{ forecastStart: 1763200000, temperature: 21 }] });
	const forecastPeriodic = WK3.Codec.encode("PeriodicForecasts", builder, { forecasts: [] });
	const historicalComparisons = WK3.Codec.encode("HistoricalComparisons", builder, { comparisons: [] });
	const weatherChanges = WK3.Codec.encode("WeatherChanges", builder, { changes: [] });
	const weatherAlerts = WK3.Codec.encode("WeatherAlertCollectionData", builder, { alerts: [] });
	const news = WK3.Codec.encode("News", builder, { placements: [] });
	let currentWeather;
	if (futureCurrentField) {
		// CurrentWeatherData 仅定义 33 个字段；声明字段 34 模拟未来 schema 新增的 wire 字段。
		builder.startObject(35);
		builder.addFieldFloat32(25, 20.5, 0);
		builder.addFieldInt32(34, 777, 0);
		currentWeather = builder.endObject();
	} else {
		currentWeather = WK3.Codec.encode("CurrentWeatherData", builder, { temperature: 20.5, conditionCode: ["CLOUDY"] });
	}
	WK3.Weather.startWeather(builder);
	WK3.Weather.addAirQuality(builder, airQuality);
	WK3.Weather.addCurrentWeather(builder, currentWeather);
	WK3.Weather.addForecastDaily(builder, forecastDaily);
	WK3.Weather.addForecastHourly(builder, forecastHourly);
	WK3.Weather.addForecastPeriodic(builder, forecastPeriodic);
	WK3.Weather.addHistoricalComparisons(builder, historicalComparisons);
	WK3.Weather.addWeatherChanges(builder, weatherChanges);
	WK3.Weather.addWeatherAlerts(builder, weatherAlerts);
	WK3.Weather.addNews(builder, news);
	builder.finish(WK3.Weather.endWeather(builder));
	return builder.asUint8Array().slice();
}
const source = buildWeather();
const original = WK3.Codec.decode("Weather", WK3.Weather.getRootAsWeather(new ByteBuffer(source)));
const metadata = { providerName: "Controlled provider", sourceType: "MODELED", temporarilyUnavailable: false, latitude: 30, longitude: 120 };
const request = () => ({ method: "GET", url: "https://weatherkit.apple.com/api/v3/weather/en-US/30/120?country=CN&dataSets=currentWeather,forecastDaily,forecastHourly,weatherAlerts", headers: { Accept: "application/vnd.apple.flatbuffer;messageType=WK3.Weather", "User-Agent": "WeatherWidget" } });
const response = (body = source) => Response(request(), { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, bodyBytes: body });
function pointer(bytes, slot) {
    const b = new ByteBuffer(bytes),
        root = b.readUint32(0),
        off = b.__offset(root, 4 + 2 * slot);
    return off ? b.__indirect(root + off) : 0;
}
beforeEach(() => {
    globalThis.$request = request();
    globalThis.$argument = { LogLevel: "OFF", Storage: "Argument", DataSets: "currentWeather,forecastDaily,forecastHourly", Weather: { Replace: "CN", Provider: "ColorfulClouds" } };
});
function mockWeather(t) {
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => ({ metadata, temperature: 27.125, conditionCode: ["RAIN"] }));
    t.mock.method(ColorfulClouds.prototype, "Daily", async () => ({ metadata, days: [{ forecastStart: original.forecastDaily.days[0].forecastStart, temperatureMax: 31.25, conditionCode: ["SNOW"], daytimeForecast: { cloudCover: 80 } }] }));
    t.mock.method(ColorfulClouds.prototype, "ForecastHourly", async () => ({ metadata, hours: [{ forecastStart: original.forecastHourly.hours[0].forecastStart, temperature: 24.5, conditionCode: ["RAIN"], precipitationAmount: { expected: 2.5, minimum: 2.5, maximum: 2.5 } }] }));
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
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => {
        throw new Error("offline");
    });
    const output = (await response()).body,
        shift = pointer(output, 9) - pointer(source, 9);
    assert.equal(pointer(output, 1) - shift, pointer(source, 1));
    assert.equal(WK3.Weather.getRootAsWeather(new ByteBuffer(output)).forecastHourly().hours(0).temperature(), 24.5);
});

test("a future current-weather field is kept opaque and never reaches the provider", async t => {
    mockWeather(t);
    const now = t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => assert.fail("future product must not be rewritten"));
    const bytes = buildWeather({ futureCurrentField: true });
    const output = (await response(bytes)).body,
        shift = pointer(output, 9) - pointer(bytes, 9);
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
