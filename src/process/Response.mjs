// Modified by hhhoratioxu, 2026-10-19: share one bounded provider cache per response.
import ResponseJSONV3 from "./ResponseJSONV3.mjs";
import { Console, Storage } from "@nsnanocat/util";
import * as flatbuffers from "flatbuffers";
import AirQuality from "../class/AirQuality.mjs";
import ProviderRequestCache, { providerErrorCode } from "../class/ProviderRequestCache.mjs";
import QWeather from "../class/QWeather.mjs";
import WeatherAlerts from "../class/WeatherAlerts.mjs";
import WeatherKit2, { hasForecastNextHour } from "../class/WeatherKit2.mjs";
import createProviderEnvironment from "../function/createProviderEnvironment.mjs";
import database from "../function/database.mjs";
import mergeForecastCopy from "../function/mergeForecastCopy.mjs";
import mergeWeatherKitAvailability from "../function/mergeWeatherKitAvailability.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import planWeatherProducts from "../function/planWeatherProducts.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";
import { activeProviderAlerts, cloneWeatherProduct, providerProductAvailable, weatherProductsEqual } from "../function/providerRecovery.mjs";
import recoverConfiguredProduct from "../function/recoverConfiguredProduct.mjs";
import setENV from "../function/setENV.mjs";
import { MAX_WEATHER_BODY_BYTES } from "../function/weatherMemoryLimits.mjs";
/***************** Processing *****************/
export async function Response($request, $response) {
    // 解构URL
    const url = new URL($request.url);

    // 解析格式
    const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0]?.trim()?.toLowerCase();
    if (FORMAT === "application/json" || FORMAT === "text/json") {
        if (url.hostname === "weatherkit.apple.com" && url.pathname.startsWith("/api/v3/weather/")) return ResponseJSONV3($request, $response, {
            airQuality: InjectAirQuality, currentWeather: InjectCurrentWeather,
            forecastDaily: InjectForecastDaily, forecastHourly: InjectForecastHourly,
            forecastNextHour: InjectForecastNextHour, weatherAlerts: InjectWeatherAlerts,
        });
        if (url.hostname === "weatherkit.apple.com" && url.pathname.startsWith("/api/v1/availability/")) $response.body = JSON.stringify(mergeWeatherKitAvailability(JSON.parse($response.body), database.WeatherKit.Configs.Availability.v2));
        return $response;
    }
    if (FORMAT !== "application/vnd.apple.flatbuffer" || url.hostname !== "weatherkit.apple.com" || !url.pathname.startsWith("/api/v2/weather/")) return $response;
    const input = $response.bodyBytes ?? $response.body;
    if ((input?.byteLength ?? input?.length ?? 0) > MAX_WEATHER_BODY_BYTES) return $response;
    /**
     * 设置
     * @type {{Settings: import('../types').Settings}}
     */
    const { Settings, Caches, Configs } = setENV("iRingo", "WeatherKit", database);
    Console.logLevel = Settings.LogLevel;
    Console.info("WeatherKit response", `FORMAT: ${FORMAT}`);
    let requestCache;
    try {
        // 创建空数据
        let body = {};
        // 格式判断
        switch (FORMAT) {
            case undefined: // 视为无body
                break;
            case "application/x-www-form-urlencoded":
            case "text/plain":
            default:
                break;
            case "application/x-mpegURL":
            case "application/x-mpegurl":
            case "application/vnd.apple.mpegurl":
            case "audio/mpegurl":
                break;
            case "text/xml":
            case "text/html":
            case "text/plist":
            case "application/xml":
            case "application/plist":
            case "application/x-plist":
                break;
            case "text/vtt":
            case "application/vtt":
                break;
            case "text/json":
            case "application/json":
                body = JSON.parse($response.body);
                switch (url.hostname) {
                    case "weatherkit.apple.com":
                        // 路径判断
                        switch (url.pathname) {
                            default:
                                if (url.pathname.startsWith("/api/v1/availability/")) {
                                    body = mergeWeatherKitAvailability(body, Configs?.Availability?.v2);
                                }
                                break;
                        }
                        break;
                }
                $response.body = JSON.stringify(body);
                break;
            case "application/vnd.apple.flatbuffer":
            case "application/protobuf":
            case "application/x-protobuf":
            case "application/vnd.google.protobuf":
            case "application/grpc":
            case "application/grpc+proto":
            case "application/octet-stream": {
                const bytes = $response.bodyBytes;
                let rawBody = bytes ? (bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)) : ($response.body ?? new Uint8Array());
                switch (FORMAT) {
                    case "application/vnd.apple.flatbuffer": {
                        // 解析FlatBuffer
                        const ByteBuffer = new flatbuffers.ByteBuffer(rawBody);
                        // 主机判断
                        switch (url.hostname) {
                            case "weatherkit.apple.com":
                                // 路径判断
                                if (url.pathname.startsWith("/api/v2/weather/")) {
                                    const parameters = parseWeatherKitURL(url, { fallback: Settings.Region?.Fallback ?? "Auto" });
                                    const requested = parameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet));
                                    const dataSets = planWeatherProducts(requested, Settings, parameters.country, requested.includes("forecastNextHour") && hasForecastNextHour(ByteBuffer));
                                    if (!dataSets.length) break;
                                    requestCache = ProviderRequestCache.fromSettings(Settings);
                                    const rootNames = dataSets.map(dataSet => Configs.DataSets[dataSet] ?? dataSet);
                                    body = WeatherKit2.decode(ByteBuffer, rootNames);
                                    const providerParameters = { ...parameters, weatherKitLanguage: body.weatherAlerts?.metadata?.language };
                                    const enviroments = createProviderEnvironment(providerParameters, Settings, requestCache);

                                    let patch;
                                    await Promise.all(
                                        dataSets.map(async dataSet => {
                                            if (!["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "weatherAlerts"].includes(dataSet)) return;
                                            const original = body[dataSet];
                                            try {
                                                body[dataSet] = dataSet === "airQuality" ? cloneWeatherProduct(original) : original;
                                                switch (dataSet) {
                                                    case "airQuality": {
                                                        body.airQuality = await InjectAirQuality(body.airQuality, Settings, Caches, enviroments);
                                                        break;
                                                    }
                                                    case "currentWeather": {
                                                        body.currentWeather = await InjectCurrentWeather(body.currentWeather, Settings, enviroments);
                                                        break;
                                                    }
                                                    case "forecastDaily": {
                                                        body.forecastDaily = await InjectForecastDaily(body.forecastDaily, Settings, enviroments);
                                                        break;
                                                    }
                                                    case "forecastHourly": {
                                                        body.forecastHourly = await InjectForecastHourly(body.forecastHourly, Settings, enviroments);
                                                        break;
                                                    }
                                                    case "forecastNextHour": {
                                                        body.forecastNextHour = await InjectForecastNextHour(body.forecastNextHour, Settings, enviroments);
                                                        break;
                                                    }
                                                    case "weatherAlerts": {
                                                        body.weatherAlerts = await InjectWeatherAlerts(body.weatherAlerts, Settings, enviroments);
                                                        break;
                                                    }
                                                    default:
                                                        break;
                                                }
                                                if (weatherProductsEqual(body[dataSet], original)) body[dataSet] = original;
                                                else {
                                                    patch ??= {};
                                                    patch[dataSet] = body[dataSet];
                                                }
                                            } catch (error) {
                                                body[dataSet] = original;
                                                requestCache.noteFallback(dataSet, providerErrorCode(error));
                                            }
                                        }),
                                    );
                                    if (patch) rawBody = WeatherKit2.encode(ByteBuffer, patch);
                                    break;
                                }
                                break;
                        }
                        break;
                    }
                    case "application/protobuf":
                    case "application/x-protobuf":
                    case "application/vnd.google.protobuf":
                        break;
                    case "application/grpc":
                    case "application/grpc+proto":
                        break;
                    case "application/octet-stream":
                        break;
                }
                // 写入二进制数据
                $response.body = rawBody;
                break;
            }
        }
        return $response;
    } finally {
        requestCache?.report("response");
    }
}

