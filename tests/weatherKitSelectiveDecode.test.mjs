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
const qWeatherAlertHtml = `<!doctype html>
<html>
    <head><title>建邺天气预警</title></head>
    <body>
        <h1 class="c-submenu__location">建邺</h1>
        <div class="c-city-warning-events warning--orange">
            <h3>建邺区气象台发布高温橙色预警信号。</h3>
            <p>发布日期：2026-08-02T17:48:00+08:00</p>
            <p class="warning-events__txt">预计明天最高气温可达37℃以上。</p>
            <div class="warning-defense__txt"><p>1. 做好防暑降温。</p><p>2. 避免高温时段户外活动。</p></div>
        </div>
        <div class="c-city-warning-around"></div>
    </body>
</html>`;
const qWeatherAlertAPI = {
    metadata: {
        attributions: ["国家预警信息发布中心", "当前预警数据可能存在延迟或信息过时，以官方数据发布为准。"],
    },
    alerts: [
        {
            id: "202608021200000000000001",
            areaId: "320000",
            areaName: "江苏省",
            senderName: "江苏省气象台",
            issuedTime: "2026-08-02T04:00Z",
            effectiveTime: "2026-08-02T04:00Z",
            onsetTime: "2026-08-02T04:00Z",
            eventType: { name: "雷电", code: "1014" },
            severity: "moderate",
            headline: "江苏省气象台发布雷电黄色预警",
            description: "江苏省气象台发布雷电黄色预警。",
            criteria: "可能发生雷电活动",
            responseTypes: [],
            instruction: "密切关注天气变化。",
        },
        {
            id: "202608021748225061499885",
            areaId: "320100",
            areaName: "南京市",
            senderName: "南京市气象台",
            issuedTime: "2026-08-02T09:48Z",
            effectiveTime: "2026-08-02T09:48Z",
            onsetTime: "2026-08-02T09:48Z",
            eventType: { name: "高温", code: "1009" },
            severity: "severe",
            headline: "南京市气象台发布高温橙色预警",
            description: "南京市气象台2026年08月02日17时44分继续发布高温橙色预警信号：预计明天全市大部分地区的日最高气温可达37℃以上，请注意防暑降温。",
            criteria: "日最高气温升至37℃以上",
            responseTypes: [],
            instruction: "1.政府及相关部门按照职责落实防暑降温保障措施。\n2.尽量避免在高温时段进行户外活动，高温条件下作业的人员应缩短连续工作时间。\n3.对老、弱、病、幼人群提供防暑降温指导，并采取必要的防护措施。\n4.做好高温火灾隐患排查，注意用火用电安全。",
        },
    ],
};
const qWeatherHighTemperatureAlert = qWeatherAlertAPI.alerts[1];
const colorfulCloudsRealtimeAPI = {
    status: "ok",
    location: [31.23, 121.47],
    result: {
        realtime: { status: "ok" },
        alert: {
            status: "ok",
            content: [
                {
                    code: "0703",
                    description: "南京市气象台发布高温橙色预警：预计明天最高气温可达37℃以上。",
                    regionId: "101190101",
                    pubtimestamp: 1785664080,
                    alertId: "32010041600000_20260802174800",
                    title: "南京市气象台发布高温橙色预警[II/严重]",
                    adcode: "320100",
                    source: "南京市气象台",
                    location: "南京市",
                    request_status: "ok",
                },
            ],
            adcodes: [{ adcode: 320100, name: "南京市" }],
        },
    },
};

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

