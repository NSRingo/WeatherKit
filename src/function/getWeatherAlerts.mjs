// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Shared by native entries and both general request processors.
import { Console } from "@nsnanocat/util";
import ColorfulClouds from "../class/ColorfulClouds.mjs";
import QWeather from "../class/QWeather.mjs";
import WeatherAlerts from "../class/WeatherAlerts.mjs";
import { activeProviderAlerts, providerProductAvailable } from "./providerRecovery.mjs";
import { weatherAlertLanguage, weatherAlertParameters } from "./weatherAlertLanguage.mjs";

/**
 * 获取天气预警响应
 * @param {string | undefined} identifier - 预警标识
 * @param {ReturnType<import("./parseWeatherKitURL.mjs").default>} parameters - WeatherKit 请求参数
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {Record<string, string>} headers - 请求头
 * @param {import("../class/ProviderTransport.mjs").default} runtime - 当前请求传输校验
 * @returns {Promise<object | undefined>} 天气预警响应，undefined 保留 Apple 请求
 */
export async function GetWeatherAlerts(identifier, parameters, Settings, headers, runtime) {
    const preferredLanguage = weatherAlertLanguage(Settings);
    parameters = weatherAlertParameters(parameters, Settings);
    // Providers can return original or mixed-language notices despite a language request.
    // Do not falsely label those messages as a verified translation of the selected language.
    const messageLanguage = preferredLanguage ? "und" : parameters?.language;
    const warningHeaders = preferredLanguage ? { ...headers, "Accept-Language": preferredLanguage, "accept-language": preferredLanguage } : headers;
    let body;
    try {
        switch (true) {
            case /^[^&#]*-[0-9]{9}$/.test(identifier): {
                Console.info("☑️ QWeather.FetchWeatherAlertPage", `ids: ${identifier}`);
                const source = await QWeather.FetchWeatherAlertPage(identifier, parameters.language, warningHeaders, runtime);
                if (!providerProductAvailable(source) || !Array.isArray(source.alerts)) {
                    return undefined;
                }
                body = WeatherAlerts.Build(
                    { ...source, alerts: activeProviderAlerts(source?.alerts) },
                    {
                        attributionUrl: QWeather.BuildWeatherAlertPageURL(identifier, parameters.language, false),
                        identifier,
                        language: messageLanguage,
                        countryCode: identifier.match(/-([0-9]+)$/)?.[1]?.startsWith("101") ? "CN" : "",
                    },
                );
                break;
            }
            case /^-?[0-9]+(?:\.[0-9]+)?,-?[0-9]+(?:\.[0-9]+)?$/.test(identifier): {
                if (parameters.latitude === undefined || parameters.longitude === undefined) return undefined;
                switch (Settings?.WeatherAlerts?.Provider) {
                    case "ColorfulClouds": {
                        Console.info("☑️ ColorfulClouds.WeatherAlert", `ids: ${identifier}`);
                        const colorfulClouds = new ColorfulClouds(parameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==", runtime);
                        const source = await colorfulClouds.WeatherAlert();
                        if (!providerProductAvailable(source) || !Array.isArray(source.alerts)) {
                            return undefined;
                        }
                        body = WeatherAlerts.Build(
                            { ...source, alerts: activeProviderAlerts(source?.alerts) },
                            {
                                attributionUrl: source?.metadata?.attributionUrl ?? "https://www.caiyunapp.com/h5",
                                identifier: `${parameters.latitude},${parameters.longitude}`,
                                language: messageLanguage,
                                countryCode: parameters.country,
                            },
                        );
                        break;
                    }
                    case "QWeatherWeb":
                    case "QWeather": {
                        const qWeather = new QWeather(parameters, Settings?.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", Settings?.API?.QWeather?.Host, runtime);
                        const source = await qWeather.WeatherAlert();
                        if (!providerProductAvailable(source) || !Array.isArray(source.alerts)) {
                            return undefined;
                        }
                        body = WeatherAlerts.Build(
                            { ...source, alerts: activeProviderAlerts(source?.alerts) },
                            {
                                attributionUrl: "https://www.12379.cn/",
                                identifier: `${parameters.latitude},${parameters.longitude}`,
                                language: messageLanguage,
                                countryCode: parameters.country,
                            },
                        );
                        break;
                    }
                }
                break;
            }
        }
    } catch {
        return undefined;
    }
    if (!Array.isArray(body)) return undefined;
    Console.info("✅ WeatherAlerts", `alerts: ${body.length}`, "status: 200");
    return {
        status: 200,
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": preferredLanguage ? "no-store" : "max-age=0",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}