/**
 * 注入当前天气数据
 * @param {any} currentWeather - 当前天气数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的当前天气数据
 */
async function InjectCurrentWeather(currentWeather, Settings, enviroments) {
    Console.info("☑️ InjectCurrentWeather");
    if (!Settings?.Weather?.Replace?.includes(enviroments.country)) {
        Console.warn("InjectCurrentWeather", `Unreplaced country: ${enviroments.country}`);
        Console.info("✅ InjectCurrentWeather");
        return currentWeather;
    }
    let newCurrentWeather;
    switch (Settings?.Weather?.Provider) {
        case "WeatherKit":
        default:
            break;
        case "QWeather": {
            newCurrentWeather = await enviroments.qWeather.WeatherNow();
            break;
        }
        case "ColorfulClouds": {
            newCurrentWeather = await enviroments.colorfulClouds.CurrentWeather();
            break;
        }
    }
    newCurrentWeather = await recoverConfiguredProduct("currentWeather", newCurrentWeather, currentWeather, Settings?.Weather?.Provider, { QWeather: () => enviroments.qWeather.WeatherNow(), ColorfulClouds: () => enviroments.colorfulClouds.CurrentWeather() }, Settings, enviroments.requestCache);
    if (providerProductAvailable(newCurrentWeather)) {
        newCurrentWeather.metadata = { ...currentWeather?.metadata, ...newCurrentWeather.metadata };
        currentWeather = { ...currentWeather, ...newCurrentWeather };
        currentWeather.metadata.providerLogo ||= providerNameToLogo(currentWeather.metadata.providerName);
    }
    if (["ColorfulClouds", "QWeather"].includes(Settings?.Weather?.Provider) && !providerProductAvailable(newCurrentWeather)) enviroments.requestCache?.noteFallback("currentWeather");
    Console.info("✅ InjectCurrentWeather");
    return currentWeather;
}