test("response preserves the user-supplied QWeather Alert API path", async () => {
    const expectedAttributionUrl = "https://developer.qweather.com/attribution.html";
    const expectedOnsetTime = Math.trunc(new Date(qWeatherHighTemperatureAlert.onsetTime).getTime() / 1000);
    const originalArgument = globalThis.$argument;
    const originalHttpClient = globalThis.$httpClient;
    let sourceRequest;
    globalThis.$argument = {
        API: { QWeather: { Host: "devapi.qweather.com", Token: "user-token" } },
        LogLevel: "OFF",
        Storage: "Argument",
        WeatherAlerts: { Provider: "QWeather" },
    };
    globalThis.$httpClient = {
        get(resource, callback) {
            sourceRequest = resource;
            callback(undefined, { headers: { "Content-Type": "application/json" }, status: 200 }, JSON.stringify(qWeatherAlertAPI));
        },
    };

    try {
        for (const providerName of ["国家预警信息发布中心", "國家預警信息發布中心", "National Early Warning Center"]) {
            const originalBytes = createWeatherAlertRoot(providerName);
            const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["weatherAlerts"]);
            const expectedDetailsUrl = "https://weatherkit.apple.com/alertDetails/index.html?ids=31.23,121.47&lang=zh-CN&party=QWeather";
            const expectedEndTime = originalDecoded.weatherAlerts.alerts[0].expireTime;
            for (const handler of [Response, ResponseDev]) {
                const request = {
                    headers: {},
                    url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/31.23/121.47?timezone=Asia%2FShanghai&country=CN&dataSets=weatherAlerts",
                };
                const response = await runResponseHandler(handler, request, {
                    bodyBytes: originalBytes,
                    headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
                });
                const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

                assert.equal(sourceRequest.url, "https://devapi.qweather.com/weatheralert/v1/current/31.23/121.47?lang=zh-hans", providerName);
                assert.equal(sourceRequest.headers["X-QW-Api-Key"], "user-token", providerName);
                assert.equal(decoded.weatherAlerts.detailsUrl, expectedDetailsUrl, providerName);
                assert.equal(decoded.weatherAlerts.metadata.attributionUrl, expectedAttributionUrl, providerName);
                assert.equal(decoded.weatherAlerts.metadata.readTime, originalDecoded.weatherAlerts.metadata.readTime, providerName);
                assert.equal(decoded.weatherAlerts.metadata.reportedTime, originalDecoded.weatherAlerts.metadata.reportedTime, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].detailsUrl, originalDecoded.weatherAlerts.alerts[0].detailsUrl, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].attributionUrl, originalDecoded.weatherAlerts.alerts[0].attributionUrl, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].areaId, qWeatherHighTemperatureAlert.areaId, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].areaName, qWeatherHighTemperatureAlert.areaName, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].description, "高温橙色预警", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].eventOnsetTime, expectedOnsetTime, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].eventEndTime, expectedEndTime, providerName);
                assert.deepEqual(decoded.weatherAlerts.alerts[0].responses, ["AVOID", "PREPARE"], providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].certainty, "UNKNOWN", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].importance, "HIGH", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].severity, "SEVERE", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].significance, "UNKNOWN", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].urgency, "UNKNOWN", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].source, originalDecoded.weatherAlerts.alerts[0].source, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].issuedTime, originalDecoded.weatherAlerts.alerts[0].issuedTime, providerName);
            }
        }
    } finally {
        globalThis.$argument = originalArgument;
        globalThis.$httpClient = originalHttpClient;
    }
});

test("response selects ColorfulClouds v2.6 alerts explicitly", async () => {
    const originalArgument = globalThis.$argument;
    const originalHttpClient = globalThis.$httpClient;
    let sourceUrl;
    globalThis.$argument = {
        API: { ColorfulClouds: { Token: "colorful-token" }, QWeather: { Host: "devapi.qweather.com", Token: "qweather-token" } },
        LogLevel: "OFF",
        Storage: "Argument",
        WeatherAlerts: { Provider: "ColorfulClouds" },
    };
    globalThis.$httpClient = {
        get(resource, callback) {
            sourceUrl = new URL(resource.url);
            callback(undefined, { headers: { "Content-Type": "application/json" }, status: 200 }, JSON.stringify(colorfulCloudsRealtimeAPI));
        },
    };

    try {
        for (const handler of [Response, ResponseDev]) {
            const originalBytes = createWeatherAlertRoot("国家预警信息发布中心");
            const response = await runResponseHandler(
                handler,
                {
                    headers: {},
                    url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/31.23/121.47?timezone=Asia%2FShanghai&country=CN&dataSets=weatherAlerts",
                },
                {
                    bodyBytes: originalBytes,
                    headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
                },
            );
            const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

            assert.equal(sourceUrl.toString(), "https://api.caiyunapp.com/v2.6/colorful-token/121.47,31.23/realtime?lang=zh_CN&alert=true");
            assert.equal(decoded.weatherAlerts.metadata.attributionUrl, "https://www.caiyunapp.com/h5");
            assert.equal(decoded.weatherAlerts.detailsUrl, "https://weatherkit.apple.com/alertDetails/index.html?ids=31.23,121.47&lang=zh-CN&party=ColorfulClouds");
            assert.equal(decoded.weatherAlerts.alerts[0].description, "高温橙色预警");
        }
    } finally {
        globalThis.$argument = originalArgument;
        globalThis.$httpClient = originalHttpClient;
    }
});

