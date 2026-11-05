// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import ColorfulClouds from "../class/ColorfulClouds.mjs";
import QWeather from "../class/QWeather.mjs";
import WAQI from "../class/WAQI.mjs";
export default function createProviderEnvironment(parameters, settings, requestCache) {
    let colorfulClouds, qWeather, waqi;
    return {
        country: parameters.country,
        requestCache,
        get colorfulClouds() {
            return (colorfulClouds ??= new ColorfulClouds(parameters, settings.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==", requestCache));
        },
        get qWeather() {
            return (qWeather ??= new QWeather(parameters, settings.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", settings.API?.QWeather?.Host, requestCache));
        },
        get waqi() {
            return (waqi ??= new WAQI(parameters, settings.API?.WAQI?.Token, requestCache));
        },
    };
}
