import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { Builder, ByteBuffer } from "flatbuffers";
import { WK3 } from "@nsringo/weatherkit";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "Argument" };

const [{ default: WeatherKit3 }, { default: ColorfulClouds }, { default: QWeather }, { default: MatchEnum }, { Response }, { Response: ResponseDev }, { Request: RequestDev }, { Storage }] = await Promise.all([
    import("../src/class/WeatherKit3.mjs"),
    import("../src/class/ColorfulClouds.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/class/MatchEnum.mjs"),
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/process/Request.dev.mjs"),
    import("@nsnanocat/util"),
]);
const fixture = new Uint8Array(readFileSync(new URL("./fixtures/wk3-aq.synthetic.bin", import.meta.url)));
const replacement = {
    metadata: { providerName: "Replacement", sourceType: "MODELED", reportedTime: 2000000000, temporarilyUnavailable: false },
    scale: "EPA_NowCast",
    index: 175,
    categoryIndex: 4,
    isSignificant: true,
    primaryPollutant: "PM2_5",
    pollutants: [{ pollutantType: "PM2_5", amount: 50, units: "MICROGRAMS_PER_CUBIC_METER" }],
    previousDayComparison: "UNKNOWN",
};

beforeEach(() => {
    globalThis.$argument = {
        LogLevel: "OFF",
        Storage: "Argument",
        DataSets: ["airQuality", "currentWeather", "forecastNextHour", "weatherAlerts"],
        AirQuality: {
            Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["EPA_NowCast"] }, Pollutants: { Provider: "ColorfulClouds", Units: { Replace: [] } } },
            Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: "ColorfulCloudsUS" } },
        },
    };
    globalThis.$request = {
        method: "GET",
        headers: {},
        url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=airQuality,currentWeather,forecastNextHour,weatherAlerts",
    };
});

function child(bytes, slot) {
    const bb = new ByteBuffer(bytes),
        root = bb.readUint32(0),
        field = bb.__offset(root, 4 + 2 * slot);
    return field ? bb.__indirect(root + field) : 0;
}

function mockProvider(t) {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => structuredClone(replacement));
    t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", async () => ({ ...structuredClone(replacement), index: 25, categoryIndex: 1, isSignificant: false }));
    t.mock.method(ColorfulClouds.prototype, "Minutely", async () => assert.fail("WK3 nextHour must remain opaque"));
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => assert.fail("WK3 currentWeather must remain opaque"));
    // 空 detailsUrl 是空操作：返回 undefined，不发起抓取 / Empty detailsUrl is a no-op returning undefined.
    t.mock.method(QWeather.prototype, "WeatherAlertWeb", async () => undefined);
}

async function response(bytes = fixture, handler = ResponseDev) {
    return handler(globalThis.$request, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, bodyBytes: bytes });
}

test("AQ codec reads independently encoded numeric values into existing business names", () => {
    const decoded = WeatherKit3.decode(new ByteBuffer(fixture), ["forecastNextHour", "weatherAlerts", "airQuality"]);
    // 槽 9 占位表是合法的空集合（0 字段），槽 5 占位表结构非法被隔离 / The slot-9 placeholder is a valid empty collection; the slot-5 one is structurally invalid and isolated.
    assert.deepEqual(Object.keys(decoded), ["airQuality", "weatherAlerts"]);
    assert.equal(decoded.airQuality.index, 60);
    assert.equal(decoded.airQuality.metadata.sourceType, "STATION");
    assert.equal(decoded.airQuality.primaryPollutant, "PM2_5");
    assert.deepEqual(decoded.airQuality.pollutants, [{ pollutantType: "PM2_5", amount: 12.5, units: "MICROGRAMS_PER_CUBIC_METER" }]);
    assert.equal(decoded.airQuality.previousDayComparison, "BETTER");
});

