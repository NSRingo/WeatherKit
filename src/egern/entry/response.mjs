import { configuration } from "./index.mjs";
import { headerObject, responseHeaders } from "./runtime.mjs";
import { Response as processResponse } from "../wk3/process/Response.mjs";
import parseWeatherKitURL from "../wk3/function/parseWeatherKitURL.mjs";
import shouldReplaceWeatherKit from "../wk3/function/shouldReplaceWeatherKit.mjs";
import ColorfulClouds from "../wk3/class/ColorfulClouds.mjs";
import QWeather from "../wk3/class/QWeather.mjs";

async function processingContext(ctx, url, Settings, Configs) {
    const parsed = parseWeatherKitURL(url);
    const parameters = { ...parsed, dataSets: parsed.dataSets.filter(name => Settings.DataSets.includes(name)) };
    const enviroments = {
        colorfulClouds: new ColorfulClouds(parameters, Settings.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
        qWeather: new QWeather(parameters, Settings.API?.QWeather?.Token, Settings.API?.QWeather?.Host),
        parameters, country: parameters.country,
    };
    const preFetched = {};
    if (shouldReplaceWeatherKit(parameters, Settings)) {
        const attempt = promise => Promise.resolve(promise).catch(() => undefined);
        if (parameters.dataSets.includes("forecastNextHour") && Settings.NextHour.Provider !== "WeatherKit") {
            preFetched.forecastNextHour = attempt(Settings.NextHour.Provider === "QWeather" ? enviroments.qWeather.Minutely() : enviroments.colorfulClouds.Minutely());
        }
        if (parameters.dataSets.includes("airQuality")) {
            const indexProvider = Settings.AirQuality.Current.Index.Provider;
            if (indexProvider === "QWeather") preFetched.index = attempt(enviroments.qWeather.CurrentAirQuality(Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants));
            else if (indexProvider === "ColorfulCloudsUS" || indexProvider === "ColorfulCloudsCN") preFetched.index = attempt(enviroments.colorfulClouds.CurrentAirQuality(indexProvider === "ColorfulCloudsUS", Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants));
            const yesterdayProvider = Settings.AirQuality.Comparison.Yesterday.IndexProvider;
            if (yesterdayProvider === "QWeather") {
                const cacheKey = "weatherkit-local.qweather-grid";
                const cache = ctx.storage?.getJSON(cacheKey);
                const grid = await QWeather.GetLocationsGrid(cache, value => ctx.storage?.setJSON(cacheKey, value));
                preFetched.locationsGrid = grid;
                const locationInfo = QWeather.GetLocationInfo(grid, parameters.latitude, parameters.longitude);
                preFetched.yesterdayAirQuality = attempt(enviroments.qWeather.prefetchYesterdayAirQuality(locationInfo).then(() => enviroments.qWeather.YesterdayAirQuality(locationInfo)));
            } else if (yesterdayProvider === "ColorfulCloudsUS" || yesterdayProvider === "ColorfulCloudsCN") {
                preFetched.yesterdayAirQuality = attempt(enviroments.colorfulClouds.prefetchYesterdayHourly().then(() => enviroments.colorfulClouds.YesterdayAirQuality(yesterdayProvider === "ColorfulCloudsUS")));
            }
        }
    }
    return { Settings, Configs, parameters, enviroments, preFetched };
}

export async function handleResponse(ctx) {
    const url = new URL(ctx.request.url);
    if (url.hostname !== "weatherkit.apple.com") return;
    if (/^\/api\/v[12]\/availability\//.test(url.pathname)) {
        const { Configs } = configuration(ctx);
        return { status: 200, headers: responseHeaders(ctx.response.headers, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }), body: JSON.stringify(Configs?.Availability?.v2 ?? []) };
    }
    if (!/^\/api\/(?:v[23]\/weather\/|v[12]\/airQualityScale\/)/.test(url.pathname)) return;
    const headers = headerObject(ctx.response.headers);
    const binary = /flatbuffer|protobuf|octet-stream/i.test(headers["content-type"] ?? "");
    const originalBody = binary ? new Uint8Array(await ctx.response.arrayBuffer()) : await ctx.response.text();
    const originalStatus = ctx.response.status;
    try {
        const { Settings, Configs } = configuration(ctx);
        const context = await processingContext(ctx, url, Settings, Configs);
        const request = { url: url.toString(), method: ctx.request.method, headers: headerObject(ctx.request.headers) };
        // Binary is kept in body, not bodyBytes: Response writes its patch to body.
        const response = { status: originalStatus, headers, body: originalBody };
        const processed = await processResponse(request, response, context);
        return { status: processed.status ?? originalStatus, headers: responseHeaders(ctx.response.headers, processed.headers), body: processed.body ?? originalBody };
    } catch {
        // The input stream was consumed; explicitly restore its original bytes.
        return { status: originalStatus, headers: responseHeaders(ctx.response.headers, headers), body: originalBody };
    }
}
