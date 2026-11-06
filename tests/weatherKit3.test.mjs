import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { ByteBuffer } from "flatbuffers";
import { WK3 } from "@nsringo/weatherkit";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "Argument" };

const [{ default: WeatherKit3 }, { default: ColorfulClouds }, { default: QWeather }, { default: MatchEnum }, { Response }, { Response: ResponseDev }, { Request: RequestDev }, { Storage }] = await Promise.all([
    import("../src/class/WeatherKit3.mjs"), import("../src/class/ColorfulClouds.mjs"), import("../src/class/QWeather.mjs"),
    import("../src/class/MatchEnum.mjs"), import("../src/process/Response.mjs"), import("../src/process/Response.dev.mjs"),
    import("../src/process/Request.dev.mjs"), import("@nsnanocat/util"),
]);
const fixture = new Uint8Array(readFileSync(new URL("./fixtures/wk3-aq.synthetic.bin", import.meta.url)));
const replacement = {
    metadata: { providerName: "Replacement", sourceType: "MODELED", reportedTime: 2000000000, temporarilyUnavailable: false },
    scale: "EPA_NowCast", index: 175, categoryIndex: 4, isSignificant: true,
    primaryPollutant: "PM2_5", pollutants: [{ pollutantType: "PM2_5", amount: 50, units: "MICROGRAMS_PER_CUBIC_METER" }], previousDayComparison: "UNKNOWN",
};

beforeEach(() => {
    globalThis.$argument = {
        LogLevel: "OFF", Storage: "Argument", DataSets: ["airQuality", "currentWeather", "forecastNextHour", "weatherAlerts"],
        AirQuality: {
            Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["EPA_NowCast"] }, Pollutants: { Provider: "ColorfulClouds", Units: { Replace: [] } } },
            Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: "ColorfulCloudsUS" } },
        },
    };
    globalThis.$request = {
        method: "GET", headers: {},
        url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=airQuality,currentWeather,forecastNextHour,weatherAlerts",
    };
});

function child(bytes, slot) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + 2 * slot);
    return field ? bb.__indirect(root + field) : 0;
}

function mockProvider(t) {
    t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => structuredClone(replacement));
    t.mock.method(ColorfulClouds.prototype, "YesterdayAirQuality", async () => ({ ...structuredClone(replacement), index: 25, categoryIndex: 1, isSignificant: false }));
    t.mock.method(ColorfulClouds.prototype, "Minutely", async () => assert.fail("WK3 nextHour must remain opaque"));
    t.mock.method(ColorfulClouds.prototype, "CurrentWeather", async () => assert.fail("WK3 currentWeather must remain opaque"));
    t.mock.method(QWeather.prototype, "WeatherAlertWeb", async () => assert.fail("WK3 alerts must remain opaque"));
}

async function response(bytes = fixture, handler = ResponseDev) {
    return handler(globalThis.$request, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, bodyBytes: bytes });
}

test("AQ codec reads independently encoded numeric values into existing business names", () => {
    const decoded = WeatherKit3.decode(new ByteBuffer(fixture), ["forecastNextHour", "weatherAlerts", "airQuality"]);
    assert.deepEqual(Object.keys(decoded), ["airQuality"]);
    assert.equal(decoded.airQuality.index, 60);
    assert.equal(decoded.airQuality.metadata.sourceType, "STATION");
    assert.equal(decoded.airQuality.primaryPollutant, "PM2_5");
    assert.deepEqual(decoded.airQuality.pollutants, [{ pollutantType: "PM2_5", amount: 12.5, units: "MICROGRAMS_PER_CUBIC_METER" }]);
    assert.equal(decoded.airQuality.previousDayComparison, "BETTER");
});

test("WK3 replaces AQ through existing business rules and preserves all other root arenas", async t => {
    mockProvider(t);
    const original = fixture.slice(), output = (await response()).body;
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
        const bytes = fixture.slice(), bb = new ByteBuffer(bytes), aq = WK3.Weather.getRootAsWeather(bb).airQuality();
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
    const bytes = fixture.slice(), bb = new ByteBuffer(bytes), root = bb.readUint32(0);
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
    const previousDone = globalThis.$done, previousResponse = globalThis.$response, previousScript = globalThis.$script;
    t.after(() => { globalThis.$done = previousDone; globalThis.$response = previousResponse; globalThis.$script = previousScript; });
    globalThis.$script = { startTime: Date.now() / 1000 };
    for (const failure of [false, true]) {
        if (failure) t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => { throw new Error("provider offline"); });
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
    const previousNotification = globalThis.$notification, messages = [];
    globalThis.$notification = { post: (...args) => messages.push(args) };
    try {
        const matcher = new MatchEnum({ forecastNextHour: { condition: [{ startTime: 1, forecastToken: "START" }] } }, "v3");
        matcher.json = { forecastNextHour: { condition: [{ startTime: 1, forecastToken: "STOP" }] } };
        matcher.forecastToken();
        assert.match(messages[0][2], /proto: 2-START/);
    } finally { globalThis.$notification = previousNotification; }
});

test("all dev module templates route weather v2 and v3 to the existing entries", () => {
    for (const platform of ["surge", "loon", "stash", "quantumultx"]) {
        const text = readFileSync(new URL(`../template/${platform}.dev.handlebars`, import.meta.url), "utf8");
        const lines = text.split("\n").filter(line => line.includes("weatherkit") && line.includes("\\/weather\\/") && line.includes("^https?"));
        assert.equal(lines.length, 4, platform);
        for (const line of lines) {
            const start = line.indexOf("^https?"), end = line.indexOf("\\/weather\\/", start) + "\\/weather\\/".length;
            const pattern = new RegExp(line.slice(start, end));
            const owner = Number(pattern.source.match(/api\\?\/v(\d)\\?\//)?.[1]);
            for (const version of [1, 2, 3, 4]) {
                assert.equal(pattern.test(`https://weatherkit.apple.com/api/v${version}/weather/en-US/31/121`), version === owner, `${platform}: v${owner} rule must only match v${owner}`);
            }
        }
    }
});
