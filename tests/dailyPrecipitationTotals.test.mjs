import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };
globalThis.$httpClient = {
    get(request, callback) {
        let body;
        if (request.url.includes("api.caiyunapp.com")) body = colorfulCloudsDaily;
        else if (request.url.includes("/v7/weather/")) body = qWeatherDaily;
        else throw new Error(`unexpected request: ${request.url}`);
        callback(null, { headers: {}, status: 200 }, JSON.stringify(body));
    },
};

const [{ default: ColorfulClouds }, { default: QWeather }, { default: Weather }, { Console }] = await Promise.all([import("../src/class/ColorfulClouds.mjs"), import("../src/class/QWeather.mjs"), import("../src/class/Weather.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";

const parameters = {
    country: "CN",
    language: "zh-Hans",
    latitude: 22.537,
    longitude: 113.899,
    version: "v2",
};

test("ColorfulClouds keeps WeatherKit daily amount pairs while replacing supported fields", async () => {
    const forecast = await new ColorfulClouds(parameters, "token").Daily(1);
    const providerDay = forecast.days[0];

    assertProviderDoesNotSupplyUnpairedAmounts(providerDay);
    const appleDay = mergeIntoAppleDay(providerDay);
    assertAppleAmountPairsRemainIntact(appleDay);
    assert.equal(appleDay.precipitationChance, 80);
    assert.equal(appleDay.daytimeForecast.precipitationChance, 70);
    assert.equal(appleDay.overnightForecast.precipitationChance, 60);
});

test("QWeather keeps WeatherKit daily amount pairs instead of reusing one daily total", async () => {
    const forecast = await new QWeather(parameters, "token").Daily(10);
    const providerDay = forecast.days[0];

    assertProviderDoesNotSupplyUnpairedAmounts(providerDay);
    const appleDay = mergeIntoAppleDay(providerDay);
    assertAppleAmountPairsRemainIntact(appleDay);
    assert.equal(appleDay.daytimeForecast.conditionCode, "RAIN");
    assert.equal(appleDay.overnightForecast.conditionCode, "CLOUDY");
});

function assertProviderDoesNotSupplyUnpairedAmounts(day) {
    assert.equal(Object.hasOwn(day, "precipitationAmount"), false);
    assert.equal(Object.hasOwn(day.daytimeForecast, "precipitationAmount"), false);
    assert.equal(Object.hasOwn(day.overnightForecast, "precipitationAmount"), false);
}

function mergeIntoAppleDay(providerDay) {
    const appleDay = {
        forecastStart: providerDay.forecastStart,
        precipitationAmount: 19,
        precipitationAmountByType: [{ expected: 19, precipitationType: "RAIN" }],
        daytimeForecast: {
            precipitationAmount: 3,
            precipitationAmountByType: [{ expected: 3, precipitationType: "RAIN" }],
        },
        overnightForecast: {
            precipitationAmount: 16,
            precipitationAmountByType: [{ expected: 16, precipitationType: "RAIN" }],
        },
    };
    Weather.mergeForecast([appleDay], [providerDay]);
    return appleDay;
}

function assertAppleAmountPairsRemainIntact(day) {
    assert.equal(day.precipitationAmount, day.precipitationAmountByType[0].expected);
    assert.equal(day.daytimeForecast.precipitationAmount, day.daytimeForecast.precipitationAmountByType[0].expected);
    assert.equal(day.overnightForecast.precipitationAmount, day.overnightForecast.precipitationAmountByType[0].expected);
}

const colorfulCloudsDaily = {
    location: [113.899, 22.537],
    result: {
        daily: {
            cloudrate: [{ avg: 0.8 }],
            humidity: [{ max: 0.9, min: 0.7 }],
            precipitation: [{ avg: 1, probability: 80 }],
            precipitation_08h_20h: [{ avg: 2, probability: 70 }],
            precipitation_20h_32h: [{ avg: 3, probability: 60 }],
            skycon: [{ date: "2026-07-16T00:00:00+08:00", value: "RAIN" }],
            skycon_08h_20h: [{ value: "RAIN" }],
            skycon_20h_32h: [{ value: "CLOUDY" }],
            status: "ok",
            temperature: [{ max: 30, min: 25 }],
            temperature_08h_20h: [{ max: 30, min: 27 }],
            temperature_20h_32h: [{ max: 28, min: 25 }],
            visibility: [{ max: 20, min: 5 }],
            wind: [{ avg: { speed: 3 }, max: { speed: 5 } }],
            wind_08h_20h: [{ avg: { direction: 180, speed: 3 }, max: { speed: 5 } }],
            wind_20h_32h: [{ avg: { direction: 200, speed: 2 }, max: { speed: 4 } }],
        },
    },
    server_time: 1_784_167_551,
    status: "ok",
};

const qWeatherDaily = {
    code: "200",
    daily: [
        {
            fxDate: "2026-07-16",
            moonPhase: "满月",
            moonrise: "20:00",
            moonset: "06:00",
            precip: "1.0",
            sunrise: "05:48",
            sunset: "19:10",
            tempMax: "30",
            tempMin: "25",
            textDay: "中雨",
            textNight: "阴",
            uvIndex: "5",
            wind360Day: "180",
            wind360Night: "200",
            windSpeedDay: "3",
            windSpeedNight: "2",
        },
    ],
    fxLink: "https://www.qweather.com/",
    updateTime: "2026-07-16T08:00:00+08:00",
};