test("WK3 replaces AQ through existing business rules and preserves all other root arenas", async t => {
    mockProvider(t);
    const original = fixture.slice(),
        output = (await response()).body;
    const aq = WK3.Weather.getRootAsWeather(new ByteBuffer(output)).airQuality();
    assert.equal(aq.index(), 175);
    assert.equal(aq.categoryIndex(), 4);
    assert.equal(aq.isSignificant(), true);
    assert.equal(aq.previousDayComparison(), 2);
    assert.equal(aq.primaryPollutant(), 9);
    assert.equal(aq.pollutants(0).pollutantType(), 9);
    assert.equal(aq.pollutants(0).units(), 2);
    assert.equal(aq.pollutants(0).amount(), 12.5, "existing pollutant settings retain Apple's concentrations");
    assert.equal(aq.metadata().sourceType(), 3);
    assert.match(aq.metadata().providerName(), /Replacement/);
    const shift = child(output, 17) - child(original, 17);
    assert.equal(shift % 8, 0);
    assert.deepEqual(output.subarray(shift, shift + original.length), original);
    for (const slot of [1, 2, 3, 4, 5, 9, 14, 17]) assert.equal(child(output, slot) - child(original, slot), shift);
    assert.deepEqual(fixture, original);
});

test("request and settings intersection prevents unsupported or disabled WK3 work", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => assert.fail("AQ must not be requested"));
    globalThis.$request.url = globalThis.$request.url.replace("dataSets=airQuality,", "dataSets=");
    assert.deepEqual((await response()).body, fixture);
    globalThis.$request.url = globalThis.$request.url.replace("dataSets=", "dataSets=airQuality,");
    globalThis.$argument.DataSets = ["currentWeather"];
    assert.deepEqual((await response()).body, fixture);
});

test("unknown AQ fields, nested fields, and enum values retain the original response", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => assert.fail("Rejected AQ must not trigger injection"));
    for (const target of ["airQuality", "metadata", "pollutant", "enum"]) {
        const bytes = fixture.slice(),
            bb = new ByteBuffer(bytes),
            aq = WK3.Weather.getRootAsWeather(bb).airQuality();
        const table = target === "metadata" ? aq.metadata() : ["pollutant", "enum"].includes(target) ? aq.pollutants(0) : aq;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (target === "enum") view.setUint8(table.bb_pos + bb.__offset(table.bb_pos, 4), 231);
        else {
            const vtable = table.bb_pos - bb.readInt32(table.bb_pos);
            view.setUint16(vtable, bb.readUint16(vtable) + 2, true);
        }
        assert.deepEqual((await response(bytes)).body, bytes, target);
    }
});

test("missing AQ can use the existing provider fill without touching other roots", async t => {
    mockProvider(t);
    const bytes = fixture.slice(),
        bb = new ByteBuffer(bytes),
        root = bb.readUint32(0);
    new DataView(bytes.buffer).setUint16(root - bb.readInt32(root) + 4, 0, true);
    const output = (await response(bytes)).body;
    const aq = WK3.Weather.getRootAsWeather(new ByteBuffer(output)).airQuality();
    assert.equal(aq.index(), 175);
    assert.equal(aq.metadata().sourceType(), 2);
    assert.equal(aq.pollutants(0).amount(), 50);
    assert.equal(aq.previousDayComparison(), 2);
    const shift = child(output, 17) - child(bytes, 17);
    assert.deepEqual(output.subarray(shift, shift + bytes.length), bytes);
});

test("unsupported provider enums or out-of-range scalars do not replace AQ", async t => {
    mockProvider(t);
    for (const patch of [{ primaryPollutant: "UNVERIFIED" }, { index: 40000 }, { index: NaN }]) {
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => ({ ...structuredClone(replacement), ...patch }));
        assert.deepEqual((await response()).body, fixture);
    }
});

test("Surge entry returns a top-level Uint8Array response and preserves input on provider errors", async t => {
    mockProvider(t);
    const previousDone = globalThis.$done,
        previousResponse = globalThis.$response,
        previousScript = globalThis.$script;
    t.after(() => {
        globalThis.$done = previousDone;
        globalThis.$response = previousResponse;
        globalThis.$script = previousScript;
    });
    globalThis.$script = { startTime: Date.now() / 1000 };
    for (const failure of [false, true]) {
        if (failure)
            t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => {
                throw new Error("provider offline");
            });
        globalThis.$response = { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: fixture.slice() };
        const output = await new Promise((resolve, reject) => {
            globalThis.$done = resolve;
            import(new URL(`../src/response.dev.js?wk3-provider-error=${failure}`, import.meta.url)).catch(reject);
        });
        assert.ok(output.body instanceof Uint8Array);
        assert.equal(output.response, undefined);
        if (failure) assert.deepEqual(output.body, fixture);
        else assert.equal(WK3.Weather.getRootAsWeather(new ByteBuffer(output.body)).airQuality().index(), 175);
    }
});

