// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// v3 JSON is negotiated with Apple; never feed WK3 bytes into the WK2 schema.
import { Console } from "@nsnanocat/util";
import ProviderRequestCache, { providerErrorCode } from "../class/ProviderRequestCache.mjs";
import createProviderEnvironment from "../function/createProviderEnvironment.mjs";
import database from "../function/database.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import planWeatherProducts from "../function/planWeatherProducts.mjs";
import { cloneWeatherProduct, weatherProductsEqual } from "../function/providerRecovery.mjs";
import setENV from "../function/setENV.mjs";
import utf8Length from "../function/utf8Length.mjs";
import { MAX_DECODED_VECTOR_ENTRIES, MAX_WEATHER_BODY_BYTES } from "../function/weatherMemoryLimits.mjs";

export const MAX_WEATHER_JSON_CHARACTERS = 1024 * 1024;
const productNames = ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "weatherAlerts"];
const providerMethods = new Set(["WeatherNow", "CurrentWeather", "Hourly", "ForecastHourly", "Daily", "Minutely", "WeatherAlert", "WeatherAlertWeb"]);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
// WK3's FlatBuffer JSON and Weather's JSON reader have different shapes.
// Native macOS 27.3 logs confirm that the JSON reader expects string conditions
// and scalar precipitation amounts, even when Apple's v3 JSON contains vectors.
const percentageFields = new Set(["cloudCover", "cloudCoverLowAltPct", "cloudCoverMidAltPct", "cloudCoverHighAltPct", "humidity", "humidityMax", "humidityMin", "precipitationChance"]);
const byteFields = new Set(["uvIndex", "maxUvIndex", "uvIndexMax", "uvIndexMin", "categoryIndex"]);
const timestampFields = new Set(["asOf", "readTime", "reportedTime", "expireTime", "forecastStart", "forecastEnd", "startTime", "endTime", "date", "effectiveTime", "issuedTime", "eventOnsetTime", "eventEndTime", "moonrise", "moonset", "sunrise", "sunset", "sunriseCivil", "sunsetCivil", "sunriseNautical", "sunsetNautical", "sunriseAstronomical", "sunsetAstronomical", "solarNoon", "solarMidnight", "temperatureMaxTime", "temperatureMinTime"]);
const optionalTimestampFields = new Set(["reportedTime", "endTime", "eventOnsetTime", "eventEndTime", "moonrise", "moonset", "sunrise", "sunset", "sunriseCivil", "sunsetCivil", "sunriseNautical", "sunsetNautical", "sunriseAstronomical", "sunsetAstronomical", "solarNoon", "solarMidnight", "temperatureMaxTime", "temperatureMinTime"]);
const precipitationByTypeField = /^precipitationAmount(?:(?:Previous|Next)\d+h)?ByType$/;
const percentRange = [0, 100], byteRange = [0, 255], shortRange = [0, 65535], timeRange = [0, 0xffffffff];
function integerRange(key) {
    if (percentageFields.has(key)) return percentRange;
    if (byteFields.has(key)) return byteRange;
    if (key === "index" || key === "windDirection") return shortRange;
    if (timestampFields.has(key)) return timeRange;
}

// Share the existing per-product vector budget. Reject before starting provider work.
export function boundedWeatherJSON(value) {
    let entries = 0, nodes = 0;
    function visit(item, depth) {
        if (++nodes > 100000 || depth > 64) throw new RangeError("Weather JSON exceeds traversal bounds");
        if (!item || typeof item !== "object") return;
        if (Array.isArray(item)) {
            entries += item.length;
            if (entries > MAX_DECODED_VECTOR_ENTRIES) throw new RangeError("Weather product exceeds vector decoding budget");
            for (const child of item) visit(child, depth + 1);
        } else for (const key of Object.keys(item)) visit(item[key], depth + 1);
    }
    visit(value, 0);
    return value;
}

