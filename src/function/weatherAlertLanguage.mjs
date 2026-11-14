// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// A source-language preference, never a translation service or a claim about returned text.
export function weatherAlertLanguage(settings) {
    const value = settings?.WeatherAlerts?.Language;
    if (typeof value !== "string") return undefined;
    switch (value.trim().toLowerCase().replaceAll("_", "-")) {
        case "zh":
        case "zh-cn":
        case "zh-hans":
        case "zh-hans-cn":
            return "zh-Hans";
        case "en":
        case "en-us":
        case "en-gb":
            return "en";
        default:
            return undefined;
    }
}

export function weatherAlertParameters(parameters, settings) {
    const language = weatherAlertLanguage(settings);
    return language ? { ...parameters, language, weatherKitLanguage: language } : parameters;
}
