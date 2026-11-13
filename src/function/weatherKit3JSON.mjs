// WK3 JSON reader adaptations derived from hhhoratioxu/WeatherKit PR #107
// (355b5f5dad9d01cb13167949f8334a489b301811), Copyright 2026 hhhoratioxu.
// SPDX-License-Identifier: Apache-2.0
import { Console } from "@nsnanocat/util";

const weatherProducts = ["currentWeather", "forecastDaily", "forecastHourly"];
const clientProducts = [...weatherProducts, "airQuality", "forecastNextHour", "weatherAlerts", "forecastPeriodic", "weatherChanges"];
const clientContainers = new Set(["metadata", "days", "hours", "minutes", "daytimeForecast", "overnightForecast", "series", "periods", "condition", "parameters", "summary", "alerts", "pollutants"]);
const maxBodyBytes = 4 * 1024 * 1024;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const header = (headers, name) => Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name)?.[1];

/** Only negotiate JSON for main-app requests which actually need weather replacement. */
export function useWeatherKit3JSON(request, parameters, settings) {
    return (
        request.method === "GET" &&
        /^https:\/\/weatherkit\.apple\.com\/api\/v3\/weather\//.test(request.url) &&
        /^WeatherKit_Weather_(iOS|macOS)_/.test(header(request.headers, "user-agent")) &&
        parameters.version === "v3" &&
        [parameters.latitude, parameters.longitude].every(value => value !== undefined && Number.isFinite(Number(value))) &&
        Math.abs(Number(parameters.latitude)) <= 90 &&
        Math.abs(Number(parameters.longitude)) <= 180 &&
        ["ColorfulClouds", "QWeather"].includes(settings.Weather?.Provider) &&
        settings.Weather?.Replace?.includes(parameters.country) &&
        parameters.dataSets.some(name => weatherProducts.includes(name) && settings.DataSets.includes(name))
    );
}

/** Adapt Apple's JSON representation to the native main-app reader; unknown roots stay untouched. */
export function adaptWeatherKit3JSON(product, name, provider = false) {
    let nodes = 0;
    function visit(value, depth = 0, known = true) {
        if (++nodes > 100000 || depth > 64) throw new RangeError("WK3 JSON exceeds traversal bounds");
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
            if (value.length > 8192) throw new RangeError("WK3 JSON vector too large");
            for (const item of value) visit(item, depth + 1, known);
            return;
        }
        for (const key of Object.keys(value)) {
            let item = value[key];
            if (!known) {
                visit(item, depth + 1, false);
                continue;
            }
            if ((key === "conditionCode" || key === "precipitationType" || (key === "condition" && item?.length > 0)) && Array.isArray(item) && item.every(entry => typeof entry === "string")) {
                const first = item.find(entry => entry);
                if (first === undefined) delete value[key];
                else value[key] = first;
                item = value[key];
            }
            if ((key === "precipitationAmount" || key.startsWith("snowfallAmount")) && object(item) && Number.isFinite(item.expected)) value[key] = item = item.expected;
            if (/^precipitationAmount(?:(?:Previous|Next)\d+h)?ByType$/.test(key) && Array.isArray(item)) {
                const scalar = key.slice(0, -"ByType".length);
                if (value[scalar] === undefined && item.every(part => object(part) && Number.isFinite(part.expected) && part.expected >= 0)) {
                    const amount = item.reduce((sum, part) => sum + part.expected, 0);
                    if (Number.isFinite(amount)) value[scalar] = amount;
                }
            }
            if (provider) {
                if (item === undefined) {
                    delete value[key];
                    continue;
                }
                if (typeof item === "number" && !Number.isFinite(Math.fround(item))) throw new RangeError("Invalid WK3 provider number");
                const range = integerRange(key);
                if (range && item != null) {
                    if (typeof item !== "number" || item < 0 || item > range) throw new RangeError(`Invalid WK3 ${key}`);
                    value[key] = item = timeFields.has(key) ? Math.trunc(item) : Math.round(item);
                }
                if (item === 0 && optionalTimes.has(key)) {
                    delete value[key];
                    continue;
                }
                if (key === "metadata" && object(item)) {
                    for (const coordinate of ["latitude", "longitude"])
                        if (typeof item[coordinate] === "string" && item[coordinate].trim()) {
                            const number = Number(item[coordinate]);
                            if (!Number.isFinite(number)) throw new RangeError("Invalid WK3 coordinate");
                            item[coordinate] = number;
                        }
                }
            }
            visit(item, depth + 1, clientContainers.has(key));
        }
    }
    visit(product);
    if (name === "weatherAlerts")
        for (const alert of product?.alerts ?? []) {
            const bytes = alert?.id?.bytes;
            if (!Array.isArray(bytes) || bytes.length !== 16 || !bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) continue;
            const hex = bytes.map(byte => byte.toString(16).padStart(2, "0")).join("");
            alert.id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
    return product;
}

