import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };

const [{ default: WeatherKit2 }, { FlatBufferRootProcessor }, { News, Weather }, { Response }, { Response: ResponseDev }, { Console }] = await Promise.all([
    import("../src/class/WeatherKit2.mjs"),
    import("@nsringo/flatbuffer-root"),
    import("@nsringo/weatherkit"),
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("@nsnanocat/util"),
]);

const supportedRootDataSets = Object.getOwnPropertyNames(Weather.prototype).filter(dataSet => !["constructor", "__init"].includes(dataSet));

test("WeatherKit2 is a configured reusable root processor", () => {
    assert.ok(WeatherKit2 instanceof FlatBufferRootProcessor);
    assert.equal(typeof WeatherKit2.filterRootNames, "function");
    assert.equal(typeof WeatherKit2.decode, "function");
    assert.equal(typeof WeatherKit2.encode, "function");
});

test("selected root decode follows physical slot order, deduplicates requests, and ignores unknown products", () => {
    const sourceBytes = createWeatherRoot([4, 5]);
    const decoded = WeatherKit2.decode(new ByteBuffer(sourceBytes), ["news", "forecastNextHour", "news", "futureProduct"]);

    assert.deepEqual(Object.keys(decoded), ["forecastNextHour", "news"]);
});

test("all current root codecs round-trip through a dynamic JSON patch", () => {
    const sourceBytes = createWeatherRoot(supportedRootDataSets.map((_, slot) => slot));
    const patch = WeatherKit2.decode(new ByteBuffer(sourceBytes), supportedRootDataSets);
    const rawBody = WeatherKit2.encode(undefined, patch);

    assert.deepEqual(Object.keys(WeatherKit2.decode(new ByteBuffer(rawBody), supportedRootDataSets)), supportedRootDataSets);
});

test("encode replaces patch keys while preserving untouched and future root slots", () => {
    const sourceBytes = createWeatherRoot([4, 12]);
    const untouched = WeatherKit2.encode(new ByteBuffer(sourceBytes), {});
    assert.deepEqual(untouched, sourceBytes);

    const patched = WeatherKit2.encode(new ByteBuffer(sourceBytes), { news: { placements: [] } });
    const weather = Weather.getRootAsWeather(new ByteBuffer(patched));
    assert.ok(weather.forecastNextHour());
    assert.ok(weather.news());
    assert.notEqual(Buffer.from(patched).indexOf(sourceBytes), -1);
    assert.deepEqual(Object.keys(WeatherKit2.decode(new ByteBuffer(patched), ["forecastNextHour", "news", "futureProduct"])), ["forecastNextHour", "news"]);
});

