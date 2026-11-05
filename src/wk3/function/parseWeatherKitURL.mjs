import { Console } from "../utils/index.mjs";

export default function parseWeatherKitURL(url = new URL($request.url)) {
    Console.debug("☑️ parseWeatherKitURL");
    // NSRingo/WeatherKit v3.3.2: preserve script subtags and normalize the region.
    const WeatherKitRegExp = /^\/api\/(?<version>v1|v2|v3)\/(availability|weather)\/(?<locale>[A-Z0-9]+(?:-[A-Z0-9]+)*)\/(?<latitude>-?\d+\.?\d*)\/(?<longitude>-?\d+\.?\d*)$/i;
    const Parameters = url?.pathname.match(WeatherKitRegExp)?.groups;
    const localeParts = Parameters?.locale?.split("-") || [];
    let localeCountry;
    if (localeParts.length > 1 && /^[A-Z]{2}$/i.test(localeParts.at(-1))) localeCountry = localeParts.pop().toUpperCase();
    const result = {
        version: Parameters?.version,
        language: localeParts.join("-") || undefined,
        latitude: Parameters?.latitude,
        longitude: Parameters?.longitude,
        country: url?.searchParams?.get("country")?.toUpperCase() || localeCountry,
        dataSets: url?.searchParams?.get("dataSets")?.split(",") || [],
    };
    //log(JSON.stringify(result, null, 2));
    //const LanguageParameters = result.language.match(LanguageRegExp)?.groups;
    //result.language = LanguageParameters.language;
    //result.country = result.country || LanguageParameters.country
    Console.info("✅ parseWeatherKitURL", `🟧version: ${result.version} 🟧language: ${result.language} 🟧country: ${result.country}`, `🟧latitude: ${result.latitude} 🟧longitude: ${result.longitude}`);
    return result;
}
