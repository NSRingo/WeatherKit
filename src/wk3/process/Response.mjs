import * as flatbuffers from "flatbuffers";
import AirQuality from "../class/AirQuality.mjs";
import AirQualityScale from "../class/AirQualityScale.mjs";
import ColorfulClouds from "../class/ColorfulClouds.mjs";
import QWeather from "../class/QWeather.mjs";
import Weather from "../class/Weather.mjs";
import WeatherKit2, { decodeAirQuality, encodeAirQuality, decodeForecastNextHour, encodeForecastNextHour } from "../class/WeatherKit2.mjs";
import { decodeWK3DataSet, encodeAirQuality as encodeWK3AirQuality, providerToWK3USAirQuality } from "../class/WeatherKit3.mjs";
import { injectWK3Comparison } from "../class/WK3Comparison.mjs";
import { patchWK3QWeatherAlerts } from "../class/WK3Alerts.mjs";
import { decodeWK3NextHour, encodeNextHour as encodeWK3NextHour, providerToWK3NextHour } from "../class/WK3NextHour.mjs";
import * as WK2 from "../proto/apple/wk2.js";
import database from "../function/database.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import buildSettings from "../function/buildSettings.mjs";
import shouldReplaceWeatherKit, { isHongKong } from "../function/shouldReplaceWeatherKit.mjs";
import { Console } from "../utils/index.mjs";
/***************** Processing *****************/
export async function Response($request, $response, context = {}) {
    // 解构预取数据（从 Hono.js 并发预取传入）
    const { preFetched = {}, enviroments: preEnviroments, parameters: preParameters, Settings: preSettings, Configs: preConfigs } = context;
    // 解构URL
    const url = new URL($request.url);
    Console.debug("url:", url.toJSON());
    // 获取连接参数
    const PATHs = url.pathname.split("/").filter(Boolean);
    Console.debug("PATHs:", PATHs);
    // 解析格式
    const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
    Console.debug("FORMAT:", FORMAT);
    // 打印 Apple 原始响应日志
    Console.debug("[Apple Response]", url.pathname, `status: ${$response.status}`, `content-type: ${FORMAT}`);
    if (url.pathname.startsWith("/api/v1/airQualityScale/") || url.pathname.startsWith("/api/v2/airQualityScale/")) {
        try {
            const preview = typeof $response.body === "string" ? $response.body : $response.bodyBytes ? new TextDecoder().decode(new Uint8Array($response.bodyBytes)) : "(binary)";
            Console.log(`[Apple Response Body] ${url.pathname}`, preview.length > 2000 ? `${preview.slice(0, 2000)}...` : preview);
        } catch (e) {
            Console.log(`[Apple Response Body] ${url.pathname}`, "(无法解析)", e.message);
        }
    }
    /**
     * 设置
     * @type {{Settings: import('../types').Settings}}
     */
    const { Settings, Configs } = preSettings ? { Settings: preSettings, Configs: preConfigs } : buildSettings(database);
    const requestHeaders = Object.fromEntries(Object.entries($request.headers || {}).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(",") : `${value}`]));
    const userAgent = requestHeaders["user-agent"] || "";
    const schemaVersion = requestHeaders["x-schema-version"] || "";
    const isIOS27WeatherFlatBuffer = /WeatherKit_Weather_iOS_Version 27/i.test(userAgent) || /^lib-rc-2\./i.test(schemaVersion);

    // 创建空数据
    let body = {};
    // airQualityScale 请求：Apple 200 直接透传，404 则本地构建
    if (url.pathname.startsWith("/api/v1/airQualityScale/") || url.pathname.startsWith("/api/v2/airQualityScale/")) {
        if ($response.status === 200) {
            Console.log(`[proxy] airQualityScale Apple 返回 200，透传: ${url.pathname}`);
            return $response;
        }
        // Apple 返回 404 或其他错误，本地构建
        const pathParts = url.pathname.split("/").filter(Boolean);
        const language = pathParts[3] ?? "en";
        const scaleName = pathParts[4] ?? "";
        const localScale = AirQualityScale.buildScale(language, scaleName);
        if (localScale) {
            Console.log(`[proxy] airQualityScale Apple 返回 ${$response.status}，本地构建: ${scaleName}`);
            $response.status = 200;
            $response.headers = { ...$response.headers, ...localScale.headers };
            $response.body = localScale.body;
            return $response;
        }
    }
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
            Console.debug(`[Apple Response] ${url.pathname}`, body);
            switch (url.hostname) {
                case "weatherkit.apple.com":
                    // 路径判断
                    if (url.pathname.startsWith("/api/v1/availability/") || url.pathname.startsWith("/api/v2/availability/")) {
                        body = Configs?.Availability?.v2;
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
            let rawBody = $response.bodyBytes ? new Uint8Array($response.bodyBytes) : ($response.body ?? new Uint8Array());
            switch (FORMAT) {
                case "application/vnd.apple.flatbuffer": {
                    if (url.hostname !== "weatherkit.apple.com" || !/^\/api\/v[23]\/weather\//.test(url.pathname) || $response.status !== 200) break;
                    const parsedParameters = preParameters || parseWeatherKitURL(url);
                    const parameters = { ...parsedParameters, dataSets: parsedParameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet)) };
                    const shouldReplace = shouldReplaceWeatherKit(parameters, Settings);
                    if (!shouldReplace && url.pathname.startsWith("/api/v3/weather/") && isHongKong(parameters)
                        && parameters.dataSets.includes("airQuality") && !decodeWK3DataSet(rawBody)) {
                        const enviroments = preEnviroments || {
                            colorfulClouds: new ColorfulClouds({ ...parameters, country: "HK" }, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
                            parameters, country: "HK",
                        };
                        rawBody = await PatchWK3HongKongMissingAirQuality(rawBody, Settings, enviroments, preFetched);
                        break;
                    }
                    if (!shouldReplace) {
                        Console.log(`[proxy] ${parameters.country}/${parameters.latitude},${parameters.longitude} 无需替换，直接跳过 FlatBuffer 编解码。`);
                        break;
                    }
                    if (url.pathname.startsWith("/api/v3/weather/")) {
                        const enviroments = preEnviroments || {
                            colorfulClouds: new ColorfulClouds(parameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
                            qWeather: new QWeather(parameters, Settings?.API?.QWeather?.Token, Settings?.API?.QWeather?.Host),
                            parameters,
                            country: parameters.country,
                        };
                        if (parameters.dataSets.includes("airQuality")) rawBody = await PatchWK3AirQuality(rawBody, Settings, enviroments, preFetched);
                        if (parameters.dataSets.includes("forecastNextHour")) rawBody = await PatchWK3NextHour(rawBody, Settings, enviroments, preFetched);
                        if (parameters.dataSets.includes("weatherAlerts")) {
                            const patched = await patchWK3QWeatherAlerts(rawBody, { language: parameters.language, timezone: url.searchParams.get("timezone") || undefined, rewriteDetails: true });
                            Console.info("WK3 alerts patch", patched === rawBody ? "无可补全的匹配预警，保留原始信息。" : "已补全国内预警；苹果原生详情页保留原事件 ID。");
                            rawBody = patched;
                        }
                        break;
                    }
                    if (isIOS27WeatherFlatBuffer && url.hostname === "weatherkit.apple.com" && url.pathname.startsWith("/api/v2/weather/")) {
                        const enviroments = preEnviroments || {
                            colorfulClouds: new ColorfulClouds(parameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
                            qWeather: new QWeather(parameters, Settings?.API?.QWeather?.Token, Settings?.API?.QWeather?.Host),
                            parameters,
                            country: parameters.country,
                        };
                        rawBody = await PatchIOS27WeatherFlatBuffer(rawBody, Settings, enviroments, preFetched, parameters);
                        break;
                    }

                    // 解析FlatBuffer
                    const ByteBuffer = new flatbuffers.ByteBuffer(rawBody);
                    // 主机判断
                    switch (url.hostname) {
                        case "weatherkit.apple.com":
                            // 路径判断
                            if (url.pathname.startsWith("/api/v2/weather/")) {
                                const dataSets = parameters.dataSets.filter(dataSet => ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour"].includes(dataSet));
                                body = WeatherKit2.decode(ByteBuffer, dataSets);
                                // 优先使用 Hono.js 预构建的环境实例，避免重复创建
                                const enviroments = preEnviroments || {
                                    colorfulClouds: new ColorfulClouds(parameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
                                    qWeather: new QWeather(parameters, Settings?.API?.QWeather?.Token, Settings?.API?.QWeather?.Host),
                                    parameters,
                                    country: parameters.country,
                                };

                                const allSections = ["currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "airQuality"];

                                await Promise.all(
                                    dataSets.map(async dataSet => {
                                        switch (dataSet) {
                                            case "airQuality": {
                                                body.airQuality = await InjectAirQuality(body.airQuality, Settings, enviroments, preFetched);
                                                break;
                                            }
                                            case "currentWeather": {
                                                body.currentWeather = await InjectCurrentWeather(body.currentWeather, Settings, enviroments, preFetched.currentWeather);
                                                break;
                                            }
                                            case "forecastDaily": {
                                                body.forecastDaily = await InjectForecastDaily(body.forecastDaily, Settings, enviroments, preFetched.forecastDaily);
                                                break;
                                            }
                                            case "forecastHourly": {
                                                body.forecastHourly = await InjectForecastHourly(body.forecastHourly, Settings, enviroments, preFetched.forecastHourly);
                                                break;
                                            }
                                            case "forecastNextHour": {
                                                body.forecastNextHour = await InjectForecastNextHour(body.forecastNextHour, Settings, enviroments, preFetched.forecastNextHour);
                                                break;
                                            }
                                            default:
                                                break;
                                        }
                                    }),
                                );

                                // 去掉所有 providerLogo
                                allSections.forEach(s => {
                                    if (body?.[s]?.metadata?.providerLogo) {
                                        body[s].metadata.providerLogo = undefined;
                                    }
                                });
                                rawBody = WeatherKit2.encode(ByteBuffer, body);
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
}

// WK3 enums differ from WK2. Same-scale updates retain the original narrow patch;
// CN -> US uses independently observed mappings and a complete provider AQ child.
async function PatchWK3AirQuality(rawBody, Settings, enviroments, preFetched = {}) {
    try {
        const original = decodeWK3DataSet(rawBody);
        if (!original) return rawBody;
        const scaleName = AirQuality.GetNameFromScale(original.scale);
        const replace = Settings?.AirQuality?.Current?.Index?.Replace || [];
        if (!replace.includes(scaleName)) return rawBody;
        let injected;
        if (preFetched.index) {
            injected = await preFetched.index;
        } else if (Settings?.AirQuality?.Current?.Index?.Provider === "Calculate") {
            const pollutants = preFetched.pollutants ? await preFetched.pollutants : await InjectPollutants(Settings, enviroments);
            if (!pollutants?.metadata || pollutants.metadata.temporarilyUnavailable) return rawBody;
            injected = await InjectIndex(pollutants, Settings, enviroments);
            if (injected?.metadata) injected = { ...injected, metadata: { ...pollutants.metadata, ...injected.metadata } };
        } else {
            injected = await InjectIndex(undefined, Settings, enviroments);
        }
        if (!injected?.metadata || injected.metadata.temporarilyUnavailable) return rawBody;
        const targetScale = AirQuality.GetNameFromScale(injected.scale);
        if (!scaleName || targetScale !== scaleName) {
            // CN -> US only. Replace the entire AQ child with one provider's
            // consistent units/primary/source, leaving all other root arenas intact.
            if (scaleName !== "HJ6332012" || targetScale !== "EPA_NowCast") return rawBody;
            const root = readUint32LE(rawBody, 0);
            const field = getTableFieldOffset(rawBody, root, 0);
            const table = root + field + readUint32LE(rawBody, root + field);
            const vtable = table - readInt32LE(rawBody, table);
            // Do not discard future AQ fields when replacing the known child.
            if (readUint16LE(rawBody, vtable) > 20) return rawBody;
            const replacement = await injectWK3Comparison(providerToWK3USAirQuality(injected), {
                currentProvider: Settings?.AirQuality?.Current?.Index?.Provider,
                yesterdayProvider: Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider,
                sources: enviroments,
                yesterday: preFetched.yesterdayAirQuality,
            });
            const builder = new flatbuffers.Builder();
            builder.finish(encodeWK3AirQuality(builder, replacement));
            const patched = appendFlatBufferTableToWeatherRoot(rawBody, 0, builder.asUint8Array());
            Console.info("WK3 AQ patch", `国标转美标: ${original.index} -> ${replacement.index} (${replacement.scale}); 同步污染物、单位、首要污染物及来源，昨日对比=${replacement.previousDayComparison}。`);
            return patched;
        }
        if (!Number.isInteger(injected.index) || injected.index < 0 || injected.index > 32767
            || !Number.isInteger(injected.categoryIndex) || injected.categoryIndex < 0 || injected.categoryIndex > 127) return rawBody;
        const root = readUint32LE(rawBody, 0);
        const field = getTableFieldOffset(rawBody, root, 0);
        const table = root + field + readUint32LE(rawBody, root + field);
        // Omitted scalar slots cannot be written in place. Preserve the original
        // rather than rebuilding a schema with unverified fields or enum defaults.
        if (!getTableFieldOffset(rawBody, table, 1) || !getTableFieldOffset(rawBody, table, 2)) return rawBody;
        const patched = new Uint8Array(rawBody);
        writeTableInt8IfPresent(patched, table, 1, injected.categoryIndex);
        writeTableInt16IfPresent(patched, table, 2, injected.index);
        Console.info("WK3 AQ patch", `同标准 AQI: ${original.index} -> ${injected.index} (${scaleName}); 保留原始污染物、昨日对比与全部预报槽。`);
        return patched;
    } catch (error) {
        Console.warn("WK3 AQ patch", "指数替换失败，保留 Apple 原始二进制响应。", error?.message ?? error);
        return rawBody;
    }
}

async function PatchWK3HongKongMissingAirQuality(rawBody, Settings, enviroments, preFetched = {}) {
    if (Settings?.AirQuality?.Current?.Index?.Provider !== "ColorfulCloudsUS") return rawBody;
    try {
        const injected = preFetched.index ? await preFetched.index : await enviroments.colorfulClouds.CurrentAirQuality(true, Settings?.AirQuality?.Current?.Index?.ForceCNPrimaryPollutants);
        const replacement = await injectWK3Comparison(providerToWK3USAirQuality(injected), {
            currentProvider: "ColorfulCloudsUS",
            yesterdayProvider: Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider,
            sources: enviroments, yesterday: preFetched.yesterdayAirQuality,
        });
        const builder = new flatbuffers.Builder();
        builder.finish(encodeWK3AirQuality(builder, replacement));
        const patched = rebuildWeatherRootWithAddedTable(rawBody, 0, builder.asUint8Array());
        Console.info("WK3 HK AQ patch", `补入香港美标 AQI ${replacement.index}; 昨日对比=${replacement.previousDayComparison}，其他天气原样保留。`);
        return patched;
    } catch (error) {
        Console.warn("WK3 HK AQ patch", "数据源不可用，保持原响应。", error?.message ?? error);
        return rawBody;
    }
}

async function PatchWK3NextHour(rawBody, Settings, enviroments, preFetched = {}) {
    if (Settings?.NextHour?.Provider === "WeatherKit") return rawBody;
    try {
        // Inspect before replacing: unknown future fields retain their arena.
        decodeWK3NextHour(rawBody);
        const data = await InjectForecastNextHour(undefined, Settings, enviroments, preFetched.forecastNextHour);
        const nextHour = providerToWK3NextHour(data, { intensityUnit: "mm/h", chanceUnit: "percent" });
        const builder = new flatbuffers.Builder();
        builder.finish(encodeWK3NextHour(builder, nextHour));
        const root = readUint32LE(rawBody, 0);
        const patched = getTableFieldOffset(rawBody, root, 5)
            ? appendFlatBufferTableToWeatherRoot(rawBody, 5, builder.asUint8Array())
            : rebuildWeatherRootWithAddedTable(rawBody, 5, builder.asUint8Array());
        Console.info("WK3 nextHour patch", ...formatNextHourSummary(data));
        return patched;
    } catch (error) {
        Console.warn("WK3 nextHour patch", "分钟降水替换失败，保留原响应。", error?.message ?? error);
        return rawBody;
    }
}

async function PatchIOS27WeatherFlatBuffer(rawBody, Settings, enviroments, preFetched = {}, parameters = {}) {
    let patchedBody = rawBody;
    if (parameters.dataSets?.includes("airQuality")) {
        patchedBody = await PatchIOS27AirQualityFlatBuffer(patchedBody, Settings, enviroments, preFetched);
    }
    if (parameters.dataSets?.includes("forecastNextHour")) {
        patchedBody = await PatchIOS27ForecastNextHourFlatBuffer(patchedBody, Settings, enviroments, preFetched);
    }
    return patchedBody;
}

async function PatchIOS27AirQualityFlatBuffer(rawBody, Settings, enviroments, preFetched = {}) {
    try {
        if (!getTableFieldOffset(rawBody, readUint32LE(rawBody, 0), 0)) {
            Console.info("FlatBuffer AQ patch", "iOS 27 原始响应没有 airQuality 字段，保持 Apple 原始二进制响应。");
            return rawBody;
        }

        const ByteBuffer = new flatbuffers.ByteBuffer(rawBody);
        const WeatherData = WK2.Weather.getRootAsWeather(ByteBuffer);
        const originalAirQualityData = WeatherData?.airQuality();
        if (!originalAirQualityData) {
            Console.info("FlatBuffer AQ patch", "iOS 27 原始响应 airQuality 为空，保持 Apple 原始二进制响应。");
            return rawBody;
        }

        const originalAirQuality = decodeAirQuality(originalAirQualityData);
        const patchedAirQuality = await InjectAirQuality(originalAirQuality, Settings, enviroments, preFetched);
        const comparisonOffset = getTableFieldOffset(rawBody, originalAirQualityData.bb_pos, 5);
        let patchedBody;
        let patchMode = "known-fields";
        if (!comparisonOffset && patchedAirQuality?.previousDayComparison && patchedAirQuality.previousDayComparison !== AirQuality.Config.CompareCategoryIndexes.UNKNOWN) {
            const builder = new flatbuffers.Builder();
            const patchedAirQualityOffset = encodeAirQuality(builder, patchedAirQuality);
            builder.finish(patchedAirQualityOffset);
            patchedBody = appendFlatBufferTableToWeatherRoot(rawBody, 0, builder.asUint8Array());
            patchMode = "replace-airQuality-table";
        } else {
            patchedBody = patchIOS27AirQualityKnownFields(rawBody, originalAirQualityData.bb_pos, patchedAirQuality);
        }
        Console.info(
            "FlatBuffer AQ patch",
            patchMode === "replace-airQuality-table"
                ? "检测到 iOS 27 WK2.Weather，原始 airQuality 缺少 previousDayComparison 字段，替换 airQuality 子表以写入昨日对比。"
                : "检测到 iOS 27 WK2.Weather，仅修改 airQuality 已知字段并保留 Apple 原始未知字段。",
            `index: ${patchedAirQuality?.index}`,
            `primaryPollutant: ${patchedAirQuality?.primaryPollutant}`,
            `scale: ${patchedAirQuality?.scale}`,
            `previousDayComparison: ${patchedAirQuality?.previousDayComparison}`,
        );
        return patchedBody;
    } catch (error) {
        Console.warn("FlatBuffer AQ patch", "替换 iOS 27 airQuality 失败，已回退为 Apple 原始二进制响应。", error?.message ?? error);
        return rawBody;
    }
}

function patchIOS27AirQualityKnownFields(rawBody, airQualityTablePosition, airQuality) {
    const patchedBody = new Uint8Array(rawBody);

    writeTableInt8IfPresent(patchedBody, airQualityTablePosition, 1, airQuality?.categoryIndex);
    writeTableInt16IfPresent(patchedBody, airQualityTablePosition, 2, airQuality?.index);
    writeTableInt8IfPresent(patchedBody, airQualityTablePosition, 3, airQuality?.isSignificant ? 1 : 0);
    writeTableInt8IfPresent(patchedBody, airQualityTablePosition, 5, WK2.ComparisonTrend[airQuality?.previousDayComparison]);
    writeTableInt8IfPresent(patchedBody, airQualityTablePosition, 6, WK2.PollutantType[airQuality?.primaryPollutant]);

    let bodyWithAppendedData = patchedBody;
    bodyWithAppendedData = appendFlatBufferObjectToTableField(bodyWithAppendedData, airQualityTablePosition, 7, createStringBuffer(airQuality?.scale));
    return bodyWithAppendedData;
}

function createMetadataBuffer(metadata = {}) {
    const builder = new flatbuffers.Builder();
    const metadataOffset = WK2.Metadata.createMetadata(
        builder,
        builder.createString(metadata?.attributionUrl),
        metadata?.expireTime,
        builder.createString(metadata?.language),
        metadata?.latitude,
        metadata?.longitude,
        builder.createString(metadata?.providerLogo),
        builder.createString(metadata?.providerName),
        metadata?.readTime,
        metadata?.reportedTime,
        metadata?.temporarilyUnavailable,
        WK2.SourceType[metadata?.sourceType],
    );
    builder.finish(metadataOffset);
    return builder.asUint8Array();
}

function createPollutantsVectorBuffer(pollutants = []) {
    const builder = new flatbuffers.Builder();
    const pollutantOffsets = pollutants.map(pollutant =>
        WK2.Pollutant.createPollutant(
            builder,
            WK2.PollutantType[pollutant?.pollutantType],
            pollutant?.amount,
            WK2.UnitType[pollutant?.units],
        ),
    );
    const pollutantsOffset = WK2.AirQuality.createPollutantsVector(builder, pollutantOffsets);
    builder.finish(pollutantsOffset);
    return builder.asUint8Array();
}

function createStringBuffer(value) {
    const builder = new flatbuffers.Builder();
    const stringOffset = builder.createString(value ?? "");
    builder.finish(stringOffset);
    return builder.asUint8Array();
}

async function PatchIOS27ForecastNextHourFlatBuffer(rawBody, Settings, enviroments, preFetched = {}) {
    try {
        if (!getTableFieldOffset(rawBody, readUint32LE(rawBody, 0), 4)) {
            const patchedNextHour = await InjectForecastNextHour(undefined, Settings, enviroments, preFetched.forecastNextHour);
            if (patchedNextHour?.metadata) {
                const builder = new flatbuffers.Builder();
                const patchedNextHourOffset = encodeForecastNextHour(builder, patchedNextHour);
                builder.finish(patchedNextHourOffset);
                const patchedBody = rebuildWeatherRootWithAddedTable(rawBody, 4, builder.asUint8Array());
                Console.info(
                    "FlatBuffer nextHour patch",
                    "iOS 27 原始响应没有 forecastNextHour 字段，已重建 Weather 根表并补入 forecastNextHour，原始子表保持复用。",
                    ...formatNextHourSummary(patchedNextHour),
                );
                return patchedBody;
            }
            Console.info(
                "FlatBuffer nextHour patch",
                "iOS 27 原始响应没有 forecastNextHour 字段，且没有可用的下一小时降水数据，保持 Apple 原始二进制响应。",
                ...formatNextHourSummary(patchedNextHour),
            );
            return rawBody;
        }

        const ByteBuffer = new flatbuffers.ByteBuffer(rawBody);
        const WeatherData = WK2.Weather.getRootAsWeather(ByteBuffer);
        const originalNextHourData = WeatherData?.forecastNextHour();
        if (!originalNextHourData) {
            Console.info("FlatBuffer nextHour patch", "iOS 27 原始响应 forecastNextHour 为空，保持 Apple 原始二进制响应。");
            return rawBody;
        }

        const originalNextHour = decodeForecastNextHour(originalNextHourData);
        const patchedNextHour = await InjectForecastNextHour(originalNextHour, Settings, enviroments, preFetched.forecastNextHour);
        if (!patchedNextHour?.metadata) {
            Console.info("FlatBuffer nextHour patch", "没有可用的下一小时降水数据，保持 Apple 原始 forecastNextHour。", ...formatNextHourSummary(patchedNextHour));
            return rawBody;
        }

        const builder = new flatbuffers.Builder();
        const patchedNextHourOffset = encodeForecastNextHour(builder, patchedNextHour);
        builder.finish(patchedNextHourOffset);
        const patchedBody = appendFlatBufferTableToWeatherRoot(rawBody, 4, builder.asUint8Array());
        Console.info(
            "FlatBuffer nextHour patch",
            "检测到 iOS 27 WK2.Weather，仅替换 forecastNextHour 字段并保留其余 Apple 原始二进制字段。",
            ...formatNextHourSummary(patchedNextHour),
        );
        return patchedBody;
    } catch (error) {
        Console.warn("FlatBuffer nextHour patch", "替换 iOS 27 forecastNextHour 失败，已回退为 Apple 原始二进制响应。", error?.message ?? error);
        return rawBody;
    }
}

function formatNextHourSummary(forecastNextHour) {
    const minutes = forecastNextHour?.minutes ?? [];
    const intensities = minutes.map(minute => minute?.precipitationIntensity ?? 0);
    return [
        `minutes: ${minutes.length}`,
        `summary: ${forecastNextHour?.summary?.length ?? 0}`,
        `condition: ${forecastNextHour?.condition?.length ?? 0}`,
        `rainyMinutes: ${intensities.filter(intensity => intensity > 0).length}`,
        `maxIntensity: ${intensities.length ? Math.max(...intensities) : 0}`,
        `firstToken: ${forecastNextHour?.condition?.[0]?.forecastToken ?? "UNKNOWN"}`,
    ];
}

function appendFlatBufferTableToWeatherRoot(rawBody, weatherFieldIndex, tableBuffer) {
    const rootTable = readUint32LE(rawBody, 0);
    const fieldOffset = getTableFieldOffset(rawBody, rootTable, weatherFieldIndex);
    if (!fieldOffset) return rawBody;

    const tableRoot = readUint32LE(tableBuffer, 0);
    const appendAt = Math.ceil(rawBody.length / 4) * 4;
    const patchedBody = new Uint8Array(appendAt + tableBuffer.length);
    patchedBody.set(rawBody, 0);
    patchedBody.set(tableBuffer, appendAt);

    const fieldAddress = rootTable + fieldOffset;
    const newTableAddress = appendAt + tableRoot;
    writeUint32LE(patchedBody, fieldAddress, newTableAddress - fieldAddress);
    return patchedBody;
}

function rebuildWeatherRootWithAddedTable(rawBody, weatherFieldIndex, tableBuffer) {
    const originalRoot = readUint32LE(rawBody, 0);
    const originalVtable = originalRoot - readInt32LE(rawBody, originalRoot);
    const originalVtableLength = readUint16LE(rawBody, originalVtable);
    const originalFieldCount = Math.max(0, (originalVtableLength - 4) / 2);
    const fieldCount = Math.max(10, originalFieldCount, weatherFieldIndex + 1);
    const newVtableLength = 4 + fieldCount * 2;
    const newObjectLength = 4 + fieldCount * 4;
    const newVtablePosition = 4;
    const newRootPosition = Math.ceil((newVtablePosition + newVtableLength) / 4) * 4;
    // Keep the preserved arena aligned for unknown int64/double fields, even
    // when the root vtable contains an odd number of slots (WK3 has 15).
    const shiftedRawPosition = Math.ceil((newRootPosition + newObjectLength) / 8) * 8;
    const tableBufferPosition = Math.ceil((shiftedRawPosition + rawBody.length) / 8) * 8;
    const tableRoot = readUint32LE(tableBuffer, 0);
    const patchedBody = new Uint8Array(tableBufferPosition + tableBuffer.length);

    patchedBody.set(rawBody, shiftedRawPosition);
    patchedBody.set(tableBuffer, tableBufferPosition);

    writeUint32LE(patchedBody, 0, newRootPosition);
    writeUint16LE(patchedBody, newVtablePosition, newVtableLength);
    writeUint16LE(patchedBody, newVtablePosition + 2, newObjectLength);
    writeUint32LE(patchedBody, newRootPosition, newRootPosition - newVtablePosition);

    for (let fieldIndex = 0; fieldIndex < fieldCount; fieldIndex++) {
        const fieldSlot = newVtablePosition + 4 + fieldIndex * 2;
        const newFieldOffset = 4 + fieldIndex * 4;
        let fieldValue;

        if (fieldIndex === weatherFieldIndex) {
            const newFieldAddress = newRootPosition + newFieldOffset;
            const newTableAddress = tableBufferPosition + tableRoot;
            fieldValue = newTableAddress - newFieldAddress;
        } else {
            const originalFieldOffset = getTableFieldOffset(rawBody, originalRoot, fieldIndex);
            if (!originalFieldOffset) continue;

            const originalFieldAddress = originalRoot + originalFieldOffset;
            const originalValue = readUint32LE(rawBody, originalFieldAddress);
            const originalTarget = originalFieldAddress + originalValue;
            if (originalValue && originalTarget > originalFieldAddress && originalTarget < rawBody.length) {
                const newFieldAddress = newRootPosition + newFieldOffset;
                fieldValue = shiftedRawPosition + originalTarget - newFieldAddress;
            } else {
                fieldValue = originalValue;
            }
        }

        writeUint16LE(patchedBody, fieldSlot, newFieldOffset);
        writeUint32LE(patchedBody, newRootPosition + newFieldOffset, fieldValue);
    }

    return patchedBody;
}

function readUint32LE(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function readInt32LE(bytes, offset) {
    const value = readUint32LE(bytes, offset);
    return value > 0x7fffffff ? value - 0x100000000 : value;
}

function readUint16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function writeUint32LE(bytes, offset, value) {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeUint16LE(bytes, offset, value) {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeTableInt8IfPresent(bytes, tablePosition, fieldIndex, value) {
    if (value === undefined || value === null) return;
    const fieldOffset = getTableFieldOffset(bytes, tablePosition, fieldIndex);
    if (!fieldOffset) return;
    bytes[tablePosition + fieldOffset] = value & 0xff;
}

function writeTableInt16IfPresent(bytes, tablePosition, fieldIndex, value) {
    if (value === undefined || value === null) return;
    const fieldOffset = getTableFieldOffset(bytes, tablePosition, fieldIndex);
    if (!fieldOffset) return;
    writeUint16LE(bytes, tablePosition + fieldOffset, value);
}

function appendFlatBufferObjectToTableField(rawBody, tablePosition, fieldIndex, objectBuffer) {
    if (!objectBuffer?.length) return rawBody;
    const fieldOffset = getTableFieldOffset(rawBody, tablePosition, fieldIndex);
    if (!fieldOffset) return rawBody;

    const objectRoot = readUint32LE(objectBuffer, 0);
    const patchedBody = new Uint8Array(rawBody.length + objectBuffer.length);
    patchedBody.set(rawBody, 0);
    patchedBody.set(objectBuffer, rawBody.length);

    const fieldAddress = tablePosition + fieldOffset;
    const newObjectAddress = rawBody.length + objectRoot;
    writeUint32LE(patchedBody, fieldAddress, newObjectAddress - fieldAddress);
    return patchedBody;
}

function getTableFieldOffset(bytes, tablePosition, fieldIndex) {
    if (!Number.isFinite(tablePosition) || tablePosition <= 0 || tablePosition + 4 > bytes.length) return 0;
    const vtablePosition = tablePosition - readInt32LE(bytes, tablePosition);
    if (vtablePosition < 0 || vtablePosition + 4 > bytes.length) return 0;
    const vtableLength = readUint16LE(bytes, vtablePosition);
    const fieldSlot = 4 + fieldIndex * 2;
    if (fieldSlot + 2 > vtableLength || vtablePosition + fieldSlot + 2 > bytes.length) return 0;
    return readUint16LE(bytes, vtablePosition + fieldSlot);
}

/**
 * 注入当前天气数据
 * @param {any} currentWeather - 当前天气数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @param {Promise<any>} [preFetchedData] - 预取的数据
 * @returns {Promise<any>} 注入后的当前天气数据
 */
async function InjectCurrentWeather(currentWeather, Settings, enviroments, preFetchedData) {
    Console.debug("☑️ InjectCurrentWeather");
    if (!shouldReplaceWeatherKit(enviroments.parameters, Settings)) {
        Console.warn("InjectCurrentWeather", `Unreplaced location: ${enviroments.country}`);
        Console.debug("✅ InjectCurrentWeather");
        return currentWeather;
    }
    let newCurrentWeather;
    if (preFetchedData) {
        newCurrentWeather = await preFetchedData;
        Console.info("InjectCurrentWeather", "使用预取数据");
    } else {
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
    }
    if (newCurrentWeather?.metadata) {
        newCurrentWeather.metadata = { ...currentWeather?.metadata, ...newCurrentWeather.metadata };
        currentWeather = { ...currentWeather, ...newCurrentWeather };
    }
    Console.debug("✅ InjectCurrentWeather");
    return currentWeather;
}

/**
 * 注入每日天气预报数据
 * @param {any} forecastDaily - 每日预报数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @param {Promise<any>} [preFetchedData] - 预取的数据
 * @returns {Promise<any>} 注入后的每日预报数据
 */
async function InjectForecastDaily(forecastDaily, Settings, enviroments, preFetchedData) {
    Console.debug("☑️ InjectForecastDaily");
    const replaceDaily = Settings?.Weather?.ReplaceDaily ?? true;
    if (!replaceDaily || !shouldReplaceWeatherKit(enviroments.parameters, Settings)) {
        Console.info("InjectForecastDaily", `Unreplaced or skipped location: ${enviroments.country}`);
        Console.debug("✅ InjectForecastDaily");
        return forecastDaily;
    }
    let newForecastDaily;
    if (preFetchedData) {
        newForecastDaily = await preFetchedData;
        Console.info("InjectForecastDaily", "使用预取数据");
    } else {
        switch (Settings?.Weather?.Provider) {
            case "WeatherKit":
            default:
                break;
            case "QWeather": {
                newForecastDaily = await enviroments.qWeather.Daily();
                break;
            }
            case "ColorfulClouds": {
                const dailysteps = forecastDaily.days?.length || 11;
                const begin = forecastDaily.days?.[0]?.forecastStart || undefined;
                newForecastDaily = await enviroments.colorfulClouds.Daily(dailysteps, begin);
                break;
            }
        }
    }
    if (newForecastDaily?.metadata) {
        forecastDaily.metadata = { ...forecastDaily?.metadata, ...newForecastDaily.metadata };
        Weather.mergeForecast(forecastDaily?.days, newForecastDaily?.days);
    }
    Console.debug("✅ InjectForecastDaily");
    return forecastDaily;
}

/**
 * 注入小时天气预报数据
 * @param {any} forecastHourly - 小时预报数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的小时预报数据
 */
async function InjectForecastHourly(forecastHourly, Settings, enviroments, preFetchedData) {
    Console.debug("☑️ InjectForecastHourly");
    const replaceHourly = Settings?.Weather?.ReplaceHourly ?? true;
    if (!replaceHourly || !shouldReplaceWeatherKit(enviroments.parameters, Settings)) {
        Console.info("InjectForecastHourly", `Unreplaced or skipped location: ${enviroments.country}`);
        Console.debug("✅ InjectForecastHourly");
        return forecastHourly;
    }
    let newForecastHourly;
    if (preFetchedData) {
        newForecastHourly = await preFetchedData;
        Console.info("InjectForecastHourly", "使用预取数据");
    } else {
        switch (Settings?.Weather?.Provider) {
            case "WeatherKit":
            default:
                break;
            case "QWeather": {
                newForecastHourly = await enviroments.qWeather.Hourly();
                break;
            }
            case "ColorfulClouds": {
                Console.debug("✅ InjectForecastHourly ColorfulClouds");
                const hourlysteps = forecastHourly.hours?.length || 273;
                const begin = forecastHourly.hours?.[0]?.forecastStart || undefined;
                newForecastHourly = await enviroments.colorfulClouds.ForecastHourly(hourlysteps, begin);
                break;
            }
        }
    }
    if (newForecastHourly?.metadata) {
        forecastHourly.metadata = { ...forecastHourly?.metadata, ...newForecastHourly.metadata };
        forecastHourly.hours = Weather.mergeForecast(forecastHourly?.hours, newForecastHourly?.hours);
    }
    Console.debug("✅ InjectForecastHourly");
    return forecastHourly;
}

/**
 * 注入下一小时天气预报数据
 * @param {any} forecastNextHour - 下一小时预报数据对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @param {Promise<any>} [preFetchedData] - 预取的数据
 * @returns {Promise<any>} 注入后的下一小时预报数据
 */
async function InjectForecastNextHour(forecastNextHour, Settings, enviroments, preFetchedData) {
    Console.debug("☑️ InjectForecastNextHour");
    if (!shouldReplaceWeatherKit(enviroments.parameters, Settings)) {
        Console.info("InjectForecastNextHour", `Unreplaced location: ${enviroments.country}`);
        Console.debug("✅ InjectForecastNextHour");
        return forecastNextHour;
    }

    // if (forecastNextHour) {
    //     Console.debug("✅ InjectForecastNextHour");
    //     return forecastNextHour;
    // }

    let newForecastNextHour;
    if (preFetchedData) {
        newForecastNextHour = await preFetchedData;
        Console.info("InjectForecastNextHour", "使用预取数据");
    } else {
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
    }
    if (newForecastNextHour?.metadata) {
        const isClear = newForecastNextHour?.condition?.[0]?.forecastToken === "CLEAR" || newForecastNextHour?.condition?.length === 0;
        if (isClear) {
            Console.info("InjectForecastNextHour", "未来一小时无降水，保留下一小时预报数据");
            newForecastNextHour.metadata = { ...forecastNextHour?.metadata, ...newForecastNextHour.metadata };
            forecastNextHour = { ...forecastNextHour, ...newForecastNextHour };
        } else {
            newForecastNextHour.metadata = { ...forecastNextHour?.metadata, ...newForecastNextHour.metadata };
            forecastNextHour = { ...forecastNextHour, ...newForecastNextHour };
        }
    }
    Console.debug("✅ InjectForecastNextHour");
    return forecastNextHour;
}

/**
 * 注入并合并空气质量数据（污染物、指数、昨日对比）
 * @param {any} airQuality - WeatherKit 原始空气质量对象
 * @param {import('../types').Settings} Settings - 设置对象
 * @param {any} enviroments - 各数据源实例与定位信息
 * @param {Object} [preFetched={}] - 预取的数据（含 pollutants、index、locationsGrid 等）
 * @returns {Promise<any>} 合并后的空气质量对象
 */
async function InjectAirQuality(airQuality, Settings, enviroments, preFetched = {}) {
    if (!shouldReplaceWeatherKit(enviroments.parameters, Settings)) {
        Console.info("InjectAirQuality", `Unreplaced location: ${enviroments.country}`);
        return AirQuality.FixPollutantsUnits(airQuality);
    }

    // Step1. 修复污染物单位
    airQuality = AirQuality.FixPollutantsUnits(airQuality);

    // Step2. 判断原始污染物是否为空，并在需要时注入污染物数据
    const isPollutantEmpty = !Array.isArray(airQuality?.pollutants) || airQuality.pollutants.length === 0;
    const needReplacePollutants = Settings?.AirQuality?.Current?.Pollutants?.Provider && Settings.AirQuality.Current.Pollutants.Provider !== "WeatherKit";
    const shouldInjectPollutants = isPollutantEmpty || needReplacePollutants;
    const injectedPollutants = shouldInjectPollutants ? (preFetched.pollutants ? await preFetched.pollutants : await InjectPollutants(Settings, enviroments)) : airQuality;
    if (shouldInjectPollutants && preFetched.pollutants) Console.info("InjectAirQuality", "污染物使用预取数据");
    const needPollutants = shouldInjectPollutants && !!(injectedPollutants?.metadata && !injectedPollutants.metadata.temporarilyUnavailable);

    // Step3. 根据污染物补齐情况与替换配置，决定是否注入 AQI 指数
    const needInjectIndex = needPollutants || Settings?.AirQuality?.Current?.Index?.Replace?.includes(AirQuality.GetNameFromScale(airQuality?.scale));
    let injectedIndex = injectedPollutants;
    if (needInjectIndex) {
        if (preFetched.index) {
            injectedIndex = await preFetched.index;
            Console.info("InjectAirQuality", "指数使用预取数据");
        } else {
            injectedIndex = await InjectIndex(injectedPollutants, Settings, enviroments);
        }
    }

    // Step4. 计算昨日对比是否需要重算；若未知则注入昨日对比结果
    const weatherKitComparison = airQuality?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
    const forceInjectComparison = needInjectIndex || Settings?.AirQuality?.Comparison?.ReplaceWhenCurrentChange;
    const previousDayComparison = forceInjectComparison ? AirQuality.Config.CompareCategoryIndexes.UNKNOWN : weatherKitComparison;
    const needInjectComparison = forceInjectComparison || previousDayComparison === AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
    const currentIndexProvider = needInjectIndex ? Settings?.AirQuality?.Current?.Index?.Provider : "WeatherKit";
    let injectedComparison = { ...injectedIndex, previousDayComparison: weatherKitComparison };
    if (needInjectComparison) {
        try {
            injectedComparison = await InjectComparison(injectedIndex, currentIndexProvider, Settings, enviroments, preFetched);
        } catch (error) {
            Console.warn("InjectAirQuality", "昨日对比获取失败，使用 UNKNOWN 继续返回当前空气质量。", error?.message ?? error);
            injectedComparison = { ...injectedIndex, previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN };
        }
    }

    // Step5. 收集各阶段元数据，拼接最终 providerName 展示文案
    const weatherKitMetadata = airQuality?.metadata;
    const pollutantMetadata = injectedPollutants?.metadata;
    const indexMetadata = injectedIndex?.metadata;
    const comparisonMetadata = injectedComparison?.metadata;

    const pName = needPollutants && pollutantMetadata && !pollutantMetadata.temporarilyUnavailable ? pollutantMetadata.providerName : null;
    const iName = needInjectIndex && indexMetadata && !indexMetadata.temporarilyUnavailable ? indexMetadata.providerName : null;
    const cName = needInjectComparison && comparisonMetadata && !comparisonMetadata.temporarilyUnavailable ? comparisonMetadata.providerName : null;

    const providers = [];
    if (pName && pName === iName && (!cName || pName === cName)) {
        // 如果各环节提供商都一致（或者没开启部分注入），则合并展示，去除多余的“污染物”、“指数”前缀
        providers.push(AirQuality.appendScaleToProviderName(injectedIndex, Settings));
    } else {
        if ((!needInjectIndex || !needPollutants || !needInjectComparison) && weatherKitMetadata?.providerName && !weatherKitMetadata.temporarilyUnavailable) {
            providers.push(weatherKitMetadata.providerName);
        }
        if (pName) providers.push(`污染物：${pName}`);
        if (iName) providers.push(`指数：${AirQuality.appendScaleToProviderName(injectedIndex, Settings)}`);
        if (cName) providers.push(`对比昨日：${cName}`);
    }

    const activeMetadata = injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable && injectedIndex.metadata.attributionUrl ? injectedIndex.metadata : pollutantMetadata && !pollutantMetadata.temporarilyUnavailable && pollutantMetadata.attributionUrl ? pollutantMetadata : null;
    const providerName = providers.filter(Boolean).join("\n") || weatherKitMetadata?.providerName || indexMetadata?.providerName || pollutantMetadata?.providerName || "WeatherKit-Proxy";

    // Step7. 合并输出：优先使用可用注入结果，并统一 metadata / pollutants / previousDayComparison
    airQuality = {
        ...airQuality,
        ...(injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable ? injectedIndex : {}),
        metadata: {
            ...(airQuality?.metadata ? airQuality.metadata : injectedPollutants?.metadata),
            providerName,
            ...(activeMetadata ? { attributionUrl: activeMetadata.attributionUrl } : {}),
        },
        pollutants: AirQuality.ConvertPollutants(airQuality, injectedPollutants, needInjectIndex, injectedIndex, Settings) ?? [],
        previousDayComparison: injectedComparison?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
    };
    Console.info(
        "InjectAirQuality summary",
        `index: ${airQuality?.index}`,
        `categoryIndex: ${airQuality?.categoryIndex}`,
        `primaryPollutant: ${airQuality?.primaryPollutant}`,
        `scale: ${airQuality?.scale}`,
        `previousDayComparison: ${airQuality?.previousDayComparison}`,
        `pollutants: ${airQuality?.pollutants?.length ?? 0}`,
        `temporarilyUnavailable: ${airQuality?.metadata?.temporarilyUnavailable === true}`,
    );
    Console.debug("airQuality:", airQuality);
    return airQuality;
}

async function InjectPollutants(Settings, enviroments) {
    Console.debug("☑️ InjectPollutants");

    switch (Settings?.AirQuality?.Current?.Pollutants?.Provider) {
        case "QWeather": {
            const currentAirQuality = await enviroments.qWeather.CurrentAirQuality();
            Console.debug("✅ InjectPollutants");
            return currentAirQuality;
        }
        case "ColorfulClouds":
        default: {
            const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality();
            Console.debug("✅ InjectPollutants");
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
    Console.debug("☑️ InjectIndex");

    switch (Settings?.AirQuality?.Current?.Index?.Provider) {
        case "QWeather": {
            const currentAirQuality = await enviroments.qWeather.CurrentAirQuality(Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
            Console.debug("✅ InjectIndex");
            return currentAirQuality;
        }
        case "ColorfulCloudsUS":
        case "ColorfulCloudsCN": {
            const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality(Settings.AirQuality.Current.Index.Provider === "ColorfulCloudsUS", Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
            Console.debug("✅ InjectIndex");
            return currentAirQuality;
        }
        case "Calculate":
        default: {
            const currentAirQuality = AirQuality.Pollutants2AQI(airQuality, Settings);
            Console.debug("✅ InjectIndex");
            return currentAirQuality;
        }
    }
}

async function InjectComparison(airQuality, currentIndexProvider, Settings, enviroments, preFetched = {}) {
    Console.debug("☑️ InjectComparison");

    const { UNKNOWN } = AirQuality.Config.CompareCategoryIndexes;

    /**
     * HJ 633—2012
     * [环境空气质量指数（AQI）技术规定（试行）_中华人民共和国生态环境部]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/t20120302_224166.shtml}
     */
    const isHJ6332012 = (currentIndexProvider, currentScale, Settings) => {
        Console.debug("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);
        const currentScaleName = AirQuality.GetNameFromScale(currentScale);
        if (currentScaleName === AirQuality.Config.Scales.HJ6332012.weatherKitScale.name) {
            Console.debug("✅ isHJ6332012", true);
            return true;
        }

        switch (currentIndexProvider) {
            case "Calculate": {
                Console.debug(`Settings?.AirQuality?.Calculate?.Algorithm: ${Settings?.AirQuality?.Calculate?.Algorithm}`);
                const result = Settings?.AirQuality?.Calculate?.Algorithm === "WAQI_InstantCast_CN";
                Console.debug("✅ isHJ6332012", result);
                return result;
            }
            case "QWeather":
            case "ColorfulCloudsCN": {
                Console.debug("✅ isHJ6332012", true);
                return true;
            }
            case "WeatherKit": {
                const result = AirQuality.GetNameFromScale(currentScale) === AirQuality.Config.Scales.HJ6332012.weatherKitScale.name;
                Console.debug("✅ isHJ6332012", result);
                return result;
            }
            default: {
                Console.debug("✅ isHJ6332012", false);
                return false;
            }
        }
    };
    /**
     * EPA 454/B-18-007
     * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI)]{@link https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf}
     */
    const isEPA454_B18007 = (currentIndexProvider, currentScale) => {
        Console.debug("☑️ isEPA454_B18007", `currentIndexProvider: ${currentIndexProvider}`);
        const currentScaleName = AirQuality.GetNameFromScale(currentScale);
        if (currentScaleName === AirQuality.Config.Scales.EPA_NowCast.weatherKitScale.name) {
            Console.debug("✅ isEPA454_B18007", true);
            return true;
        }

        switch (currentIndexProvider) {
            case "WAQI":
            case "ColorfulCloudsUS": {
                Console.debug("✅ isEPA454_B18007", true);
                return true;
            }
            default: {
                Console.debug("✅ isEPA454_B18007", false);
                return false;
            }
        }
    };

    const colorfulCloudsComparison = async (useUsa, currentCategoryIndex) => {
        Console.debug("☑️ colorfulCloudsComparison", `currentCategoryIndex: ${currentCategoryIndex}`);
        const yesterdayAirQuality = await enviroments.colorfulClouds.YesterdayAirQuality(useUsa);

        const getMetadata = (temporarilyUnavailable = false) => ({
            ...yesterdayAirQuality.metadata,
            providerName: yesterdayAirQuality.metadata.providerName,
            temporarilyUnavailable,
        });

        if (!yesterdayAirQuality.metadata.temporarilyUnavailable) {
            if (currentCategoryIndex) {
                const comparisonAirQuality = {
                    ...yesterdayAirQuality,
                    metadata: getMetadata(false),
                    previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
                };
                Console.debug("✅ colorfulCloudsComparison");
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
                    Console.debug("✅ colorfulCloudsComparison");
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
        Console.debug("☑️ qweatherComparison", `currentCategoryIndex: ${currentCategoryIndex}`);
        const locationsGrid = preFetched?.locationsGrid
            ?? await QWeather.GetLocationsGrid(undefined, () => {});
        const { latitude, longitude } = enviroments.qWeather;
        const locationInfo = QWeather.GetLocationInfo(locationsGrid, latitude, longitude);

        const yesterdayQWeather = await enviroments.qWeather.YesterdayAirQuality(locationInfo);

        const getMetadata = (indexProvider, temporarilyUnavailable = false) => ({
            ...yesterdayQWeather.metadata,
            providerName: indexProvider,
            temporarilyUnavailable,
        });

        if (!yesterdayQWeather.metadata.temporarilyUnavailable) {
            const airQualityFromPollutants = pollutantsToAirQuality ? pollutantsToAirQuality(yesterdayQWeather) : undefined;
            const yesterdayAirQuality = airQualityFromPollutants
                ? {
                      ...airQualityFromPollutants,
                      metadata: {
                          ...airQualityFromPollutants.metadata,
                          providerName: airQualityFromPollutants.metadata.providerName,
                      },
                  }
                : {
                      ...yesterdayQWeather,
                      metadata: {
                          ...yesterdayQWeather.metadata,
                          providerName: yesterdayQWeather.metadata.providerName,
                      },
                  };

            if (currentCategoryIndex) {
                const comparisonAirQuality = {
                    ...yesterdayQWeather,
                    metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
                    previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
                };
                Console.debug("✅ qweatherComparison");
                return comparisonAirQuality;
            } else {
                const qweatherCurrent = await enviroments.qWeather.CurrentAirQuality();
                if (!qweatherCurrent.metadata.temporarilyUnavailable) {
                    Console.debug(`qweatherCurrent?.index: ${qweatherCurrent?.index}`);

                    const comparisonAirQuality = {
                        ...yesterdayQWeather,
                        metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
                        previousDayComparison: AirQuality.CompareCategoryIndexes(qweatherCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
                    };
                    Console.debug("✅ qweatherComparison");
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
                    case "ColorfulCloudsCN": {
                        if (algorithm === "WAQI_InstantCast_US") {
                            const comparisonAirQuality = await colorfulCloudsComparison(true, airQuality?.categoryIndex);
                            Console.debug("✅ InjectComparison");
                            return comparisonAirQuality;
                        }
                        const comparisonAirQuality = await colorfulCloudsComparison(false, isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
                        Console.debug("✅ InjectComparison");
                        return comparisonAirQuality;
                    }
                    case "QWeather":
                    default: {
                        const pollutantsToAirQuality = airQuality => AirQuality.Pollutants2AQI(airQuality, Settings, { algorithm });
                        const comparisonAirQuality = await qweatherComparison(airQuality?.categoryIndex, pollutantsToAirQuality);
                        Console.debug("✅ InjectComparison");
                        return comparisonAirQuality;
                    }
                }
            }

            Console.error("InjectComparison", "不支持今日空气质量的标准");
            return { metadata: { providerName: "iRingo", temporarilyUnavailable: true }, previousDayComparison: UNKNOWN };
        }
        case "QWeather": {
            const comparisonAirQuality = await qweatherComparison(isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
            Console.debug("✅ InjectComparison");
            return comparisonAirQuality;
        }
        case "ColorfulCloudsCN": {
            // Use injected AQI or ColorfulClouds AQI depends on data source
            const comparisonAirQuality = colorfulCloudsComparison(false, isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
            Console.debug("✅ InjectComparison");
            return comparisonAirQuality;
        }
        case "ColorfulCloudsUS":
        default: {
            const comparisonAirQuality = colorfulCloudsComparison(true, isEPA454_B18007(currentIndexProvider, airQuality?.scale) ? airQuality?.categoryIndex : undefined);
            Console.debug("✅ InjectComparison");
            return comparisonAirQuality;
        }
    }
}