const percentages = new Set(["cloudCover", "cloudCoverLowAltPct", "cloudCoverMidAltPct", "cloudCoverHighAltPct", "humidity", "humidityMax", "humidityMin", "precipitationChance"]);
const bytes = new Set(["uvIndex", "maxUvIndex", "uvIndexMax", "uvIndexMin", "categoryIndex"]);
const timeFields = new Set([
    "asOf",
    "readTime",
    "reportedTime",
    "expireTime",
    "forecastStart",
    "forecastEnd",
    "startTime",
    "endTime",
    "date",
    "effectiveTime",
    "issuedTime",
    "eventOnsetTime",
    "eventEndTime",
    "moonrise",
    "moonset",
    "sunrise",
    "sunset",
    "sunriseCivil",
    "sunsetCivil",
    "sunriseNautical",
    "sunsetNautical",
    "sunriseAstronomical",
    "sunsetAstronomical",
    "solarNoon",
    "solarMidnight",
    "temperatureMaxTime",
    "temperatureMinTime",
]);
const optionalTimes = new Set([
    "reportedTime",
    "endTime",
    "eventOnsetTime",
    "eventEndTime",
    "moonrise",
    "moonset",
    "sunrise",
    "sunset",
    "sunriseCivil",
    "sunsetCivil",
    "sunriseNautical",
    "sunsetNautical",
    "sunriseAstronomical",
    "sunsetAstronomical",
    "solarNoon",
    "solarMidnight",
    "temperatureMaxTime",
    "temperatureMinTime",
]);
function integerRange(key) {
    if (percentages.has(key)) return 100;
    if (bytes.has(key)) return 255;
    if (key === "index" || key === "windDirection") return 65535;
    if (timeFields.has(key)) return 0xffffffff;
}

/** Process each selected product independently, reusing existing injectors and preserving Apple on failure. */
export async function replaceWeatherKit3JSON(response, dataSets, injectors) {
    if (response.status !== 200 || !/^application\/json(?:;|$)/i.test(header(response.headers, "content-type"))) return response;
    const raw = response.bodyBytes ?? response.body;
    let body;
    try {
        if ((typeof raw === "string" ? raw.length : raw?.byteLength) > maxBodyBytes) return response;
        const text = typeof raw === "string" ? raw : new TextDecoder("utf-8", { fatal: true }).decode(raw);
        if (new TextEncoder().encode(text).byteLength > maxBodyBytes) return response;
        body = JSON.parse(text);
        if (!object(body)) return response;
        // JSON negotiation changes representation even for unselected products in the same response.
        // In particular forecastPeriodic and retained alert UUIDs still need reader compatibility.
        for (const name of clientProducts) if (object(body[name])) adaptWeatherKit3JSON(body[name], name);
    } catch {
        return response;
    }
    await Promise.all(
        [...new Set(dataSets)].map(async name => {
            if (!injectors[name] || (!object(body[name]?.metadata) && name !== "forecastNextHour")) return;
            const original = body[name];
            try {
                const copy = original === undefined ? undefined : JSON.parse(JSON.stringify(original));
                const value = await injectors[name](copy);
                if (object(value?.metadata) && value.metadata.temporarilyUnavailable !== true) body[name] = adaptWeatherKit3JSON(value, name, true);
            } catch (error) {
                body[name] = original;
                Console.warn("WeatherKit.api.v3.weather.json", `preserved ${name}: ${error?.name ?? "Error"}`);
            }
        }),
    );
    const encoded = JSON.stringify(body);
    if (new TextEncoder().encode(encoded).byteLength > maxBodyBytes) return response;
    const headers = { ...response.headers };
    for (const key of Object.keys(headers)) if (["content-length", "content-encoding", "etag", "last-modified", "content-md5", "digest", "cache-control"].includes(key.toLowerCase())) delete headers[key];
    headers["Cache-Control"] = "no-store";
    const { bodyBytes: _bodyBytes, ...result } = response;
    return { ...result, headers, body: encoded };
}
