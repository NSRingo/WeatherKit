import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };

const [{ default: WeatherKit2 }, { Weather }, { Response }] = await Promise.all([import("../src/class/WeatherKit2.mjs"), import("../src/output/proto.bundle.js"), import("../src/process/Response.mjs")]);

const injectableDataSets = ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour"];
const unrelatedKnownDataSets = ["news", "weatherAlerts", "weatherChanges", "historicalComparisons", "locationInfo"];

test("selected root decode never opens unrelated known products", () => {
    const sourceBytes = createWeatherRoot([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const allDecoded = WeatherKit2.decode(new ByteBuffer(sourceBytes), "all");
    const originalDecode = WeatherKit2.decode;
    const decodeCalls = [];
    const originalAccessors = new Map();

    WeatherKit2.decode = function (...args) {
        decodeCalls.push(args[1]);
        return originalDecode.apply(this, args);
    };
    for (const accessor of ["news", "weatherAlerts", "weatherChanges", "historicalComparisons", "locationInfo"]) {
        originalAccessors.set(accessor, Weather.prototype[accessor]);
        Weather.prototype[accessor] = () => {
            throw new Error(`unexpected root accessor: ${accessor}`);
        };
    }

    try {
        const decoded = WeatherKit2.decode(new ByteBuffer(sourceBytes), [...injectableDataSets, ...unrelatedKnownDataSets]);
        assert.deepEqual(Object.keys(decoded), injectableDataSets);
        for (const dataSet of injectableDataSets) assert.deepEqual(decoded[dataSet], allDecoded[dataSet]);
    } finally {
        WeatherKit2.decode = originalDecode;
        for (const [accessor, implementation] of originalAccessors) Weather.prototype[accessor] = implementation;
    }

    const decodedProducts = decodeCalls.filter(call => typeof call === "string" && call !== "metadata");
    assert.deepEqual(decodedProducts, injectableDataSets);
});

test("response returns the original bytes when selected products produce no replacement", async () => {
    const originalBytes = createWeatherRoot([4, 5]);
    const response = await Response(
        {
            url: "https://weatherkit.apple.com/api/v2/weather/en-US/22.5431/114.0579?country=US&dataSets=forecastNextHour,news",
        },
        {
            bodyBytes: originalBytes,
            headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
        },
    );

    assert.deepEqual(new Uint8Array(response.body), originalBytes);
});

function createWeatherRoot(presentSlots) {
    const builder = new Builder(256);
    const tables = new Map(presentSlots.map(slot => [slot, createEmptyTable(builder)]));
    builder.startObject(10);
    for (const [slot, offset] of tables) builder.addFieldOffset(slot, offset, 0);
    const root = builder.endObject();
    builder.finish(root);
    return builder.asUint8Array().slice();
}

function createEmptyTable(builder) {
    builder.startObject(0);
    return builder.endObject();
}
