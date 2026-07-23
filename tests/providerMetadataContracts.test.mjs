import assert from "node:assert/strict";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };
globalThis.$httpClient = {
    get(request, callback) {
        let body;
        if (request.url.includes("api.caiyunapp.com")) {
            if (request.url.includes("/realtime")) body = colorfulRealtime;
            else if (request.url.includes("/minutely")) body = colorfulMinutely;
            else if (request.url.includes("/hourly")) body = colorfulHourly;
            else if (request.url.includes("/daily")) body = colorfulDaily;
        } else if (request.url.includes("/v7/minutely/5m")) body = qWeatherMinutely;
        else if (request.url.includes("/v7/weather/24h")) body = qWeatherHourly;
        else if (request.url.includes("/v7/weather/10d")) body = qWeatherDaily;

        if (!body) throw new Error(`unexpected request: ${request.url}`);
        callback(null, { headers: {}, status: 200 }, JSON.stringify(body));
    },
};

const [{ default: ColorfulClouds }, { default: QWeather }, { default: WeatherKit2 }, { Console }] = await Promise.all([import("../src/class/ColorfulClouds.mjs"), import("../src/class/QWeather.mjs"), import("../src/class/WeatherKit2.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";

const parameters = {
    country: "CN",
    language: "zh-Hans",
    latitude: 22.537,
    longitude: 113.899,
    version: "v2",
};

test("ColorfulClouds maps the API latitude-longitude response order in every weather product", async () => {
    const provider = new ColorfulClouds(parameters, "token");
    const products = [await provider.CurrentWeather(), await provider.ForecastHourly(1), await provider.Daily(1), await provider.Minutely()];

    for (const product of products) {
        assert.equal(product.metadata.latitude, parameters.latitude);
        assert.equal(product.metadata.longitude, parameters.longitude);
    }
});

test("QWeather serializes provider updateTime as reportedTime in every forecast product", async () => {
    const provider = new QWeather(parameters, "token");
    const expected = Math.trunc(Date.parse(qWeatherHourly.updateTime) / 1000);
    const expectedMinutely = Math.trunc(Date.parse(qWeatherMinutely.updateTime) / 1000);
    const hourly = await provider.Hourly(24);
    const daily = await provider.Daily(10);
    const nextHour = await provider.Minutely();

    assert.equal(hourly.metadata.reportedTime, expected);
    assert.equal(daily.metadata.reportedTime, expected);
    assert.equal(nextHour.metadata.reportedTime, expectedMinutely);
    assert.equal(roundTrip("forecastHourly", hourly).metadata.reportedTime, expected);
    assert.equal(roundTrip("forecastNextHour", nextHour).metadata.reportedTime, expectedMinutely);
});

function roundTrip(dataSet, data) {
    const rawBody = WeatherKit2.encode(undefined, { [dataSet]: data });
    return WeatherKit2.decode(new ByteBuffer(rawBody), [dataSet])[dataSet];
}

const location = [parameters.latitude, parameters.longitude];
const serverTime = 1_784_160_000;

const colorfulRealtime = {
    location,
    result: {
        realtime: {
            apparent_temperature: 30,
            cloudrate: 0.5,
            humidity: 0.8,
            precipitation: { local: { intensity: 1 } },
            pressure: 100_000,
            skycon: "RAIN",
            status: "ok",
            temperature: 26,
            visibility: 10,
            wind: { direction: 180, speed: 3 },
        },
        server_time: serverTime,
    },
    server_time: serverTime,
    status: "ok",
};

const colorfulHourly = {
    location,
    result: {
        hourly: {
            apparent_temperature: [{ value: 30 }],
            cloudrate: [{ value: 0.5 }],
            humidity: [{ value: 0.8 }],
            precipitation: [{ probability: 80, value: 1 }],
            pressure: [{ value: 100_000 }],
            skycon: [{ datetime: "2026-07-16T09:00:00+08:00", value: "RAIN" }],
            status: "ok",
            temperature: [{ value: 26 }],
            visibility: [{ value: 10 }],
            wind: [{ direction: 180, speed: 3 }],
        },
        server_time: serverTime,
    },
    status: "ok",
};

const colorfulDaily = {
    location,
    result: {
        daily: {
            skycon: [{ date: "2026-07-16T00:00:00+08:00", value: "RAIN" }],
            status: "ok",
        },
    },
    server_time: serverTime,
    status: "ok",
};

const colorfulMinutely = {
    location,
    result: {
        minutely: {
            description: "未来一小时有雨",
            precipitation_2h: [0.2, 0.3],
            probability: [0.8, 0.8, 0.8, 0.8],
            status: "ok",
        },
    },
    server_time: serverTime,
    status: "ok",
};

const qWeatherHourly = {
    code: "200",
    fxLink: "https://www.qweather.com/",
    hourly: [
        {
            cloud: "50",
            dew: "24",
            fxTime: "2026-07-16T09:00:00+08:00",
            humidity: "80",
            pop: "80",
            precip: "1.0",
            pressure: "1000",
            temp: "26",
            text: "中雨",
            wind360: "180",
            windSpeed: "3",
        },
    ],
    updateTime: "2026-07-16T08:00:00+08:00",
};

const qWeatherDaily = {
    code: "200",
    daily: [
        {
            fxDate: "2026-07-16",
            moonPhase: "满月",
            moonrise: "20:00",
            moonset: "06:00",
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
    updateTime: qWeatherHourly.updateTime,
};

const qWeatherMinutely = {
    code: "200",
    fxLink: "https://www.qweather.com/",
    minutely: [
        {
            fxTime: "2026-07-16T08:05:00+08:00",
            precip: "0.2",
        },
    ],
    summary: "未来一小时有小雨",
    updateTime: "2026-07-16T08:00:37+08:00",
};