test("response derives QWeather HTML alerts and the internal details URL from the FlatBuffer severe-weather URL", async () => {
    const expectedDetailsUrl = "https://weatherkit.apple.com/alertDetails/index.html?ids=jian'an-101180407&lang=zh-CN&party=qweather";
    const expectedAttributionUrl = "https://www.qweather.com/severe-weather/jian'an-101180407.html?from=AppleWeatherService";
    const expectedOnsetTime = Math.trunc(new Date("2026-08-02T17:48:00+08:00").getTime() / 1000);
    const originalArgument = globalThis.$argument;
    const originalHttpClient = globalThis.$httpClient;
    let sourceUrl;
    globalThis.$argument = {
        API: { ColorfulClouds: { Token: "colorful-token" }, QWeather: { Host: "devapi.qweather.com", Token: "qweather-token" } },
        LogLevel: "OFF",
        Storage: "Argument",
        WeatherAlerts: { Provider: "QWeatherWeb" },
    };
    globalThis.$httpClient = {
        get(resource, callback) {
            sourceUrl = new URL(resource.url);
            callback(undefined, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }, qWeatherAlertHtml);
        },
    };

    try {
        for (const providerName of ["国家预警信息发布中心", "國家預警信息發布中心", "National Early Warning Center"]) {
            const originalBytes = createWeatherAlertRoot(providerName);
            const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["weatherAlerts"]);
            const expectedEndTime = originalDecoded.weatherAlerts.alerts[0].expireTime;
            for (const handler of [Response, ResponseDev]) {
                const request = {
                    headers: {},
                    url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/31.23/121.47?timezone=Asia%2FShanghai&country=CN&dataSets=weatherAlerts",
                };
                const response = await runResponseHandler(handler, request, {
                    bodyBytes: originalBytes,
                    headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
                });
                const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

                assert.equal(sourceUrl.toString(), "https://www.qweather.com/severe-weather/jian'an-101180407.html?from=AppleWeatherService", providerName);
                assert.equal(decoded.weatherAlerts.detailsUrl, expectedDetailsUrl, providerName);
                assert.equal(decoded.weatherAlerts.metadata.attributionUrl, expectedAttributionUrl, providerName);
                assert.equal(decoded.weatherAlerts.metadata.readTime, originalDecoded.weatherAlerts.metadata.readTime, providerName);
                assert.equal(decoded.weatherAlerts.metadata.reportedTime, originalDecoded.weatherAlerts.metadata.reportedTime, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].detailsUrl, originalDecoded.weatherAlerts.alerts[0].detailsUrl, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].attributionUrl, originalDecoded.weatherAlerts.alerts[0].attributionUrl, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].areaId, "101180407", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].areaName, "建邺", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].description, "高温橙色预警", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].eventOnsetTime, expectedOnsetTime, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].eventEndTime, expectedEndTime, providerName);
                assert.deepEqual(decoded.weatherAlerts.alerts[0].responses, ["AVOID"], providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].certainty, "UNKNOWN", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].importance, "HIGH", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].severity, "SEVERE", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].significance, "UNKNOWN", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].urgency, "UNKNOWN", providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].source, originalDecoded.weatherAlerts.alerts[0].source, providerName);
                assert.equal(decoded.weatherAlerts.alerts[0].issuedTime, originalDecoded.weatherAlerts.alerts[0].issuedTime, providerName);
            }
        }
    } finally {
        globalThis.$argument = originalArgument;
        globalThis.$httpClient = originalHttpClient;
    }
});

