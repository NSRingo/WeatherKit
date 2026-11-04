import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";
import WeatherKit2, { decodeAirQuality, encodeAirQuality, decodeForecastNextHour, encodeForecastNextHour } from "../../src/egern/wk3/class/WeatherKit2.mjs";
import * as WK2 from "../../src/egern/wk3/proto/apple/wk2.js";

// All fixtures are synthetic FlatBuffers, with no HAR or user response data.
const airQuality = {
    categoryIndex: 2, index: 42, isSignificant: true, pollutants: [],
    previousDayComparison: "SAME", primaryPollutant: "PM2_5", scale: "SYNTHETIC",
};
const nextHour = { condition: [], minutes: [], summary: [], forecastStart: 100, forecastEnd: 200 };

function slotTable(buffer, id) {
    const root = buffer.position() + buffer.readUint32(buffer.position());
    const field = buffer.__offset(root, 4 + id * 2);
    assert.notEqual(field, 0, `root slot ${id} must exist`);
    return buffer.__indirect(root + field);
}

// Unknown slot #12 is a real table with a string and nested table containing a
// 64-bit scalar. Keeping its arena intact must preserve every relative pointer.
function fixture() {
    const builder = new Builder();
    const label = builder.createString("future product\u0000\u5929\u6c14");
    builder.startObject(1);
    builder.addFieldInt64(0, 0x123456789abcdefn, 0n);
    const nested = builder.endObject();
    builder.startObject(2);
    builder.addFieldOffset(0, label, 0);
    builder.addFieldOffset(1, nested, 0);
    const future = builder.endObject();
    const aq = encodeAirQuality(builder, airQuality);
    const current = WK2.CurrentWeatherData.createCurrentWeatherData(builder, 0, 123);
    builder.startObject(13);
    builder.addFieldOffset(0, aq, 0);
    builder.addFieldOffset(1, current, 0);
    builder.addFieldOffset(12, future, 0);
    builder.finish(builder.endObject());
    return builder.asUint8Array();
}

function readFuture(buffer) {
    const table = slotTable(buffer, 12);
    const labelField = buffer.__offset(table, 4);
    const nestedField = buffer.__offset(table, 6);
    const nested = buffer.__indirect(table + nestedField);
    const valueField = buffer.__offset(nested, 4);
    assert.equal((nested + valueField) % 8, 0, "64-bit scalar remains aligned");
    return { label: buffer.__string(table + labelField), value: buffer.readInt64(nested + valueField) };
}

function tableBytes(buffer, id) {
    const table = slotTable(buffer, id);
    const vtable = table - buffer.readInt32(table);
    return buffer.bytes().slice(table, table + buffer.readUint16(vtable + 2));
}

test("only selected products are decoded, even with an unreadable other codec", () => {
    const buffer = new ByteBuffer(fixture());
    const original = WK2.CurrentWeatherData.prototype.asOf;
    let calls = 0;
    WK2.CurrentWeatherData.prototype.asOf = function () { calls++; throw new Error("unselected codec called"); };
    try {
        const decoded = WeatherKit2.decode(buffer, ["airQuality"]);
        assert.deepEqual(Object.keys(decoded), ["airQuality"]);
        assert.equal(decoded.airQuality.index, 42);
        assert.deepEqual(WeatherKit2.decode(buffer), {});
        assert.equal(calls, 0);
        // Positive control: selecting the same codec actually invokes it.
        assert.deepEqual(WeatherKit2.decode(buffer, ["currentWeather"]), {});
        assert.equal(calls, 1);
    } finally {
        WK2.CurrentWeatherData.prototype.asOf = original;
    }
});

test("patch preserves a real unknown root slot, nested offsets and untouched known table bytes", () => {
    const bytes = fixture();
    const before = new ByteBuffer(bytes);
    const snapshot = bytes.slice();
    const updated = WeatherKit2.encode(before, { airQuality: { ...airQuality, index: 87 } });
    const after = new ByteBuffer(updated);
    assert.deepEqual(readFuture(after), readFuture(before));
    assert.deepEqual(readFuture(after), { label: "future product\u0000\u5929\u6c14", value: 0x123456789abcdefn });
    assert.deepEqual(tableBytes(after, 1), tableBytes(before, 1));
    assert.equal(WK2.Weather.getRootAsWeather(after).currentWeather().asOf(), 123);
    assert.equal(WeatherKit2.decode(after, ["airQuality"]).airQuality.index, 87);
    assert.deepEqual(bytes, snapshot, "source buffer is not mutated");
    // A second patch must keep the same unknown data alive as arenas accumulate.
    const twice = new ByteBuffer(WeatherKit2.encode(after, { airQuality: { ...airQuality, index: 90 } }));
    assert.deepEqual(readFuture(twice), readFuture(before));
    assert.equal(WeatherKit2.decode(twice, ["airQuality"]).airQuality.index, 90);
});