/**
 * 注入每日天气预报数据
 * @param {any} forecastDaily - 每日预报数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的每日预报数据
 */
async function InjectForecastDaily(forecastDaily, Settings, enviroments) {
    Console.info("☑️ InjectForecastDaily");
    if (!Settings?.Weather?.Replace?.includes(enviroments.country)) {
        Console.warn("InjectForecastDaily", `Unreplaced country: ${enviroments.country}`);
        Console.info("✅ InjectForecastDaily");
        return forecastDaily;
    }
    let newForecastDaily;
    switch (Settings?.Weather?.Provider) {
        case "WeatherKit":
        default:
            break;
        case "QWeather": {
            newForecastDaily = await enviroments.qWeather.Daily();
            break;
        }
        case "ColorfulClouds": {
            const dailysteps = forecastDaily?.days?.length || 11;
            const begin = forecastDaily?.days?.[0]?.forecastStart;
            newForecastDaily = await enviroments.colorfulClouds.Daily(dailysteps, begin);
            break;
        }
    }
    newForecastDaily = await recoverConfiguredProduct(
        "forecastDaily",
        newForecastDaily,
        forecastDaily,
        Settings?.Weather?.Provider,
        { QWeather: () => enviroments.qWeather.Daily(), ColorfulClouds: () => enviroments.colorfulClouds.Daily(forecastDaily?.days?.length || 11, forecastDaily?.days?.[0]?.forecastStart) },
        Settings,
        enviroments.requestCache,
    );
    if (providerProductAvailable(newForecastDaily)) {
        forecastDaily = {
            ...forecastDaily,
            metadata: { ...forecastDaily?.metadata, ...newForecastDaily.metadata },
            days: forecastDaily?.days?.length ? mergeForecastCopy(forecastDaily.days, newForecastDaily.days) : (newForecastDaily.days ?? []),
        };
        forecastDaily.metadata.providerLogo ||= providerNameToLogo(forecastDaily.metadata.providerName);
    }
    if (["ColorfulClouds", "QWeather"].includes(Settings?.Weather?.Provider) && !providerProductAvailable(newForecastDaily)) enviroments.requestCache?.noteFallback("forecastDaily");
    Console.info("✅ InjectForecastDaily");
    return forecastDaily;
}

/**
 * 注入小时天气预报数据
 * @param {any} forecastHourly - 小时预报数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的小时预报数据
 */
