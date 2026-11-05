import { configuration } from "./index.mjs";
import { headerObject, responseHeaders } from "../runtime.mjs";
import { Response as processResponse } from "../process/Response.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import shouldReplaceWeatherKit from "../function/shouldReplaceWeatherKit.mjs";
import ColorfulClouds from "../class/ColorfulClouds.mjs";
import QWeather from "../class/QWeather.mjs";

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
        // AQ acquisition is deferred until the decoded response proves it is needed.
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
