import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = {
    LogLevel: "OFF",
    Storage: "Argument",
    DataSets: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly"],
};

const [{ default: AirQualityScale }, { default: parseWeatherKitURL }, { Request }, { Request: RequestDev }, { Response }, { Response: ResponseDev }, { default: database }] = await Promise.all([
    import("../src/class/AirQualityScale.mjs"),
    import("../src/function/parseWeatherKitURL.mjs"),
    import("../src/process/Request.mjs"),
    import("../src/process/Request.dev.mjs"),
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/function/database.mjs"),
]);

test("WeatherKit locales split language, script, and country deterministically", () => {
    const cases = [
        ["en-US", "en", "US"],
        ["pt-BR", "pt", "BR"],
        ["zh-Hans-US", "zh-Hans", "US"],
    ];

    for (const [locale, language, country] of cases) {
        const parsed = parseWeatherKitURL(new URL(`https://weatherkit.apple.com/api/v2/weather/${locale}/22.5431/114.0579?dataSets=currentWeather`));
        assert.equal(parsed.language, language, locale);
        assert.equal(parsed.country, country, locale);
    }
});

test("air-quality scale URLs expose their exact language and scale through the shared parser", () => {
    assert.deepEqual(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/airQualityScale/zh-Hans-CN/HK.AQHI.2414")), {
        version: "v1",
        language: "zh-Hans-CN",
        scale: "HK.AQHI.2414",
        latitude: undefined,
        longitude: undefined,
        country: undefined,
        dataSets: [],
    });
});