test("empty or rejected patches preserve the original bytes exactly", () => {
    const source = fixture();
    assert.deepEqual(WeatherKit2.encode(new ByteBuffer(source)), source);
    assert.deepEqual(WeatherKit2.encode(new ByteBuffer(source), { futureProduct: {} }), source);
    assert.deepEqual(WeatherKit2.encode(new ByteBuffer(source), { airQuality: null }), source);
});

test("source ByteBuffer position is respected when preserving an unknown slot", () => {
    const source = fixture();
    const prefixed = new Uint8Array(source.length + 8);
    prefixed.set(source, 8);
    const buffer = new ByteBuffer(prefixed);
    buffer.setPosition(8);
    const output = WeatherKit2.encode(buffer, { airQuality: { ...airQuality, index: 21 } });
    assert.equal(buffer.position(), 8);
    assert.deepEqual(readFuture(new ByteBuffer(output)), readFuture(new ByteBuffer(source)));
    assert.equal(WeatherKit2.decode(new ByteBuffer(output), ["airQuality"]).airQuality.index, 21);
    assert.deepEqual(WeatherKit2.encode(buffer, {}), source);
});

test("new roots and adding previously absent products use the patch API", () => {
    const source = WeatherKit2.encode(undefined, { airQuality });
    const output = WeatherKit2.encode(new ByteBuffer(source), { forecastNextHour: nextHour });
    const decoded = WeatherKit2.decode(new ByteBuffer(output), ["forecastNextHour", "airQuality"]);
    assert.deepEqual(Object.keys(decoded), ["airQuality", "forecastNextHour"], "physical slot order");
    assert.equal(decoded.airQuality.index, 42);
    assert.deepEqual(decoded.forecastNextHour, { metadata: undefined, ...nextHour });
});

test("standalone AQ and next-hour exports accept generated tables and produce builder offsets", () => {
    for (const [encode, decode, Model, data] of [
        [encodeAirQuality, decodeAirQuality, WK2.AirQuality, airQuality],
        [encodeForecastNextHour, decodeForecastNextHour, WK2.NextHourForecastData, nextHour],
    ]) {
        const builder = new Builder();
        const offset = encode(builder, data);
        assert.ok(Number.isSafeInteger(offset) && offset > 0);
        builder.finish(offset);
        const buffer = new ByteBuffer(builder.asUint8Array());
        const table = new Model().__init(buffer.readUint32(0), buffer);
        assert.deepEqual(decode(table), { metadata: undefined, ...data });
    }
});

test("all ten upstream product codecs round-trip through the bundled generated models", () => {
    const patch = {
        airQuality,
        currentWeather: {
            asOf: 123,
            precipitationAmountNext1hByType: [], precipitationAmountNext6hByType: [],
            precipitationAmountNext24hByType: [], precipitationAmountPrevious1hByType: [],
            precipitationAmountPrevious6hByType: [], precipitationAmountPrevious24hByType: [],
        },
        forecastDaily: { days: [] },
        forecastHourly: { hours: [] },
        forecastNextHour: nextHour,
        news: { placements: [] },
        weatherAlerts: { alerts: [], detailsUrl: "https://example.invalid/alerts" },
        weatherChanges: { changes: [], forecastStart: 100, forecastEnd: 200 },
        historicalComparisons: { comparisons: [] },
        locationInfo: { preciseName: "Test", countryCode: "SG", timeZone: "Asia/Singapore", primaryName: "Test" },
    };
    const decoded = WeatherKit2.decode(new ByteBuffer(WeatherKit2.encode(undefined, patch)), Object.keys(patch));
    assert.deepEqual(Object.keys(decoded), Object.keys(patch));
    assert.equal(decoded.currentWeather.asOf, 123);
    assert.equal(decoded.weatherAlerts.detailsUrl, patch.weatherAlerts.detailsUrl);
    assert.equal(decoded.locationInfo.timeZone, "Asia/Singapore");
    const roundTrip = WeatherKit2.decode(new ByteBuffer(WeatherKit2.encode(undefined, decoded)), Object.keys(patch));
    assert.deepEqual(roundTrip, decoded);
});

test("invalid selectors and patch containers reject the old API shape", () => {
    assert.throws(() => WeatherKit2.decode(new ByteBuffer(fixture()), "airQuality"), TypeError);
    assert.throws(() => WeatherKit2.encode(undefined, []), TypeError);
    assert.throws(() => WeatherKit2.encode(new Builder(), { airQuality }), TypeError);
});