test("encode isolates failed and unknown patch keys while compiling valid slots", () => {
    const sourceBytes = createWeatherRoot([0, 4]);
    const logs = captureConsole(() =>
        WeatherKit2.encode(new ByteBuffer(sourceBytes), {
            airQuality: {},
            futureProduct: {},
            news: { placements: [] },
        }),
    );
    const weather = Weather.getRootAsWeather(new ByteBuffer(logs.result));

    assert.ok(weather.airQuality());
    assert.ok(weather.forecastNextHour());
    assert.ok(weather.news());
    assert.equal(logs.error.length, 0);
    assert.equal(logs.warn.length, 1);
    assert.match(logs.warn[0], /WeatherKit2\.encode\.compile：已知 2\/3，编译 1\/3，失败 1\/3，未知 1\/3/);
    assert.match(logs.warn[0], /airQuality#0/);
    assert.match(logs.warn[0], /futureProduct/);
});

test("decode isolates one malformed selected product and keeps other selected slots", () => {
    const sourceBytes = createWeatherRoot([4, 5]);
    const originalPlacementsLength = News.prototype.placementsLength;
    let logs;
    News.prototype.placementsLength = () => {
        throw new Error("malformed placements vector");
    };
    try {
        logs = captureConsole(() => WeatherKit2.decode(new ByteBuffer(sourceBytes), ["news", "forecastNextHour"]));
    } finally {
        News.prototype.placementsLength = originalPlacementsLength;
    }

    assert.deepEqual(Object.keys(logs.result), ["forecastNextHour"]);
    assert.equal(logs.error.length, 0);
    assert.equal(logs.warn.length, 1);
    assert.match(logs.warn[0], /WeatherKit2\.decode\.parse：已知 2\/2，解析 1\/2，失败 1\/2，未知 0\/2/);
    assert.match(logs.warn[0], /news#5/);
});

test("slot dictionary logs debug on success, warn on opaque slots, and error on an unreadable root", () => {
    const success = captureConsole(() => WeatherKit2.encode(undefined, { news: { placements: [] } }));
    assert.equal(success.warn.length, 0);
    assert.equal(success.error.length, 0);
    assert.ok(success.debug.some(message => message.includes("WeatherKit2.encode.compile")));
    assert.ok(success.debug.some(message => message.includes("WeatherKit2.encode.slots")));
    assert.ok(success.debug.some(message => message.includes("WeatherKit2.encode.assemble")));

    const partial = captureConsole(() => WeatherKit2.decode(new ByteBuffer(createWeatherRoot([4, 12])), ["forecastNextHour"]));
    assert.equal(partial.error.length, 0);
    assert.equal(partial.warn.length, 2);
    assert.match(partial.warn[0], /WeatherKit2\.decode\.slots：已知 1\/2，读取 2\/2，失败 0\/2，未知 1\/2/);
    assert.match(partial.warn[0], /slot#12/);
    assert.match(partial.warn[1], /WeatherKit2\.decode\.parse：已知 1\/2，解析 1\/2，失败 0\/2，未知 1\/2/);

    const invalidBytes = new Uint8Array(8);
    new DataView(invalidBytes.buffer).setUint32(0, 64, true);
    const fatal = captureConsole(() => {
        assert.throws(() => WeatherKit2.decode(new ByteBuffer(invalidBytes), []), /root table is outside/);
    });
    assert.equal(fatal.error.length, 1);
    assert.match(fatal.error[0], /WeatherKit2\.decode/);

    const invalidPatch = captureConsole(() => {
        assert.throws(() => WeatherKit2.encode(undefined, []), /patch must be an object/);
    });
    assert.equal(invalidPatch.error.length, 1);
    assert.match(invalidPatch.error[0], /WeatherKit2\.encode/);
});

test("encode without a source creates a complete root containing only patch keys", () => {
    const rawBody = WeatherKit2.encode(undefined, { news: { placements: [] } });
    const weather = Weather.getRootAsWeather(new ByteBuffer(rawBody));

    assert.ok(weather.news());
    assert.equal(weather.forecastNextHour(), null);
    assert.deepEqual(Object.keys(WeatherKit2.decode(new ByteBuffer(rawBody), ["news", "forecastNextHour"])), ["news"]);
});

test("response preserves an injection root outside the requested dataSets", async () => {
    const originalBytes = createWeatherRoot([4, 5]);
    const response = await Response(
        {
            url: "https://weatherkit.apple.com/api/v2/weather/en-US/22.5431/114.0579?country=US&dataSets=news",
        },
        {
            bodyBytes: originalBytes,
            headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
        },
    );

    const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["forecastNextHour", "news"]);

    assert.deepEqual(Object.keys(decoded), ["forecastNextHour", "news"]);
});

test("response rewrites an injection root when its dataSet was requested", async () => {
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
    const responseBytes = new Uint8Array(response.body);

    assert.notDeepEqual(responseBytes, originalBytes);
    assert.deepEqual(Object.keys(WeatherKit2.decode(new ByteBuffer(responseBytes), ["forecastNextHour", "news"])), ["forecastNextHour", "news"]);
});

test("response rewrites only National Warning Center weatherAlerts collection details URL", async () => {
    const originalBytes = createWeatherAlertRoot();
    const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["weatherAlerts"]);
    const expectedDetailsUrl = "https://weatherkit.apple.com/alertDetails/index.html?ids=32.115,118.814&lang=zh-CN&timezone=Asia%2FShanghai&party=apple";

    for (const handler of [Response, ResponseDev]) {
        const response = await handler(
            {
                headers: {},
                url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/32.115/118.814?timezone=Asia%2FShanghai&country=CN&dataSets=weatherAlerts",
            },
            {
                bodyBytes: originalBytes,
                headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
            },
        );
        const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

        assert.equal(decoded.weatherAlerts.detailsUrl, expectedDetailsUrl);
        assert.equal(decoded.weatherAlerts.metadata.attributionUrl, originalDecoded.weatherAlerts.metadata.attributionUrl);
        assert.equal(decoded.weatherAlerts.alerts[0].detailsUrl, originalDecoded.weatherAlerts.alerts[0].detailsUrl);
        assert.equal(decoded.weatherAlerts.alerts[0].attributionUrl, originalDecoded.weatherAlerts.alerts[0].attributionUrl);
    }
});

test("response does not rewrite weatherAlerts details URL for other providers", async () => {
    const originalBytes = createWeatherAlertRoot("The Weather Channel");
    const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["weatherAlerts"]);

    for (const handler of [Response, ResponseDev]) {
        const response = await handler(
            {
                headers: {},
                url: "https://weatherkit.apple.com/api/v2/weather/en-US/32.115/118.814?timezone=Asia%2FShanghai&country=US&dataSets=weatherAlerts",
            },
            {
                bodyBytes: originalBytes,
                headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
            },
        );
        const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

        assert.equal(decoded.weatherAlerts.detailsUrl, originalDecoded.weatherAlerts.detailsUrl);
        assert.equal(decoded.weatherAlerts.metadata.attributionUrl, originalDecoded.weatherAlerts.metadata.attributionUrl);
        assert.equal(decoded.weatherAlerts.alerts[0].detailsUrl, originalDecoded.weatherAlerts.alerts[0].detailsUrl);
        assert.equal(decoded.weatherAlerts.alerts[0].attributionUrl, originalDecoded.weatherAlerts.alerts[0].attributionUrl);
    }
});

