// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
export default function planWeatherProducts(requested, settings, country, hasNextHour = false) {
    return requested.filter(product => {
        if (["currentWeather", "forecastDaily", "forecastHourly"].includes(product)) return ["QWeather", "ColorfulClouds"].includes(settings.Weather?.Provider) && settings.Weather?.Replace?.includes(country);
        if (product === "forecastNextHour") return settings.NextHour?.Provider !== "WeatherKit" && !hasNextHour;
        if (product === "weatherAlerts") return settings.WeatherAlerts?.Provider !== "WeatherKit";
        return product === "airQuality";
    });
}
