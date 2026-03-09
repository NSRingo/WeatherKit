import assert from "node:assert/strict";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };

const [{ default: AirQuality }, { default: QWeather }, { default: WAQI }, { default: WeatherKit2 }, { Console }] = await Promise.all([import("../src/class/AirQuality.mjs"), import("../src/class/QWeather.mjs"), import("../src/class/WAQI.mjs"), import("../src/class/WeatherKit2.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";

test("all built-in AQ algorithms use Apple versionless scale aliases", () => {
    const expectedScales = {
        UBA: "UBA",
        EU_EAQI: "EU.EAQI",
        HJ6332012: "HJ6332012",
        HJ6332025_DRAFT: "HJ6332012",
        EPA_NowCast: "EPA_NowCast",
        WAQI_InstantCast_US: "EPA_NowCast",
        WAQI_InstantCast_CN: "HJ6332012",
        WAQI_InstantCast_CN_25_DRAFT: "HJ6332012",
        HK_AQHI: "HK.AQHI",
        CA_AQHI: "CA.AQHI",
        CN_DEATH_AQHI: "CN.AQHI",
        CN_DEATH_HK_AQHI: "CN.AQHI",
        AQHI_Multi_CN: "CA.AQHI",
        AQHI_Multi_CN_HK: "CA.AQHI",
    };

    for (const [algorithm, expectedScale] of Object.entries(expectedScales)) {
        assert.equal(AirQuality.ToWeatherKitScale(AirQuality.Config.Scales[algorithm].weatherKitScale), expectedScale, algorithm);
    }
});

test("scale helpers match dotted aliases without rewriting them", () => {
    assert.equal(AirQuality.ScaleMatches("EU.EAQI", "EU.EAQI"), true);
    assert.equal(AirQuality.ScaleMatches("EU.EAQI.2414", "EU.EAQI"), true);
    assert.equal(AirQuality.ScaleMatches("EU.EAQI.beta", "EU.EAQI"), false);
    assert.equal(AirQuality.ToWeatherKitScale({ name: "HK.AQHI", version: "2414" }), "HK.AQHI.2414");
});

test("response processing does not rewrite scale identifiers", () => {
    assert.equal(AirQuality.NormalizeScaleIdentifier, undefined);
});

test("calculated EU AQI keeps its numeric fields and current scale through FlatBuffer encoding", () => {
    const airQuality = AirQuality.Pollutants2AQI(
        {
            metadata: { providerName: "test" },
            pollutants: [{ pollutantType: "PM2_5", amount: 25, units: "MICROGRAMS_PER_CUBIC_METER" }],
        },
        {},
        { algorithm: "EU_EAQI" },
    );

    assert.equal(Number.isFinite(airQuality.index), true);
    assert.equal(Number.isFinite(airQuality.categoryIndex), true);
    assert.equal(airQuality.scale, "EU.EAQI");

    const rawBody = WeatherKit2.encode(undefined, { airQuality });
    const decoded = WeatherKit2.decode(new ByteBuffer(rawBody), ["airQuality"]).airQuality;

    assert.equal(decoded.index, airQuality.index);
    assert.equal(decoded.categoryIndex, airQuality.categoryIndex);
    assert.equal(decoded.scale, "EU.EAQI");
});

test("WAQI normalizes category and stable scale alias before WeatherKit encoding", async () => {
    globalThis.$httpClient = {
        get(request, callback) {
            assert.match(request.url, /api2\.waqi\.info\/feed\/geo:/);
            callback(
                null,
                { headers: {}, status: 200 },
                JSON.stringify({
                    status: "ok",
                    data: {
                        aqi: "42",
                        city: { geo: [22.5, 113.9], name: "test", url: "https://example.com" },
                        dominentpol: "pm25",
                        idx: "1",
                        time: { v: 1_784_271_600 },
                    },
                }),
            );
        },
    };

    const airQuality = await new WAQI({ country: "CN", language: "zh-Hans", latitude: 22.5, longitude: 113.9, version: "v2" }, "test-token").AQI2();

    assert.equal(airQuality.index, 42);
    assert.equal(airQuality.categoryIndex, 1);
    assert.equal(airQuality.isSignificant, false);
    assert.equal(airQuality.primaryPollutant, "PM2_5");
    assert.equal(airQuality.scale, "EPA_NowCast");
});

test("QWeather derives a valid category when its index level is null", async () => {
    globalThis.$httpClient = {
        get(request, callback) {
            assert.match(request.url, /airquality\/v1\/current/);
            callback(
                null,
                { headers: {}, status: 200 },
                JSON.stringify({
                    indexes: [{ aqi: "46", code: "us-epa", level: null, primaryPollutant: { code: "pm25" } }],
                    pollutants: [
                        {
                            code: "pm25",
                            concentration: { unit: "μg/m3", value: 12 },
                            subIndexes: [{ aqi: 46, code: "us-epa" }],
                        },
                    ],
                }),
            );
        },
    };

    const airQuality = await new QWeather({ country: "US", language: "en", latitude: 40.7, longitude: -74, version: "v2" }, "test-token").CurrentAirQuality();

    assert.equal(airQuality.index, 46);
    assert.equal(airQuality.categoryIndex, 1);
    assert.equal(airQuality.scale, "EPA_NowCast");
});

test("air-quality comparison rejects unavailable category sentinels", () => {
    const { UNKNOWN } = AirQuality.Config.CompareCategoryIndexes;
    for (const pair of [
        [-1, 2],
        [0, 2],
        [null, 2],
        [2, -1],
        [2, undefined],
    ]) {
        assert.equal(AirQuality.CompareCategoryIndexes(...pair), UNKNOWN, JSON.stringify(pair));
    }
});