test("response preserves the original WeatherAlert slot when WeatherKit is selected", async () => {
    const originalArgument = globalThis.$argument;
    const originalHttpClient = globalThis.$httpClient;
    globalThis.$argument = {
        LogLevel: "OFF",
        Storage: "Argument",
        WeatherAlerts: { Provider: "WeatherKit" },
    };
    globalThis.$httpClient = {
        get() {
            assert.fail("WeatherKit must not fetch a replacement WeatherAlert source");
        },
    };

    try {
        const originalBytes = createWeatherAlertRoot();
        const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["weatherAlerts"]);
        for (const handler of [Response, ResponseDev]) {
            const response = await runResponseHandler(
                handler,
                {
                    headers: {},
                    url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/31.23/121.47?timezone=Asia%2FShanghai&country=CN&dataSets=weatherAlerts",
                },
                {
                    bodyBytes: originalBytes,
                    headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
                },
            );
            const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

            assert.deepEqual(decoded.weatherAlerts, originalDecoded.weatherAlerts);
        }
    } finally {
        globalThis.$argument = originalArgument;
        globalThis.$httpClient = originalHttpClient;
    }
});

test("response does not rewrite weatherAlerts without a supported QWeather severe-weather URL", async () => {
    const originalBytes = createWeatherAlertRoot("The Weather Channel", "https://weather.com/alerts/example");
    const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["weatherAlerts"]);

    for (const handler of [Response, ResponseDev]) {
        const request = {
            headers: {},
            url: "https://weatherkit.apple.com/api/v2/weather/en-US/32.115/118.814?timezone=Asia%2FShanghai&country=US&dataSets=weatherAlerts",
        };
        const response = await runResponseHandler(handler, request, {
            bodyBytes: originalBytes,
            headers: { "Content-Type": "application/vnd.apple.flatbuffer" },
        });
        const decoded = WeatherKit2.decode(new ByteBuffer(new Uint8Array(response.body)), ["weatherAlerts"]);

        assert.equal(decoded.weatherAlerts.detailsUrl, originalDecoded.weatherAlerts.detailsUrl);
        assert.equal(decoded.weatherAlerts.metadata.attributionUrl, originalDecoded.weatherAlerts.metadata.attributionUrl);
        assert.equal(decoded.weatherAlerts.alerts[0].detailsUrl, originalDecoded.weatherAlerts.alerts[0].detailsUrl);
        assert.equal(decoded.weatherAlerts.alerts[0].attributionUrl, originalDecoded.weatherAlerts.alerts[0].attributionUrl);
    }
});

test("development response preserves a dynamically decoded non-injection root when its dataSet was requested", async () => {
    const originalBytes = WeatherKit2.encode(undefined, {
        news: {
            metadata: {
                providerName: "The Weather Channel",
            },
            placements: [],
        },
    });
    const originalDecoded = WeatherKit2.decode(new ByteBuffer(originalBytes), ["news"]);
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

    assert.deepEqual(decoded.news, originalDecoded.news);
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

function createWeatherAlertRoot(providerName = "国家预警信息发布中心", qWeatherUrl = "https://www.qweather.com/severe-weather/jian'an-101180407.html?from=AppleWeatherService") {
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
                    certainty: "UNKNOWN",
                    countryCode: "CN",
                    description: "高温",
                    detailsUrl: qWeatherUrl,
                    effectiveTime: 1_785_573_420,
                    eventEndTime: 0,
                    eventOnsetTime: 0,
                    eventSource: "CN",
                    expireTime: 1_785_659_820,
                    id: "3c9fabb5-4d8e-3d1a-9579-bc3c5b050c1f",
                    importance: "HIGH",
                    issuedTime: 1_785_573_420,
                    phenomenon: "Other",
                    responses: [],
                    severity: "SEVERE",
                    significance: "UNKNOWN",
                    source: "国家预警信息发布中心",
                    token: "11B09",
                    urgency: "UNKNOWN",
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

async function runResponseHandler(handler, request, response) {
    const previousRequest = globalThis.$request;
    globalThis.$request = request;
    try {
        return await handler(request, response);
    } finally {
        globalThis.$request = previousRequest;
    }
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
