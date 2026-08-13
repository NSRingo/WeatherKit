import { Console } from "@nsnanocat/util";

/**
 * 根据数据源名称返回对应版本的标志；Apple、WeatherKit、空值及未知来源不补标志。
 * Return the versioned logo for a provider; Apple, WeatherKit, empty, and unknown providers do not receive a logo.
 * @param {string | null | undefined} providerName - 数据源名称。
 * Provider name.
 * @param {string} [version="v2"] - 标志资源版本。
 * Logo asset version.
 * @returns {string | undefined} 匹配的数据源标志地址。
 * Matched provider logo URL.
 */
export default function providerNameToLogo(providerName, version = "v2") {
    Console.info("☑️ providerNameToLogo", `providerName: ${providerName}`, `version: ${version}`);
    const normalizedProviderName = providerName?.split("\n")?.[0]?.trim();
    if (!normalizedProviderName || ["apple", "apple weather", "weatherkit"].includes(normalizedProviderName.toLowerCase())) {
        Console.info("✅ providerNameToLogo");
        return;
    }
    let providerLogo;
    switch (normalizedProviderName) {
        case "WAQI":
        case "World Air Quality Index Project":
            switch (version) {
                case "v1":
                    providerLogo = "https://waqi.info/images/logo.png";
                    break;
                case "v2":
                    providerLogo = `https://raw.githubusercontent.com/NSRingo/WeatherKit/main/images/icon/${version}/WAQI.png`;
                    break;
            }
            break;
        case "ColofulClouds":
        case "彩云天气":
            providerLogo = `https://raw.githubusercontent.com/NSRingo/WeatherKit/main/images/icon/${version}/ColorfulClouds.png`;
            break;
        case "气象在线":
        case "WeatherOL":
            providerLogo = `https://raw.githubusercontent.com/NSRingo/WeatherKit/main/images/icon/${version}/WeatherOL.png`;
            break;
        case "QWeather":
        case "和风天气":
            providerLogo = `https://weatherkit.apple.com/assets/${version}/QWeather.png`;
            break;
        case "The Weather Channel":
            providerLogo = `https://weatherkit.apple.com/assets/${version}/TWC.png`;
            break;
        case "BreezoMeter":
            providerLogo = `https://weatherkit.apple.com/assets/${version}/BreezoMeter.png`;
            break;
        default:
            break;
    }
    Console.info("✅ providerNameToLogo");
    return providerLogo;
}
