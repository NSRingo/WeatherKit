// Modified by hhhoratioxu, 2026-10-19: optional conservative region resolution.
import resolveWeatherRegion from "./resolveWeatherRegion.mjs";
import { Console } from "@nsnanocat/util";

export default function parseWeatherKitURL(url = new URL($request.url), regionOptions) {
    Console.info("☑️ parseWeatherKitURL");
    const result = {
        version: undefined,
        language: undefined,
        scale: undefined,
        latitude: undefined,
        longitude: undefined,
        country: undefined,
        dataSets: [],
    };
    switch (url.pathname) {
        case "/api/v1/weatherAlerts": {
            const coordinates = url.searchParams
                .get("ids")
                ?.trim()
                .match(/^(?<latitude>-?(?:\d+(?:\.\d+)?|\.\d+)),(?<longitude>-?(?:\d+(?:\.\d+)?|\.\d+))$/)?.groups;
            result.version = "v1";
            result.language = url.searchParams.get("lang")?.trim() || "zh-CN";
            result.country = url.searchParams.get("country")?.toUpperCase() || "CN";
            if (coordinates) {
                const latitude = Number(coordinates.latitude);
                const longitude = Number(coordinates.longitude);
                if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
                    result.latitude = coordinates.latitude;
                    result.longitude = coordinates.longitude;
                }
            }
            break;
        }
        default: {
            const scaleParameters = url.pathname.match(/^\/api\/(?<version>v1)\/airQualityScale\/(?<language>[A-Z0-9]+(?:-[A-Z0-9]+)*)\/(?<scale>[^/]+)$/i)?.groups;
            if (scaleParameters) {
                result.version = scaleParameters.version;
                result.language = scaleParameters.language;
                result.scale = scaleParameters.scale;
                break;
            }
            const parameters = url.pathname.match(/^\/api\/(?<version>v1|v2|v3)\/(availability|weather)\/(?<locale>[A-Z0-9]+(?:-[A-Z0-9]+)*)\/(?<latitude>-?\d+\.?\d*)\/(?<longitude>-?\d+\.?\d*)$/i)?.groups;
            const localeParts = parameters?.locale?.split("-") || [];
            let localeCountry;
            // BCP 47 locale 的末段只有两位字母时才视作地区，保留 zh-Hans 这类 script。
            // Treat the final BCP 47 subtag as a region only when it contains two letters, preserving scripts such as zh-Hans.
            if (localeParts.length > 1 && /^[A-Z]{2}$/i.test(localeParts.at(-1))) localeCountry = localeParts.pop().toUpperCase();
            result.version = parameters?.version;
            result.language = localeParts.join("-") || undefined;
            result.latitude = parameters?.latitude;
            result.longitude = parameters?.longitude;
            result.country = url.searchParams.get("country")?.toUpperCase() || localeCountry;
            result.dataSets = url.searchParams.get("dataSets")?.split(",") || [];
            break;
        }
    }
    if (regionOptions && result.latitude !== undefined && result.longitude !== undefined)
        result.country = resolveWeatherRegion({
            latitude: result.latitude,
            longitude: result.longitude,
            explicitCountry: url.searchParams.get("country"),
            localeCountry: url.pathname === "/api/v1/weatherAlerts" ? (/^[A-Z]{2}$/i.test(result.language?.split("-").at(-1) ?? "") && result.language?.includes("-") ? result.language.split("-").at(-1) : undefined) : result.country,
            ...regionOptions,
        });
    Console.info("✅ parseWeatherKitURL", `🟧version: ${result.version} 🟧language: ${result.language} 🟧country: ${result.country}`, "coordinates: redacted");
    return result;
}