// Work only on a parsed, owned product. Unknown top-level products are untouched.
// Preserve by-type totals while adding the scalar required by the native reader.
export function adaptV3ClientProduct(product, name) {
    boundedWeatherJSON(product);
    let changed = false;
    // WK3 UUID tables contain sixteen octets. Weather's JSON reader expects
    // the same identifier as a UUID string, including for retained Apple alerts.
    if (name === "weatherAlerts" && Array.isArray(product?.alerts)) {
        const hex = "0123456789abcdef";
        for (const alert of product.alerts) {
            const bytes = alert?.id?.bytes;
            if (!Array.isArray(bytes) || bytes.length !== 16 || !bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) continue;
            let uuid = "";
            for (let i = 0; i < 16; i++) {
                if (i === 4 || i === 6 || i === 8 || i === 10) uuid += "-";
                uuid += hex[bytes[i] >> 4] + hex[bytes[i] & 15];
            }
            alert.id = uuid;
            changed = true;
        }
    }
    function visit(value) {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) { for (const item of value) visit(item); return; }
        for (const key of Object.keys(value)) {
            let item = value[key];
            if ((key === "conditionCode" || key === "precipitationType" || key === "condition" && item?.length > 0) && Array.isArray(item) && item.every(entry => typeof entry === "string")) {
                const first = item.find(entry => typeof entry === "string" && entry);
                if (first === undefined) delete value[key];
                else value[key] = first;
                item = value[key]; changed = true;
            }
            if ((key === "precipitationAmount" || key.startsWith("snowfallAmount")) && object(item) && Number.isFinite(item.expected)) {
                value[key] = item = item.expected; changed = true;
            }
            if (precipitationByTypeField.test(key) && Array.isArray(item)) {
                const scalarKey = key.slice(0, -"ByType".length);
                if (value[scalarKey] === undefined && item.every(part => object(part) && Number.isFinite(part.expected) && part.expected >= 0)) {
                    const amount = item.reduce((sum, part) => sum + part.expected, 0);
                    if (Number.isFinite(amount)) { value[scalarKey] = amount; changed = true; }
                }
            }
            visit(item);
        }
    }
    visit(product);
    return changed;
}

// Provider graphs are owned by their consumer. Apple input graphs stay read-only.
export function adaptV3ProviderProduct(product, name) {
    if (!object(product)) return product;
    boundedWeatherJSON(product);
    function visit(value) {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
            for (const child of value) visit(child);
            return;
        }
        for (const key of Object.keys(value)) {
            let item = value[key];
            if (item == null) { delete value[key]; continue; }
            if (typeof item === "number" && !Number.isFinite(item)) {
                delete value[key];
                continue;
            }
            // WK2 used zero as "no end"; WK3's optional timestamps must be absent.
            if (item === 0 && optionalTimestampFields.has(key)) { delete value[key]; continue; }
            const range = integerRange(key);
            if (range && typeof item === "number") {
                if (item < range[0] || item > range[1]) { delete value[key]; continue; }
                value[key] = item = timestampFields.has(key) ? Math.trunc(item) : Math.round(item);
            }
            if (key === "metadata" && object(item)) {
                for (const coordinate of ["latitude", "longitude"]) if (typeof item[coordinate] === "string") {
                    const number = Number(item[coordinate]);
                    if (item[coordinate].trim() && Number.isFinite(number)) item[coordinate] = number;
                    else delete item[coordinate];
                }
            }
            visit(item);
        }
    }
    visit(product);
    adaptV3ClientProduct(product, name);
    return product;
}

// Do not serialize a partly valid provider product into an otherwise valid Apple response.
// Unknown fields are left alone. Known scalar arrays and statistics must remain JSON-safe.
export function validateWeatherJSONV3(product, name) {
    if (!object(product)) throw new TypeError("Missing weather JSON product");
    boundedWeatherJSON(product);
    if (name === "airQuality" && product?.metadata?.temporarilyUnavailable !== true && (!Number.isInteger(product?.index) || product.index < 0 || product.index > 65535 || !Number.isInteger(product?.categoryIndex) || product.categoryIndex < 1 || product.categoryIndex > 255)) throw new TypeError("Invalid WK3 air quality index");
    if (name === "weatherAlerts" && Array.isArray(product.alerts) && product.alerts.some(alert => object(alert) && alert.id !== undefined && typeof alert.id !== "string")) throw new TypeError("Invalid native weather alert identifier");
    function visit(value) {
        const kind = typeof value;
        if (kind === "bigint" || kind === "symbol" || kind === "function") throw new TypeError("Unsupported weather JSON value");
        if (kind === "string") {
            // JSON.stringify escapes lone surrogates, but Apple's JSON reader rejects them.
            for (let i = 0; i < value.length; i++) {
                const code = value.charCodeAt(i);
                if (code >= 0xd800 && code <= 0xdbff) {
                    const next = value.charCodeAt(++i);
                    if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("Invalid weather JSON string");
                } else if (code >= 0xdc00 && code <= 0xdfff) throw new TypeError("Invalid weather JSON string");
            }
            return;
        }
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item == null) throw new TypeError("Missing weather JSON array item");
                if (typeof item === "number" && (!Number.isFinite(item) || !Number.isFinite(Math.fround(item)))) throw new TypeError("Invalid weather JSON array number");
                visit(item);
            }
            return;
        }
        for (const key of Object.keys(value)) {
            const item = value[key], range = integerRange(key);
            if (range && item !== null && (typeof item !== "number" || !Number.isInteger(item) || item < range[0] || item > range[1])) throw new TypeError("Invalid WK3 integer field");
            if (typeof item === "number" && (!Number.isFinite(item) || !Number.isFinite(Math.fround(item)))) throw new TypeError("Invalid weather JSON number");
            if ((key === "conditionCode" || key === "precipitationType" || key === "condition" && !Array.isArray(item)) && typeof item !== "string") throw new TypeError("Invalid native weather JSON condition");
            if ((key === "precipitationAmount" || key === "snowfallAmount") && (typeof item !== "number" || !Number.isFinite(item))) throw new TypeError("Invalid native weather JSON precipitation amount");
            visit(item);
        }
    }
    visit(product);
    return product;
}

