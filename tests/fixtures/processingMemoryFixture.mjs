// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import * as WK from "@nsringo/weatherkit";
import { Builder, ByteBuffer } from "flatbuffers";
import WeatherKit2 from "../../src/class/WeatherKit2.mjs";

export const currentWeather = {
    metadata: { providerName: "Apple", temporarilyUnavailable: false },
    temperature: 20,
    precipitationAmountNext1hByType: [],
    precipitationAmountNext24hByType: [],
    precipitationAmountNext6hByType: [],
    precipitationAmountPrevious1hByType: [],
    precipitationAmountPrevious24hByType: [],
    precipitationAmountPrevious6hByType: [],
};
export function weatherFixture(hours = 273, alerts = 4) {
    return WeatherKit2.encode(undefined, {
        currentWeather,
        forecastHourly: {
            metadata: { providerName: "Apple", temporarilyUnavailable: false },
            hours: Array.from({ length: hours }, (_, index) => ({ forecastStart: 1792368000 + index * 3600, temperature: 20 + (index % 5), humidity: 50, windSpeed: 2, precipitationAmountByType: [{ precipitationType: "RAIN", expected: 0 }] })),
        },
        weatherAlerts: {
            metadata: { providerName: "National Early Warning Center", temporarilyUnavailable: false },
            detailsUrl: "https://weatherkit.apple.com/alertDetails/index.html?ids=32.39,119.499",
            alerts: Array.from({ length: alerts }, (_, index) => ({
                id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
                description: `Apple warning ${index}`,
                areaId: String(index),
                areaName: `Fixture area ${index}`,
                severity: "UNKNOWN",
                responses: [],
                expireTime: 4102444800,
            })),
        },
    });
}

export const futureHourlyText = "future-hourly-field-must-survive";
export function futureHourlyFixture() {
    const builder = new Builder();
    const provider = builder.createString("Apple");
    WK.Metadata.startMetadata(builder);
    WK.Metadata.addProviderName(builder, provider);
    const metadata = WK.Metadata.endMetadata(builder);
    const hours = WK.HourlyForecastData.createHoursVector(builder, []);
    const future = builder.createString(futureHourlyText);
    builder.startObject(3);
    WK.HourlyForecastData.addMetadata(builder, metadata);
    WK.HourlyForecastData.addHours(builder, hours);
    builder.addFieldOffset(2, future, 0);
    const hourly = builder.endObject();
    WK.Weather.startWeather(builder);
    WK.Weather.addForecastHourly(builder, hourly);
    builder.finish(WK.Weather.endWeather(builder));
    return WeatherKit2.encode(new ByteBuffer(builder.asUint8Array()), { currentWeather });
}
export function readFutureHourly(bytes) {
    const hourly = WK.Weather.getRootAsWeather(new ByteBuffer(bytes)).forecastHourly();
    const field = hourly.bb.__offset(hourly.bb_pos, 8);
    return field ? hourly.bb.__string(hourly.bb_pos + field) : undefined;
}

export const weatherNow = {
    code: "200",
    updateTime: "2026-11-01T00:00:00+08:00",
    fxLink: "https://example.test/weather",
    now: { obsTime: "2026-11-01T00:00:00+08:00", temp: "23", feelsLike: "24", text: "Sunny", icon: "100", wind360: "90", windSpeed: "1", humidity: "80", precip: "0", pressure: "1000", vis: "10", cloud: "20", dew: "15" },
};
