// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0

import ProviderRequestCache from "../class/ProviderRequestCache.mjs";
import database from "../function/database.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import setENV from "../function/setENV.mjs";
import { GetWeatherAlerts } from "../process/Request.mjs";

(async () => {
    const url = new URL($request.url),
        identifier = url.searchParams.get("ids")?.trim();
    if (url.hostname !== "weatherkit.apple.com" || url.pathname !== "/api/v1/weatherAlerts" || ($request.method && !["GET", "HEAD", "OPTIONS"].includes($request.method)) || !identifier) return $request;
    const { Settings } = setENV("iRingo", "WeatherKit", database);
    const parameters = parseWeatherKitURL(url, { fallback: Settings.Region?.Fallback ?? "Auto" });
    const runtime = ProviderRequestCache.fromSettings(Settings);
    try {
        const response = await GetWeatherAlerts(identifier, parameters, Settings, $request.headers, runtime);
        return response ? { response } : $request;
    } finally {
        runtime.report("request");
    }
})().then(
    value => $done(value),
    () => $done($request),
);