function v3Environment(environment) {
    function wrap(provider) {
        return new Proxy(provider, {
            get(target, key) {
                const value = Reflect.get(target, key, target);
                if (typeof value !== "function") return value;
                if (providerMethods.has(key)) return async (...args) => adaptV3ProviderProduct(await value.apply(target, args), key === "WeatherAlert" || key === "WeatherAlertWeb" ? "weatherAlerts" : undefined);
                return value.bind(target);
            },
        });
    }
    let colorfulClouds, qWeather;
    return {
        country: environment.country,
        requestCache: environment.requestCache,
        get colorfulClouds() { return colorfulClouds ??= wrap(environment.colorfulClouds); },
        get qWeather() { return qWeather ??= wrap(environment.qWeather); },
        get waqi() { return environment.waqi; },
    };
}

export default async function ResponseJSONV3(request, response, injectors) {
    const url = new URL(request.url);
    if (url.hostname !== "weatherkit.apple.com" || !/^\/api\/v3\/weather\//.test(url.pathname) || (request.method && request.method !== "GET") || (response.status !== undefined && response.status !== 200)) return response;
    const raw = response.body;
    if (typeof raw !== "string" || raw.length > MAX_WEATHER_JSON_CHARACTERS || utf8Length(raw, MAX_WEATHER_BODY_BYTES) > MAX_WEATHER_BODY_BYTES) return response;
    const parameters = parseWeatherKitURL(url);
    const latitude = Number(parameters.latitude), longitude = Number(parameters.longitude);
    if (!parameters.version || parameters.latitude === undefined || parameters.longitude === undefined || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return response;
    let body;
    try { body = JSON.parse(raw); } catch { return response; }
    if (!object(body) || !productNames.some(name => object(body[name]) && object(body[name].metadata))) return response;
    let modified = false;
    for (const name of [...productNames, "forecastPeriodic", "weatherChanges"]) {
        if (!object(body[name])) continue;
        try { modified = adaptV3ClientProduct(body[name], name) || modified; } catch { /* Keep products beyond processing bounds. */ }
    }
    const { Settings, Caches } = setENV("iRingo", "WeatherKit", database);
    Console.logLevel = Settings.LogLevel;
    const regionParameters = parseWeatherKitURL(url, { fallback: Settings.Region?.Fallback ?? "Auto" });
    const requested = regionParameters.dataSets.filter(name => Settings.DataSets.includes(name));
    const selected = planWeatherProducts(requested, Settings, regionParameters.country, Boolean(body.forecastNextHour));
    const eligible = selected.filter(name => {
        try {
            if (body[name] !== undefined && (!object(body[name]) || !object(body[name].metadata))) return false;
            boundedWeatherJSON(body[name]);
            return typeof injectors[name] === "function";
        } catch { return false; }
    });
    if (!eligible.length) return modified ? encodeV3Response(body, response) : response;
    const cache = ProviderRequestCache.fromSettings(Settings);
    const environment = v3Environment(createProviderEnvironment({ ...regionParameters, weatherKitLanguage: body.weatherAlerts?.metadata?.language }, Settings, cache));
    try {
        await Promise.all(eligible.map(async name => {
            const original = body[name];
            let validating = false;
            try {
                const input = name === "airQuality" ? cloneWeatherProduct(original) : original;
                const value = name === "airQuality" ? await injectors[name](input, Settings, Caches, environment) : await injectors[name](input, Settings, environment);
                if (!weatherProductsEqual(value, original)) {
                    validating = true;
                    // AQI and warning injectors can also add numeric metadata fields.
                    body[name] = validateWeatherJSONV3(adaptV3ProviderProduct(value, name), name);
                    modified = true;
                }
            } catch (error) {
                body[name] = original;
                cache.noteFallback(name, validating ? "invalid" : providerErrorCode(error));
            }
        }));
        if (!modified) return response;
        return encodeV3Response(body, response);
    } finally { cache.report("response-v3-json"); }
}

function encodeV3Response(body, response) {
    let encoded;
    try { encoded = JSON.stringify(body); } catch { return response; }
    if (encoded.length > MAX_WEATHER_JSON_CHARACTERS || utf8Length(encoded, MAX_WEATHER_BODY_BYTES) > MAX_WEATHER_BODY_BYTES) return response;
    const headers = { ...response.headers };
    for (const name of Object.keys(headers)) if (["etag", "last-modified", "content-md5", "digest", "content-length", "cache-control"].includes(name.toLowerCase())) delete headers[name];
    headers["Cache-Control"] = "no-store";
    const { bodyBytes: _originalBytes, ...result } = response;
    return { ...result, headers, body: encoded };
}