test("WeatherKit Alert URLs expose validated coordinates through the shared URL parser", () => {
    assert.deepEqual(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&country=CN&ids=32.115,118.814")), {
        version: "v1",
        language: "zh-CN",
        scale: undefined,
        latitude: "32.115",
        longitude: "118.814",
        country: "CN",
        dataSets: [],
    });
    assert.equal(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=118.814,32.115")).latitude, undefined);
    assert.equal(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/weatherAlerts/extra?ids=32.115,118.814")).latitude, undefined);
});

test("AirQualityScale exposes class metadata", () => {
    assert.equal(AirQualityScale.Name, "AirQualityScale");
    assert.equal(AirQualityScale.Version, "1.0.0");
    assert.equal(AirQualityScale.Author, "Virgil Clyne & Wordless Echo");
});

test("AirQualityScale resolves maintained language aliases through one builder", () => {
    const builder = new AirQualityScale();
    assert.equal(AirQualityScale.Build, undefined);
    assert.equal(typeof builder.Build, "function");
    assert.equal(AirQualityScale.normalizeLanguage, undefined);
    assert.equal(AirQualityScale.buildHKAQHIScale, undefined);
    assert.equal(AirQualityScale.buildCNAQHIScale, undefined);

    const aliases = [
        ["en", "en-US"],
        ["en-US", "en-US"],
        ["en-GB", "en-US"],
        ["en-AU", "en-US"],
        ["en-CA", "en-US"],
        ["en-IN", "en-US"],
        ["en-Latn-AU", "en-US"],
        ["zh-Hans-CN", "zh-Hans-CN"],
        ["zh-CN", "zh-Hans-CN"],
        ["zh-SG", "zh-Hans-CN"],
        ["zh-Hans-HK", "zh-Hans-CN"],
        ["zh-Hant-HK", "zh-Hant-HK"],
        ["zh-HK", "zh-Hant-HK"],
        ["zh-Hant-MO", "zh-Hant-HK"],
        ["zh-Hant-TW", "zh-Hant-TW"],
        ["zh-TW", "zh-Hant-TW"],
        ["zh", "zh-Hant-TW"],
    ];
    const expected = new Map();
    for (const [language, configLanguage] of aliases) {
        const body = JSON.parse(builder.Build(language, "HK.AQHI").body);
        if (expected.has(configLanguage)) assert.deepEqual(body, expected.get(configLanguage), language);
        else expected.set(configLanguage, body);
    }
});

test("request keeps future datasets while removing a known explicitly disabled dataset", async () => {
    const input = "airQuality,news,forecastPrecipitation,forecastNextHour,currentWeather";
    const expected = ["airQuality", "news", "forecastPrecipitation", "currentWeather"];

    for (const handler of [Request, RequestDev]) {
        const request = {
            headers: {},
            method: "GET",
            url: `https://weatherkit.apple.com/api/v2/weather/en-US/22.5431/114.0579?dataSets=${input}`,
        };
        const result = await handler(request);
        assert.deepEqual(new URL(result.$request.url).searchParams.get("dataSets").split(","), expected);
    }
});

test("request strips numeric versions from every air-quality scale", async () => {
    const cases = [
        ["CA.AQHI.2414", "CA.AQHI"],
        ["EU.EAQI.2604", "EU.EAQI"],
        ["EPA_NowCast.2604", "EPA_NowCast"],
    ];

    for (const handler of [Request, RequestDev]) {
        for (const [inputScale, expectedScale] of cases) {
            const { $request, $response } = await handler({
                headers: {},
                method: "GET",
                url: `https://weatherkit.apple.com/api/v1/airQualityScale/zh-Hans-CN/${inputScale}`,
            });

            assert.equal(new URL($request.url).pathname, `/api/v1/airQualityScale/zh-Hans-CN/${expectedScale}`);
            assert.equal($response, undefined);
        }
    }
});

test("request serves custom AQHI scales locally after stripping their versions", async () => {
    const cases = [
        ["HK.AQHI.2414", "zh-Hant-HK", "HK.AQHI", "zh-Hant-HK"],
        ["CN.AQHI.2414", "zh-Hans-CN", "CN.AQHI", "zh-Hans-CN"],
    ];

    for (const handler of [Request, RequestDev]) {
        for (const [inputScale, language, expectedScale, configLanguage] of cases) {
            const { $request, $response } = await handler({
                headers: {},
                method: "GET",
                url: `https://weatherkit.apple.com/api/v1/airQualityScale/${language}/${inputScale}`,
            });

            assert.equal(new URL($request.url).pathname, `/api/v1/airQualityScale/${language}/${expectedScale}`);
            assert.equal($response.status, 200);
            assert.deepEqual(JSON.parse($response.body), JSON.parse(new AirQualityScale().Build(configLanguage, expectedScale).body));
        }
    }
});

test("request leaves unsupported custom-scale languages to Apple", async () => {
    for (const handler of [Request, RequestDev]) {
        const { $request, $response } = await handler({
            headers: {},
            method: "GET",
            url: "https://weatherkit.apple.com/api/v1/airQualityScale/fr-FR/HK.AQHI.2414",
        });

        assert.equal(new URL($request.url).pathname, "/api/v1/airQualityScale/fr-FR/HK.AQHI");
        assert.equal($response, undefined);
    }
});

test("custom AQHI scales are stored as complete JSON configurations", () => {
    const expectedLanguages = ["zh-Hans-CN", "zh-Hant-HK", "zh-Hant-TW", "en-US"];
    assert.equal(database.WeatherKit.Configs.AirQualityScale, undefined);
    const builder = new AirQualityScale();
    for (const language of expectedLanguages) {
        for (const scaleName of ["HK.AQHI", "CN.AQHI"]) {
            const scale = JSON.parse(builder.Build(language, scaleName).body);
            assert.equal(scale.name, scaleName);
            assert.equal(typeof scale.displayName, "string");
            assert.equal(typeof scale.shortDisplayName, "string");
            assert.equal(typeof scale.longDisplayName, "string");
            assert.equal(typeof scale.displayLabel, "string");
            assert.equal(typeof scale.language, "string");
            assert.equal(scale.version, 1);
            assert.equal(scale.aqi.numerical, true);
            assert.equal(scale.aqi.ascending, true);
            assert.deepEqual(scale.aqi.range, [1, 11]);
            assert.deepEqual(
                scale.aqi.categories.map(({ categoryNumber }) => categoryNumber),
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            );
            for (const category of scale.aqi.categories) {
                assert.deepEqual(category.range, [category.categoryNumber, category.categoryNumber]);
                assert.equal(typeof category.color, "string");
                assert.equal(typeof category.categoryName, "string");
                assert.equal(typeof category.recommendation, "string");
                assert.equal(typeof category.glyph, "string");
            }
            assert.ok(scale.aqi.gradient.stops.length > 0);
        }
    }
});

test("request only serves custom AQHI scales on an exact pathname match", async () => {
    for (const handler of [Request, RequestDev]) {
        const { $response } = await handler({
            headers: {},
            method: "GET",
            url: "https://weatherkit.apple.com/api/v1/airQualityScale/zh-Hans-CN/extra/HK.AQHI.2414",
        });

        assert.equal($response, undefined);
    }
});

test("only response-injectable datasets remain configurable", () => {
    assert.deepEqual(database.WeatherKit.Settings.DataSets, ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour"]);
});

test("provider API defaults live in the database", () => {
    assert.equal(database.WeatherKit.Settings.API.ColorfulClouds.Token, "Y2FpeXVuX25vdGlmeQ==");
    assert.equal(database.WeatherKit.Settings.API.QWeather.Token, "bdd98ec1d87747f3a2e8b1741a5af796");
});

test("availability keeps Apple's capabilities and appends plugin requirements in prod and dev", async () => {
    const appleCapabilities = ["currentWeather", "forecastSnowfall", "weatherMaps"];
    const expected = [...new Set([...appleCapabilities, ...database.WeatherKit.Configs.Availability.v2])];

    for (const handler of [Response, ResponseDev]) {
        const response = await handler(
            { url: "https://weatherkit.apple.com/api/v1/availability/en-US/22.5431/114.0579" },
            {
                body: JSON.stringify(appleCapabilities),
                headers: { "Content-Type": "application/json" },
            },
        );
        assert.deepEqual(JSON.parse(response.body), expected);
    }
});
