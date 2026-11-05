import test from "node:test";
import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import { Response as processResponse } from "../../src/wk3/process/Response.mjs";
import { decodeWK3DataSet } from "../../src/wk3/class/WeatherKit3.mjs";
import buildSettings from "../../src/wk3/function/buildSettings.mjs";
import database from "../../src/wk3/function/database.mjs";

const provider = { metadata: { providerName: "Synthetic mainland", sourceType: "MODELED" }, scale: "EPA_NowCast.2414", index: 87, categoryIndex: 2, isSignificant: false, primaryPollutant: "PM2_5", pollutants: [{ pollutantType: "PM2_5", amount: 12, units: "MICROGRAMS_PER_CUBIC_METER" }] };
function root() {
    const b = new Builder(), text = b.createString("preserve weather, alerts and future slots");
    b.startObject(1); b.addFieldOffset(0, text, 0); const child = b.endObject();
    b.startObject(18); for (const slot of [1, 2, 3, 9, 17]) b.addFieldOffset(slot, child, 0);
    b.finish(b.endObject()); return b.asUint8Array();
}
async function run(bytes, { country = "CN", lat = 52.972, lon = 122.539, dataSets = "airQuality", env = {}, failure = false, result = provider } = {}) {
    const parameters = {};
    for (const [key, value] of Object.entries({ "AirQuality.Current.Index.Provider": "ColorfulCloudsUS", "AirQuality.Comparison.Yesterday.IndexProvider": "WeatherKit", ...env })) {
        const keys = key.split("."), leaf = keys.pop(); let object = parameters;
        for (const part of keys) object = object[part] ??= {};
        object[leaf] = value;
    }
    const { Settings } = buildSettings(database, parameters);
    let calls = 0;
    const response = await processResponse({ url: `https://weatherkit.apple.com/api/v3/weather/zh-Hans-SG/${lat}/${lon}?country=${country}&dataSets=${dataSets}`, headers: {} }, { status: 200, headers: { "content-type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, body: bytes }, { Settings, Configs: {}, enviroments: { colorfulClouds: { async CurrentAirQuality(us) { calls++; assert.equal(us, true); if (failure) throw new Error("unavailable"); return result; } } } });
    return { body: response.body, calls };
}
test("mainland missing AQ receives verified US child and keeps original arena aligned byte-for-byte", async () => {
    for (const [lat, lon] of [[52.972, 122.539], [27.705, 108.844]]) {
        const bytes = root(), { body, calls } = await run(bytes, { lat, lon }), aq = decodeWK3DataSet(body);
        assert.equal(calls, 1); assert.equal(aq.index, 87); assert.equal(aq.scale, "EPA_NowCast.2604");
        const a = new ByteBuffer(bytes), b = new ByteBuffer(body), ar = a.readUint32(0), br = b.readUint32(0);
        let shift;
        for (const slot of [1, 2, 3, 9, 17]) {
            const oldTarget = a.__indirect(ar + a.__offset(ar, 4 + 2 * slot));
            const newTarget = b.__indirect(br + b.__offset(br, 4 + 2 * slot));
            shift ??= newTarget - oldTarget; assert.equal(newTarget - oldTarget, shift);
        }
        assert.equal(shift % 8, 0); assert.deepEqual(body.slice(shift, shift + bytes.length), bytes);
        const again = await run(body, { lat, lon }); assert.equal(again.calls, 0); assert.deepEqual(again.body, body);
    }
});
test("missing AQ respects request, dataset, region, replacement and source settings without querying", async () => {
    for (const options of [
        { dataSets: "currentWeather" }, { env: { DataSets: "[]" } },
        { env: { "Weather.Replace": "[]" } }, { env: { "AirQuality.Current.Index.Replace": "[]" } },
        { env: { "AirQuality.Current.Index.Provider": "WeatherKit" } },
        { env: { "AirQuality.Current.Index.Provider": "Calculate", "AirQuality.Calculate.Algorithm": "None" } },
        { country: "US", lat: 40.713, lon: -74.007 }, { country: "MO", lat: 22.19, lon: 113.54 },
        { country: "CN", lat: 25.03, lon: 121.56 },
    ]) {
        const bytes = root(), output = await run(bytes, options); assert.equal(output.calls, 0); assert.deepEqual(output.body, bytes);
    }
});
test("missing AQ preserves response when provider fails or returns unavailable/incomplete data", async () => {
    for (const options of [{ failure: true }, { result: null }, { result: { ...provider, metadata: { temporarilyUnavailable: true } } }, { result: { ...provider, pollutants: [] } }, { result: { ...provider, index: NaN } }]) {
        const bytes = root(), output = await run(bytes, options); assert.equal(output.calls, 1); assert.deepEqual(output.body, bytes);
    }
});
