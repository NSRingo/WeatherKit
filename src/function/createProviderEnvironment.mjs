// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import ColorfulClouds from "../class/ColorfulClouds.mjs";
import QWeather from "../class/QWeather.mjs";
import WAQI from "../class/WAQI.mjs";
import { weatherAlertParameters } from "./weatherAlertLanguage.mjs";
export default function createProviderEnvironment(parameters, settings, transport) {
    let colorfulClouds, qWeather, waqi, weatherAlertsColorfulClouds, weatherAlertsQWeather;
    const alertParameters = weatherAlertParameters(parameters, settings);
    return {
        country: parameters.country,
        transport,
        get colorfulClouds() {
            return (colorfulClouds ??= new ColorfulClouds(parameters, settings.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==", transport));
        },
        get qWeather() {
            return (qWeather ??= new QWeather(parameters, settings.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", settings.API?.QWeather?.Host, transport));
        },
        get weatherAlertsColorfulClouds() {
            if (alertParameters === parameters) return this.colorfulClouds;
            return (weatherAlertsColorfulClouds ??= new ColorfulClouds(alertParameters, settings.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==", transport));
        },
        get weatherAlertsQWeather() {
            if (alertParameters === parameters) return this.qWeather;
            return (weatherAlertsQWeather ??= new QWeather(alertParameters, settings.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", settings.API?.QWeather?.Host, transport));
        },
        get waqi() {
            return (waqi ??= new WAQI(parameters, settings.API?.WAQI?.Token, transport));
        },
    };
}