test("formal response still leaves v3 untouched", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => assert.fail("formal v3 must remain untouched"));
    assert.deepEqual((await response(fixture, Response)).body, fixture);
});

test("dev v3 requests reuse the macOS country fix and retain requested dataSets", async t => {
    const getItem = Storage.getItem;
    t.mock.method(Storage, "getItem", function (key, ...args) {
        return key === "@iRingo.Location.Caches" ? { pep: { gcc: "CN" } } : getItem.call(this, key, ...args);
    });
    const request = { method: "GET", headers: { "User-Agent": "WeatherKit_Weather_macOS_Version 27" }, url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?dataSets=airQuality,forecastNextHour,futureProduct" };
    const { $request } = await RequestDev(request);
    const url = new URL($request.url);
    assert.equal(url.searchParams.get("country"), "CN");
    assert.equal(url.searchParams.get("dataSets"), "airQuality,forecastNextHour,futureProduct");
    assert.equal(url.pathname, "/api/v3/weather/en-US/31.25/121.5");
});

test("debug enum comparisons use the selected protocol table", () => {
    const previousNotification = globalThis.$notification,
        messages = [];
    globalThis.$notification = { post: (...args) => messages.push(args) };
    try {
        const matcher = new MatchEnum({ forecastNextHour: { condition: [{ startTime: 1, forecastToken: "START" }] } }, "v3");
        matcher.json = { forecastNextHour: { condition: [{ startTime: 1, forecastToken: "STOP" }] } };
        matcher.forecastToken();
        assert.match(messages[0][2], /proto: 2-START/);
    } finally {
        globalThis.$notification = previousNotification;
    }
});

test("all dev module templates route weather v2 and v3 to the existing entries", () => {
    for (const platform of ["surge", "loon", "stash", "quantumultx"]) {
        const text = readFileSync(new URL(`../template/${platform}.dev.handlebars`, import.meta.url), "utf8");
        const lines = text.split("\n").filter(line => line.includes("weatherkit") && line.includes("\\/weather\\/") && line.includes("^https?"));
        assert.equal(lines.length, 4, platform);
        for (const line of lines) {
            const start = line.indexOf("^https?"),
                end = line.indexOf("\\/weather\\/", start) + "\\/weather\\/".length;
            const pattern = new RegExp(line.slice(start, end));
            const owner = Number(pattern.source.match(/api\\?\/v(\d)\\?\//)?.[1]);
            for (const version of [1, 2, 3, 4]) {
                assert.equal(pattern.test(`https://weatherkit.apple.com/api/v${version}/weather/en-US/31/121`), version === owner, `${platform}: v${owner} rule must only match v${owner}`);
            }
        }
    }
});

/***************** WK3 合成包构造 / Synthetic WK3 builders *****************/
function buildWK3(entries) {
    const builder = new Builder(2048);
    const offsets = entries.map(([id, build]) => [id, build(builder)]);
    builder.startObject(15);
    for (const [id, offset] of offsets) builder.addFieldOffset(id, offset, 0);
    builder.finish(builder.endObject());
    return builder.asUint8Array().slice();
}

function buildWK3AirQuality(builder) {
    const metadata = WK3.Metadata.createMetadata(builder, 0, 2000000100, builder.createString("zh-CN"), 31.25, 121.5, 0, builder.createString("Synthetic"), 2000000000, 2000000000, false, 3);
    const pollutants = WK3.AirQuality.createPollutantsVector(builder, [WK3.Pollutant.createPollutant(builder, 9, 12.5, 2)]);
    return WK3.AirQuality.createAirQuality(builder, metadata, 2, 60, false, pollutants, 4, 9, builder.createString("EPA_NowCast"));
}

function buildWK3Alerts(builder, detailsUrl = "https://www.qweather.com/severe-weather/101010100.html?from=AppleWeatherService") {
    const id = WK3.Common.UUID.createUUID(
        builder,
        WK3.Common.UUID.createBytesVector(
            builder,
            Array.from({ length: 16 }, (_, i) => i),
        ),
    );
    const responses = WK3.WeatherAlertSummary.createResponsesVector(builder, [7]);
    const alert = WK3.WeatherAlertSummary.createWeatherAlertSummary(builder, id, builder.createString("101010100"), 0, builder.createString("CN"), builder.createString("大风蓝色预警"), 0, 2000000000, 2000003600, 2000000000, 2000000000, 2000003600, 0, 0, 4, 10, 0, 0, 2, 2, 2, responses);
    const alerts = WK3.WeatherAlertCollectionData.createAlertsVector(builder, [alert]);
    return WK3.WeatherAlertCollectionData.createWeatherAlertCollectionData(builder, builder.createString(detailsUrl), alerts);
}

const nextHourReplacement = {
    metadata: { providerName: "彩云天气", sourceType: "MODELED", reportedTime: 2000000000, temporarilyUnavailable: false },
    forecastStart: 2000000000,
    forecastEnd: 2000000180,
    minutes: [0, 1, 2].map(i => ({ startTime: 2000000000 + i * 60, precipitationChance: 80, precipitationIntensity: 1.5, perceivedPrecipitationIntensity: 1.5 })),
    summary: [{ startTime: 2000000000, endTime: 2000000180, precipitationChance: 80, precipitationIntensity: 1.5, condition: "RAIN" }],
    condition: [{ startTime: 2000000000, endTime: 2000000180, forecastToken: "CONSTANT", beginCondition: "RAIN", endCondition: "RAIN", parameters: [] }],
};

test("WK3 injects a physically missing nextHour product into slot 5", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => structuredClone(replacement));
    t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", async () => ({ ...structuredClone(replacement), index: 25, categoryIndex: 1 }));
    t.mock.method(ColorfulClouds.prototype, "Minutely", async () => structuredClone(nextHourReplacement));
    t.mock.method(QWeather.prototype, "WeatherAlertWeb", async () => assert.fail("missing alerts collection must not trigger alert injection"));
    const output = (await response(buildWK3([[0, buildWK3AirQuality]]))).body;
    const weather = WK3.Weather.getRootAsWeather(new ByteBuffer(output));
    const nextHour = weather.forecastNextHour();
    assert.ok(nextHour);
    assert.equal(nextHour.forecastStart(), 2000000000);
    assert.equal(nextHour.forecastEnd(), 2000000180);
    assert.equal(nextHour.minutesLength(), 3);
    assert.equal(nextHour.minutes(1).precipitationChance(), 80);
    assert.equal(nextHour.minutes(1).precipitationIntensity(), 1.5);
    assert.equal(nextHour.condition(0).forecastToken(), 6); // CONSTANT
    assert.equal(nextHour.condition(0).beginCondition(), 7); // RAIN
    assert.equal(nextHour.summary(0).precipitationChance(), 80);
    // 摘要槽位 2（condition 枚举向量）未验证，不写入 / Summary slot 2 (condition vector) stays unwritten
    const summaryTable = nextHour.summary(0);
    assert.equal(summaryTable.bb.__offset(summaryTable.bb_pos, 8), 0);
    assert.equal(weather.airQuality().index(), 175);
});

test("WK3 merges weather alerts in slot 9 and rewrites detailsUrl when changed", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => structuredClone(replacement));
    t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", async () => ({ ...structuredClone(replacement), index: 25, categoryIndex: 1 }));
    t.mock.method(ColorfulClouds.prototype, "Minutely", async () => structuredClone(nextHourReplacement));
    t.mock.method(QWeather.prototype, "WeatherAlertWeb", async () => ({
        metadata: { providerName: "和风天气", temporarilyUnavailable: false },
        detailsUrl: "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=101010100&lang=zh-CN",
        alerts: [{ description: "中央气象台发布大风蓝色预警", source: "中央气象台", phenomenon: "大风", severity: "MINOR" }],
    }));
    const output = (
        await response(
            buildWK3([
                [0, buildWK3AirQuality],
                [9, buildWK3Alerts],
            ]),
        )
    ).body;
    const collection = WK3.Weather.getRootAsWeather(new ByteBuffer(output)).weatherAlerts();
    assert.equal(collection.detailsUrl(), "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=101010100&lang=zh-CN");
    const alert = collection.alerts(0);
    assert.equal(alert.description(), "大风蓝色预警"); // 来源标题规范化后与 Apple 一致 / normalized source title matches Apple's
    assert.equal(alert.source(), "中央气象台");
    assert.equal(alert.phenomenon(), "大风");
    assert.equal(alert.severity(), 4); // MINOR 保持 / MINOR preserved
    assert.deepEqual(
        Array.from(alert.id().bytesArray()),
        Array.from({ length: 16 }, (_, i) => i),
    );
});

