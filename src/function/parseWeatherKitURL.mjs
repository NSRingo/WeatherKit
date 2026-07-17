import { Console } from "@nsnanocat/util";

export default function parseWeatherKitURL(url = new URL($request.url)) {
    Console.info("☑️ parseWeatherKitURL");
    const WeatherKitRegExp = /^\/api\/(?<version>v1|v2|v3)\/(availability|weather)\/(?<locale>[A-Z0-9]+(?:-[A-Z0-9]+)*)\/(?<latitude>-?\d+\.?\d*)\/(?<longitude>-?\d+\.?\d*)$/i;
    const Parameters = url?.pathname.match(WeatherKitRegExp)?.groups;
    const localeParts = Parameters?.locale?.split("-") || [];
    let localeCountry;
    // BCP 47 locale 的末段只有两位字母时才视作地区，保留 zh-Hans 这类 script。
    if (localeParts.length > 1 && /^[A-Z]{2}$/i.test(localeParts.at(-1))) localeCountry = localeParts.pop().toUpperCase();
    const result = {
        version: Parameters?.version,
        language: localeParts.join("-") || undefined,
        latitude: Parameters?.latitude,
        longitude: Parameters?.longitude,
        country: url?.searchParams?.get("country")?.toUpperCase() || localeCountry,
        dataSets: url?.searchParams?.get("dataSets")?.split(",") || [],
    };
    Console.info("✅ parseWeatherKitURL", `🟧version: ${result.version} 🟧language: ${result.language} 🟧country: ${result.country}`, `🟧latitude: ${result.latitude} 🟧longitude: ${result.longitude}`);
    return result;
}