async function InjectForecastHourly(forecastHourly, Settings, enviroments) {
    Console.info("☑️ InjectForecastHourly");
    if (!Settings?.Weather?.Replace?.includes(enviroments.country)) {
        Console.warn("InjectForecastHourly", `Unreplaced country: ${enviroments.country}`);
        Console.info("✅ InjectForecastHourly");
        return forecastHourly;
    }
    let newForecastHourly;
    switch (Settings?.Weather?.Provider) {
        case "WeatherKit":
        default:
            break;
        case "QWeather": {
            newForecastHourly = await enviroments.qWeather.Hourly();
            break;
        }
        case "ColorfulClouds": {
            const hourlysteps = forecastHourly?.hours?.length || 273;
            const begin = forecastHourly?.hours?.[0]?.forecastStart;
            newForecastHourly = await enviroments.colorfulClouds.ForecastHourly(hourlysteps, begin);
            break;
        }
    }
    newForecastHourly = await recoverConfiguredProduct(
        "forecastHourly",
        newForecastHourly,
        forecastHourly,
        Settings?.Weather?.Provider,
        { QWeather: () => enviroments.qWeather.Hourly(), ColorfulClouds: () => enviroments.colorfulClouds.ForecastHourly(forecastHourly?.hours?.length || 273, forecastHourly?.hours?.[0]?.forecastStart) },
        Settings,
        enviroments.requestCache,
    );
    if (providerProductAvailable(newForecastHourly)) {
        forecastHourly = {
            ...forecastHourly,
            metadata: { ...forecastHourly?.metadata, ...newForecastHourly.metadata },
            hours: forecastHourly?.hours?.length ? mergeForecastCopy(forecastHourly.hours, newForecastHourly.hours) : (newForecastHourly.hours ?? []),
        };
        forecastHourly.metadata.providerLogo ||= providerNameToLogo(forecastHourly.metadata.providerName);
    }
    if (["ColorfulClouds", "QWeather"].includes(Settings?.Weather?.Provider) && !providerProductAvailable(newForecastHourly)) enviroments.requestCache?.noteFallback("forecastHourly");
    Console.info("✅ InjectForecastHourly");
    return forecastHourly;
}

/**
 * 注入下一小时天气预报数据
 * @param {any} forecastNextHour - 下一小时预报数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的下一小时预报数据
 */
async function InjectForecastNextHour(forecastNextHour, Settings, enviroments) {
    Console.info("☑️ InjectForecastNextHour");

    if (forecastNextHour) {
        Console.info("✅ InjectForecastNextHour");
        return forecastNextHour;
    }

    let newForecastNextHour;
    switch (Settings?.NextHour?.Provider) {
        case "WeatherKit":
            break;
        case "QWeather": {
            newForecastNextHour = await enviroments.qWeather.Minutely();
            break;
        }
        case "ColorfulClouds":
        default: {
            newForecastNextHour = await enviroments.colorfulClouds.Minutely();
            break;
        }
    }
    newForecastNextHour = await recoverConfiguredProduct("forecastNextHour", newForecastNextHour, forecastNextHour, Settings?.NextHour?.Provider ?? "ColorfulClouds", { QWeather: () => enviroments.qWeather.Minutely(), ColorfulClouds: () => enviroments.colorfulClouds.Minutely() }, Settings, enviroments.requestCache);
    if (providerProductAvailable(newForecastNextHour)) {
        newForecastNextHour.metadata = { ...forecastNextHour?.metadata, ...newForecastNextHour.metadata };
        forecastNextHour = { ...forecastNextHour, ...newForecastNextHour };
        forecastNextHour.metadata.providerLogo ||= providerNameToLogo(forecastNextHour.metadata.providerName);
    }
    if (Settings?.NextHour?.Provider !== "WeatherKit" && !providerProductAvailable(newForecastNextHour)) enviroments.requestCache?.noteFallback("forecastNextHour");
    Console.info("✅ InjectForecastNextHour");
    return forecastNextHour;
}

/**
 * 补全预警数据
 * @param {any} weatherAlerts - 预警集合数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 补全后的预警集合数据
 */