test("WK3 returns the original bytes when nothing changed", async t => {
    t.mock.method(QWeather.prototype, "WeatherAlertWeb", async () => undefined);
    globalThis.$argument.DataSets = ["weatherAlerts"];
    const bytes = buildWK3([[9, buildWK3Alerts]]);
    assert.deepEqual((await response(bytes)).body, bytes);
});

test("WK3 skips a failed AQ slot but still merges alerts", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => assert.fail("failed AQ must not be injected"));
    t.mock.method(QWeather.prototype, "WeatherAlertWeb", async () => ({
        metadata: { providerName: "和风天气", temporarilyUnavailable: false },
        detailsUrl: "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=101010100&lang=zh-CN",
        alerts: [{ description: "中央气象台发布大风蓝色预警", source: "中央气象台" }],
    }));
    const bytes = buildWK3([
        [0, buildWK3AirQuality],
        [9, buildWK3Alerts],
    ]);
    const bb = new ByteBuffer(bytes);
    const pollutant = WK3.Weather.getRootAsWeather(bb).airQuality().pollutants(0);
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint8(pollutant.bb_pos + bb.__offset(pollutant.bb_pos, 4), 231);
    const output = (await response(bytes)).body;
    const weather = WK3.Weather.getRootAsWeather(new ByteBuffer(output));
    // AQ 解码失败，原始 arena 保留 / The failed AQ slot keeps its original arena
    assert.equal(weather.airQuality().pollutants(0).pollutantType(), 231);
    assert.equal(weather.airQuality().index(), 60);
    // 预警正常合并 / Alerts merge proceeds
    assert.equal(weather.weatherAlerts().detailsUrl(), "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=101010100&lang=zh-CN");
    assert.equal(weather.weatherAlerts().alerts(0).source(), "中央气象台");
});

