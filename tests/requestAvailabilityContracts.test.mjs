import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = {
    LogLevel: "OFF",
    Storage: "Argument",
    DataSets: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly"],
};

const [{ default: parseWeatherKitURL }, { Request }, { Request: RequestDev }, { Response }, { Response: ResponseDev }, { default: database }] = await Promise.all([
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

test("WeatherKit Alert URLs expose validated coordinates through the shared URL parser", () => {
    assert.deepEqual(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&country=CN&ids=32.115,118.814")), {
        version: "v1",
        language: "zh-CN",
        latitude: "32.115",
        longitude: "118.814",
        country: "CN",
        dataSets: [],
    });
    assert.equal(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=118.814,32.115")).latitude, undefined);
    assert.equal(parseWeatherKitURL(new URL("https://weatherkit.apple.com/api/v1/weatherAlerts/extra?ids=32.115,118.814")).latitude, undefined);
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

test("only response-injectable datasets remain configurable", () => {
    assert.deepEqual(database.WeatherKit.Settings.DataSets, ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour"]);
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