async function InjectWeatherAlerts(weatherAlerts, Settings, enviroments) {
    Console.info("☑️ InjectWeatherAlerts");
    const isNationalWarningCenter = ["国家预警信息发布中心", "國家預警信息發布中心", "National Early Warning Center"].includes(weatherAlerts?.metadata?.providerName);
    let newWeatherAlerts;
    switch (Settings?.WeatherAlerts?.Provider) {
        case "WeatherKit": {
            break;
        }
        case "ColorfulClouds": {
            if (isNationalWarningCenter || !providerProductAvailable(weatherAlerts)) newWeatherAlerts = await enviroments.colorfulClouds.WeatherAlert();
            break;
        }
        case "QWeather": {
            if (isNationalWarningCenter || !providerProductAvailable(weatherAlerts)) newWeatherAlerts = await enviroments.qWeather.WeatherAlert();
            break;
        }
        case "QWeatherWeb":
        default: {
            newWeatherAlerts = await enviroments.qWeather.WeatherAlertWeb(weatherAlerts?.detailsUrl);
            break;
        }
    }
    newWeatherAlerts = await recoverConfiguredProduct("weatherAlerts", newWeatherAlerts, weatherAlerts, Settings?.WeatherAlerts?.Provider, { QWeather: () => enviroments.qWeather.WeatherAlert(), ColorfulClouds: () => enviroments.colorfulClouds.WeatherAlert() }, Settings, enviroments.requestCache);
    if (providerProductAvailable(newWeatherAlerts)) {
        // Only copy when a usable provider result will mutate the Apple data.
        weatherAlerts = cloneWeatherProduct(weatherAlerts) ?? {};
        weatherAlerts.metadata = { ...weatherAlerts?.metadata, ...newWeatherAlerts.metadata };
        weatherAlerts.detailsUrl = newWeatherAlerts.detailsUrl ?? weatherAlerts.detailsUrl;
        weatherAlerts.alerts = WeatherAlerts.mergeAlerts(weatherAlerts?.alerts, activeProviderAlerts(newWeatherAlerts?.alerts));
        weatherAlerts.metadata.providerLogo ||= providerNameToLogo(weatherAlerts.metadata.providerName);
    }
    if (Settings?.WeatherAlerts?.Provider !== "WeatherKit" && !providerProductAvailable(newWeatherAlerts)) enviroments.requestCache?.noteFallback("weatherAlerts");
    Console.info("✅ InjectWeatherAlerts");
    return weatherAlerts;
}

/**
 * 注入并合并空气质量数据（污染物、指数、昨日对比）
 * @param {any} airQuality - WeatherKit 原始空气质量对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} Caches - 缓存对象
 * @param {any} enviroments - 各数据源实例与定位信息
 * @returns {Promise<any>} 合并后的空气质量对象
 */
async function InjectAirQuality(airQuality, Settings, Caches, enviroments) {
    // Step1. 修复污染物单位
    // Step 1. Fix pollutant units.
    airQuality = AirQuality.FixPollutantsUnits(airQuality, { appleProduct: true });

    // 只补齐缺失/无效的污染物，已有有效 Apple 浓度优先；失败不丢弃原数据。
    const originalPollutants = AirQuality.ValidPollutants(airQuality?.pollutants);
    let injectedPollutants = { ...airQuality, pollutants: originalPollutants };
    let needPollutants = false;
    if (AirQuality.MissingPollutants(originalPollutants).length) {
        try {
            const supplement = await InjectPollutants(Settings, enviroments);
            if (providerProductAvailable(supplement)) {
                const pollutants = AirQuality.MergePollutants(originalPollutants, supplement.pollutants);
                needPollutants = pollutants.length > originalPollutants.length;
                if (needPollutants) injectedPollutants = { ...supplement, ...airQuality, pollutants, metadata: { ...supplement.metadata, temporarilyUnavailable: false } };
            }
        } catch (error) {
            enviroments.requestCache?.noteFallback("airQuality", providerErrorCode(error));
        }
    }

    // The algorithm chooses how to convert; the target list decides whether.
    const targets = Settings?.AirQuality?.Current?.Index?.Replace ?? [];
    const indexProvider = Settings?.AirQuality?.Current?.Index?.Provider ?? "Calculate";
    const calculateDisabled = indexProvider === "Calculate" && Settings?.AirQuality?.Calculate?.Algorithm === "None";
    const originalIndexAvailable = AirQuality.HasUsableIndex(airQuality);
    const targetMatches = targets.some(scaleName => AirQuality.ScaleMatches(airQuality?.scale, scaleName));
    const needInjectIndex = targets.length > 0 && !calculateDisabled && (targetMatches || !originalIndexAvailable && needPollutants);
    let injectedIndex = airQuality, indexAvailable = false;
    if (needInjectIndex) {
        try {
            const candidate = await InjectIndex(injectedPollutants, Settings, enviroments);
            if (AirQuality.HasUsableIndex(candidate)) { injectedIndex = candidate; indexAvailable = true; }
            else enviroments.requestCache?.noteFallback("airQuality", "invalid");
        } catch (error) {
            enviroments.requestCache?.noteFallback("airQuality", providerErrorCode(error));
        }
    }

    // Follow the original comparison switch and independently selected source.
    const indexChanged = indexAvailable && ["index", "scale", "categoryIndex"].some(key => airQuality?.[key] !== injectedIndex[key]);
    const weatherKitComparison = airQuality?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
    const previousDayComparison = indexChanged && Settings?.AirQuality?.Comparison?.ReplaceWhenCurrentChange ? AirQuality.Config.CompareCategoryIndexes.UNKNOWN : weatherKitComparison;
    const needInjectComparison = previousDayComparison === AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
    const currentIndexProvider = indexAvailable ? indexProvider : "WeatherKit";
    let injectedComparison = { ...injectedIndex, previousDayComparison };
    if (needInjectComparison) {
        try {
            injectedComparison = await InjectComparison(injectedIndex, currentIndexProvider, Settings, Caches, enviroments);
        } catch (error) {
            enviroments.requestCache?.noteFallback("airQuality", providerErrorCode(error));
        }
    }

    // Step5. 收集各阶段元数据，拼接最终 providerName 展示文案
    const weatherKitMetadata = airQuality?.metadata;
    const pollutantMetadata = injectedPollutants?.metadata;
    const indexMetadata = injectedIndex?.metadata;
    const comparisonMetadata = injectedComparison?.metadata;
    const providers = [
        ...(weatherKitMetadata?.providerName && !weatherKitMetadata.temporarilyUnavailable ? [weatherKitMetadata.providerName] : []),
        ...(needPollutants && pollutantMetadata?.providerName && !pollutantMetadata.temporarilyUnavailable ? [`污染物：${pollutantMetadata.providerName}`] : []),
        ...(indexAvailable && indexMetadata?.providerName && !indexMetadata.temporarilyUnavailable ? [`指数：${AirQuality.appendScaleToProviderName(injectedIndex, Settings)}`] : []),
        ...(needInjectComparison && comparisonMetadata?.providerName && !comparisonMetadata.temporarilyUnavailable ? [`对比昨日：\n${comparisonMetadata.providerName}`] : []),
    ];

    // Step6. 选取首个有效 provider，生成统一 logo
    const providerLogo = providerNameToLogo(weatherKitMetadata?.providerName || pollutantMetadata?.providerName || indexMetadata?.providerName || comparisonMetadata?.providerName);

    // Step7. 合并输出：优先使用可用注入结果，并统一 metadata / pollutants / previousDayComparison
    airQuality = {
        ...airQuality,
        ...(indexAvailable ? injectedIndex : {}),
        metadata: {
            ...(airQuality?.metadata ? airQuality.metadata : injectedPollutants?.metadata),
            ...(indexAvailable ? { temporarilyUnavailable: false } : !originalIndexAvailable ? { temporarilyUnavailable: true } : {}),
            providerName: providers.join("\n"),
            ...(providerLogo ? { providerLogo } : {}),
        },
        pollutants: AirQuality.ValidPollutants(AirQuality.ConvertPollutants(airQuality, injectedPollutants, indexAvailable, injectedIndex, Settings)),
        previousDayComparison: injectedComparison?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
    };
    if (Console.logLevel === "DEBUG" || Console.logLevel === "ALL") Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
    return airQuality;
}