test("development response patches a dynamically decoded non-injection root when its dataSet was requested", async () => {
    const originalBytes = WeatherKit2.encode(undefined, {
        news: {
            metadata: {
                providerName: "The Weather Channel",
            },
            placements: [],
        },
    });
    const request = {
        headers: {},
        url: "https://weatherkit.apple.com/api/v2/weather/en-US/22.5431/114.0579?country=US&dataSets=news",
    };
    const previousRequest = globalThis.$request;
    globalThis.$request = request;
    let response;
    try {
        response = await ResponseDev(request, {
            bodyBytes: originalBytes,
            headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
        });
    } finally {
        globalThis.$request = previousRequest;
    }
    const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["news"]);

    assert.equal(decoded.news.metadata.providerLogo, "https://weatherkit.apple.com/assets/v2/TWC.png");
});

function createWeatherRoot(presentSlots) {
    const builder = new Builder(256);
    const tables = new Map(presentSlots.map(slot => [slot, createEmptyTable(builder)]));
    builder.startObject(Math.max(10, ...presentSlots.map(slot => slot + 1)));
    for (const [slot, offset] of tables) builder.addFieldOffset(slot, offset, 0);
    const root = builder.endObject();
    builder.finish(root);
    return builder.asUint8Array().slice();
}

function createWeatherAlertRoot(providerName = "国家预警信息发布中心") {
    const qWeatherUrl = "https://www.qweather.com/severe-weather/qixia-101190112.html?from=AppleWeatherService";
    return WeatherKit2.encode(undefined, {
        weatherAlerts: {
            metadata: {
                attributionUrl: qWeatherUrl,
                expireTime: 1_785_623_706,
                language: "zh-CN",
                latitude: 32.115,
                longitude: 118.814,
                providerName,
                readTime: 1_785_623_406,
                reportedTime: 1_785_573_420,
                temporarilyUnavailable: false,
                sourceType: "STATION",
            },
            alerts: [
                {
                    areaId: "",
                    areaName: "",
                    attributionUrl: qWeatherUrl,
                    certainty: "unknown",
                    countryCode: "CN",
                    description: "高温",
                    detailsUrl: qWeatherUrl,
                    effectiveTime: 1_785_573_420,
                    eventEndTime: 0,
                    eventOnsetTime: 0,
                    eventSource: "CN",
                    expireTime: 1_785_659_820,
                    id: "3c9fabb5-4d8e-3d1a-9579-bc3c5b050c1f",
                    importance: "high",
                    issuedTime: 1_785_573_420,
                    phenomenon: "Other",
                    responses: [],
                    severity: "severe",
                    significance: "unknown",
                    source: "国家预警信息发布中心",
                    token: "11B09",
                    urgency: "unknown",
                    unknown23: 0,
                    unknown24: 0,
                    unknown25: 0,
                    unknown26: 0,
                },
            ],
            detailsUrl: qWeatherUrl,
        },
    });
}

function createEmptyTable(builder) {
    builder.startObject(0);
    return builder.endObject();
}

function captureConsole(run) {
    const original = {
        debug: Console.debug,
        error: Console.error,
        warn: Console.warn,
    };
    const messages = {
        debug: [],
        error: [],
        warn: [],
    };
    Console.debug = (...values) => messages.debug.push(values.map(String).join(" "));
    Console.error = (...values) => messages.error.push(values.map(String).join(" "));
    Console.warn = (...values) => messages.warn.push(values.map(String).join(" "));

    try {
        return { ...messages, result: run() };
    } finally {
        Console.debug = original.debug;
        Console.error = original.error;
        Console.warn = original.warn;
    }
}