test("WK3 drops condition entries with unverified enums when injecting nextHour", async t => {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => structuredClone(replacement));
    t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", async () => ({ ...structuredClone(replacement), index: 25, categoryIndex: 1 }));
    t.mock.method(ColorfulClouds.prototype, "Minutely", async () => ({
        ...structuredClone(nextHourReplacement),
        condition: [
            { startTime: 2000000000, endTime: 2000000060, forecastToken: "STOP_START", beginCondition: "RAIN", endCondition: "RAIN", parameters: [] },
            { startTime: 2000000060, endTime: 2000000180, forecastToken: "START", beginCondition: "CLEAR", endCondition: "RAIN", parameters: [{ type: "FIRST_AT", date: 2000000060 }] },
        ],
    }));
    const output = (await response(buildWK3([[0, buildWK3AirQuality]]))).body;
    const nextHour = WK3.Weather.getRootAsWeather(new ByteBuffer(output)).forecastNextHour();
    // WK3 ForecastToken 无 STOP_START，该条目整条跳过 / STOP_START has no WK3 token, so the entry is dropped
    assert.equal(nextHour.conditionLength(), 1);
    assert.equal(nextHour.condition(0).forecastToken(), 2); // START
    assert.equal(nextHour.condition(0).parameters(0).type(), 1); // FIRST_AT
});