async function InjectPollutants(Settings, enviroments) {
    Console.info("☑️ InjectPollutants");

    switch (Settings?.AirQuality?.Current?.Pollutants?.Provider) {
        case "QWeather": {
            const currentAirQuality = await enviroments.qWeather.CurrentAirQuality();
            Console.info("✅ InjectPollutants");
            return currentAirQuality;
        }
        case "ColorfulClouds":
        default: {
            const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality();
            Console.info("✅ InjectPollutants");
            return currentAirQuality;
        }
    }
}

/**
 * 注入空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的空气质量数据
 */
async function InjectIndex(airQuality, Settings, enviroments) {
    Console.info("☑️ InjectIndex");

    switch (Settings?.AirQuality?.Current?.Index?.Provider) {
        case "QWeather": {
            const currentAirQuality = await enviroments.qWeather.CurrentAirQuality(Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
            Console.info("✅ InjectIndex");
            return currentAirQuality;
        }
        case "ColorfulCloudsUS":
        case "ColorfulCloudsCN": {
            const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality(Settings.AirQuality.Current.Index.Provider === "ColorfulCloudsUS", Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
            Console.info("✅ InjectIndex");
            return currentAirQuality;
        }
        case "Calculate":
        default: {
            const currentAirQuality = AirQuality.Pollutants2AQI(airQuality, Settings);
            Console.info("✅ InjectIndex");
            return currentAirQuality;
        }
        // TODO
        case "WAQI": {
            if (Settings?.API?.WAQI?.Token) {
                return await enviroments.waqi.AQI2();
            } else {
                const Nearest = await enviroments.waqi.Nearest();
                const Token = await enviroments.waqi.Token(Nearest?.metadata?.stationId);
                //Caches.WAQI.set(stationId, Token);
                const aqi = await enviroments.waqi.AQI(Nearest?.metadata?.stationId, Token);

                return {
                    metadata: { ...Nearest?.metadata, ...aqi?.metadata },
                    ...Nearest,
                    ...aqi,
                };
            }
        }
    }
}

async function InjectComparison(airQuality, currentIndexProvider, Settings, Caches, enviroments) {
    Console.info("☑️ InjectComparison");

    const { UNKNOWN } = AirQuality.Config.CompareCategoryIndexes;

    /**
     * HJ 633—2012
     * [环境空气质量指数（AQI）技术规定（试行）_中华人民共和国生态环境部]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/t20120302_224166.shtml}
     */
    const isHJ6332012 = (currentIndexProvider, currentScale, Settings) => {
        Console.info("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);

        switch (currentIndexProvider) {
            case "Calculate": {
                Console.debug(`Settings?.AirQuality?.Calculate?.Algorithm: ${Settings?.AirQuality?.Calculate?.Algorithm}`);
                const result = Settings?.AirQuality?.Calculate?.Algorithm === "WAQI_InstantCast_CN";
                Console.info("✅ isHJ6332012", result);
                return result;
            }
            case "QWeather":
            case "ColorfulCloudsCN": {
                Console.info("✅ isHJ6332012", true);
                return true;
            }
            case "WeatherKit": {
                const result = AirQuality.ScaleMatches(currentScale, AirQuality.Config.Scales.HJ6332012.weatherKitScale.name);
                Console.info("✅ isHJ6332012", result);
                return result;
            }
            default: {
                Console.info("✅ isHJ6332012", false);
                return false;
            }
        }
    };
    /**
     * EPA 454/B-18-007
     * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI)]{@link https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf}
     */
    const isEPA454_B18007 = currentIndexProvider => {
        Console.info("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);

        switch (currentIndexProvider) {
            case "WAQI":
            case "ColorfulCloudsUS": {
                Console.info("✅ isHJ6332012", true);
                return true;
            }
            default: {
                Console.info("✅ isHJ6332012", false);
                return false;
            }
        }
    };

    const colorfulCloudsComparison = async (useUsa, currentCategoryIndex) => {
        Console.info("☑️ colorfulCloudsComparison", `currentCategoryIndex: ${currentCategoryIndex}`);
        const yesterdayAirQuality = await enviroments.colorfulClouds.YesterdayAirQuality(useUsa);

        const getMetadata = (temporarilyUnavailable = false) => ({
            ...yesterdayAirQuality.metadata,
            providerName: `指数：${AirQuality.appendScaleToProviderName(yesterdayAirQuality)}`,
            temporarilyUnavailable,
        });

        if (!yesterdayAirQuality.metadata.temporarilyUnavailable) {
            if (Number.isFinite(Number(currentCategoryIndex)) && Number(currentCategoryIndex) > 0) {
                const comparisonAirQuality = {
                    ...yesterdayAirQuality,
                    metadata: getMetadata(false),
                    previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
                };
                Console.info("✅ colorfulCloudsComparison");
                return comparisonAirQuality;
            } else {
                const colorfulCloudsCurrent = await enviroments.colorfulClouds.CurrentAirQuality(useUsa);
                if (!colorfulCloudsCurrent.metadata.temporarilyUnavailable) {
                    Console.debug(`colorfulCloudsCurrent?.index: ${colorfulCloudsCurrent?.index}`);
                    const comparisonAirQuality = {
                        ...yesterdayAirQuality,
                        metadata: getMetadata(false),
                        previousDayComparison: AirQuality.CompareCategoryIndexes(colorfulCloudsCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
                    };
                    Console.info("✅ colorfulCloudsComparison");
                    return comparisonAirQuality;
                }
            }
        }

        Console.error("colorfulCloudsComparison", `无法从彩云天气获取${yesterdayAirQuality.metadata.temporarilyUnavailable ? "昨日" : "今日"}的空气质量数据`);
        return {
            ...yesterdayAirQuality,
            metadata: getMetadata(true),
            previousDayComparison: UNKNOWN,
        };
    };
    const qweatherComparison = async (currentCategoryIndex, pollutantsToAirQuality) => {
        Console.info("☑️ qweatherComparison", `currentCategoryIndex: ${currentCategoryIndex}`);
        const setQWeatherCache = qweatherCache => {
            Caches.qweather = qweatherCache;
            Storage.setItem("@iRingo.WeatherKit.Caches", { ...Caches, qweather: qweatherCache });
        };

        const locationsGrid = await QWeather.GetLocationsGrid(Caches?.qweather, setQWeatherCache, enviroments.requestCache);
        const { latitude, longitude } = enviroments.qWeather;
        const locationInfo = QWeather.GetLocationInfo(locationsGrid, latitude, longitude);

        const yesterdayQWeather = await enviroments.qWeather.YesterdayAirQuality(locationInfo);

        const getMetadata = (indexProvider, temporarilyUnavailable = false) => ({
            ...yesterdayQWeather.metadata,
            providerName: `污染物：和风天气，指数：${indexProvider}`,
            temporarilyUnavailable,
        });

        if (!yesterdayQWeather.metadata.temporarilyUnavailable) {
            const airQualityFromPollutants = pollutantsToAirQuality?.(yesterdayQWeather);
            const yesterdayAirQuality = pollutantsToAirQuality
                ? {
                      ...airQualityFromPollutants,
                      metadata: {
                          ...airQualityFromPollutants.metadata,
                          providerName: AirQuality.appendScaleToProviderName(airQualityFromPollutants, Settings),
                      },
                  }
                : {
                      ...yesterdayQWeather,
                      metadata: {
                          ...yesterdayQWeather.metadata,
                          providerName: AirQuality.appendScaleToProviderName(yesterdayQWeather),
                      },
                  };

            if (Number.isFinite(Number(currentCategoryIndex)) && Number(currentCategoryIndex) > 0) {
                const comparisonAirQuality = {
                    ...yesterdayQWeather,
                    metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
                    previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
                };
                Console.info("✅ qweatherComparison");
                return comparisonAirQuality;
            } else {
                const qweatherCurrent = await enviroments.qWeather.CurrentAirQuality(locationInfo);
                if (!qweatherCurrent.metadata.temporarilyUnavailable) {
                    Console.debug(`qweatherCurrent?.index: ${qweatherCurrent?.index}`);

                    const comparisonAirQuality = {
                        ...yesterdayQWeather,
                        metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
                        previousDayComparison: AirQuality.CompareCategoryIndexes(qweatherCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
                    };
                    Console.info("✅ qweatherComparison");
                    return comparisonAirQuality;
                }
            }
        }

        Console.error("qweatherComparison", `无法从和风天气获取${yesterdayQWeather.metadata.temporarilyUnavailable ? "昨日" : "今日"}空气质量数据`);
        return {
            ...yesterdayQWeather,
            metadata: getMetadata(yesterdayQWeather.metadata.providerName, true),
            previousDayComparison: UNKNOWN,
        };
    };

    switch (Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider) {
        case "Calculate": {
            const algorithm = AirQuality.chooseAlogrithm(airQuality, Settings);
            const PollutantsProvider = Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider;
            Console.debug(`Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider: ${PollutantsProvider}`);

            if (algorithm !== "") {
                switch (PollutantsProvider) {
                    case "QWeather":
                    default: {
                        const pollutantsToAirQuality = airQuality => AirQuality.Pollutants2AQI(airQuality, Settings, { algorithm });
                        const comparisonAirQuality = await qweatherComparison(airQuality?.categoryIndex, pollutantsToAirQuality);
                        Console.info("✅ InjectComparison");
                        return comparisonAirQuality;
                    }
                }
            }

            Console.error("InjectComparison", "不支持今日空气质量的标准");
            return { metadata: { providerName: "iRingo", temporarilyUnavailable: true }, previousDayComparison: UNKNOWN };
        }
        case "QWeather": {
            const comparisonAirQuality = await qweatherComparison(isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
            Console.info("✅ InjectComparison");
            return comparisonAirQuality;
        }
        case "ColorfulCloudsCN": {
            // Use injected AQI or ColorfulClouds AQI depends on data source
            const comparisonAirQuality = colorfulCloudsComparison(false, isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
            Console.info("✅ InjectComparison");
            return comparisonAirQuality;
        }
        case "ColorfulCloudsUS":
        default: {
            const comparisonAirQuality = colorfulCloudsComparison(true, isEPA454_B18007(currentIndexProvider) ? airQuality?.categoryIndex : undefined);
            Console.info("✅ InjectComparison");
            return comparisonAirQuality;
        }
    }
}
