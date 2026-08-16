import { Lodash as _, Console, fetch, time } from "@nsnanocat/util";
import AirQuality from "../class/AirQuality.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import Weather from "./Weather.mjs";

export default class QWeather {
    static #MaximumWeatherAlertPageSize = 2 * 1024 * 1024;

    constructor(parameters, token, host = "devapi.qweather.com") {
        this.Name = "QWeather";
        this.Version = "5.3.0";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.endpoint = `https://${host}`;
        this.headers = { "X-QW-Api-Key": token };
        this.version = parameters.version;
        this.language =
            this.#Config.Language[
                String(parameters.language ?? "")
                    .trim()
                    .toLowerCase()
            ] ?? (String(parameters.language ?? "").trim() ? parameters.language : this.#Config.Language[""]);
        this.latitude = parameters.latitude;
        this.longitude = parameters.longitude;
        this.country = parameters.country;
        this.weatherKitLanguage = String(parameters.weatherKitLanguage ?? parameters.language ?? "").trim() || "zh-CN";
    }

    #cache = {
        airQualityCurrent: {},
    };

    #Config = {
        Language: {
            "": "zh",
            en: "en",
            "en-au": "en",
            "en-ca": "en",
            "en-gb": "en",
            "en-us": "en",
            ja: "ja",
            "ja-jp": "ja",
            zh: "zh",
            "zh-cn": "zh-hans",
            "zh-sg": "zh-hans",
            "zh-hans": "zh-hans",
            "zh-hans-cn": "zh-hans",
            "zh-hant-hk": "zh-hant",
            "zh-hant-mo": "zh-hant",
            "zh-hant-tw": "zh-hant",
            "zh-hk": "zh-hant",
            "zh-mo": "zh-hant",
            "zh-tw": "zh-hant",
        },
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm2p5: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
            na: "NOT_AVAILABLE",
            undefined: "NOT_AVAILABLE",
            null: "NOT_AVAILABLE",
        },
        Units: {
            "μg/m3": "MICROGRAMS_PER_CUBIC_METER",
            "mg/m3": "MILLIGRAMS_PER_CUBIC_METER",
            ppb: "PARTS_PER_BILLION",
            ppm: "PARTS_PER_MILLION",
        },
        WeatherAlert: {
            // QWeather 没有提供 CAP category，本表按官方事件名称映射；具体类别必须先于 Met 匹配。
            // QWeather does not provide CAP category; this table maps official event names, with specific categories matched before Met.
            EventCategories: [
                { category: "Geo", codes: [[1013, 1013], [1037, 1037], [1241, 1251], [1603, 1603], [2032, 2032], [2159, 2159], [2163, 2163], [2320, 2323], [2348, 2348], [2363, 2363], [2373, 2373], [2378, 2378], [2399, 2400], [3140, 3140], [3144, 3144]] },
                { category: "Safety", codes: [[1044, 1045], [1218, 1218], [2419, 2420], [2713, 2713]] },
                { category: "Security", codes: [] },
                { category: "Rescue", codes: [] },
                { category: "Fire", codes: [[1025, 1026], [1041, 1041], [1077, 1077], [1084, 1084], [1605, 1605], [2005, 2005], [2132, 2132], [2158, 2158], [2192, 2192], [2207, 2207], [2302, 2302], [2349, 2349], [2414, 2414], [2743, 2743], [3139, 3139]] },
                { category: "Health", codes: [[1024, 1024], [1042, 1042], [1066, 1066], [1068, 1069], [1071, 1072], [1082, 1082], [1210, 1210], [2851, 2851]] },
                { category: "Env", codes: [[1029, 1029], [1032, 1032], [1067, 1067], [1074, 1074], [1217, 1217], [1271, 1274], [2202, 2202], [2374, 2374], [2389, 2389], [2413, 2413], [2527, 2527]] },
                { category: "Transport", codes: [[1021, 1021], [1046, 1046], [1057, 1057], [2077, 2078], [2300, 2301], [2328, 2328], [2360, 2360], [2375, 2376], [2385, 2388], [2415, 2415], [2554, 2554], [2722, 2723], [2791, 2797]] },
                { category: "Infra", codes: [[1081, 1081], [1203, 1204], [1216, 1216], [1221, 1221]] },
                { category: "CBRNE", codes: [] },
                { category: "Other", codes: [[2166, 2166], [3106, 3106], [3147, 3147], [9999, 9999]] },
                {
                    category: "Met",
                    codes: [[1001, 1089], [1201, 1221], [1241, 1251], [1271, 1274], [1601, 1610], [1701, 1710], [1801, 1805], [2001, 2007], [2029, 2033], [2050, 2054], [2070, 2085], [2100, 2109], [2111, 2111], [2120, 2135], [2150, 2150], [2152, 2168], [2190, 2193], [2200, 2205], [2207, 2221], [2300, 2309], [2311, 2328], [2330, 2333], [2341, 2341], [2343, 2343], [2345, 2346], [2348, 2400], [2409, 2409], [2411, 2426], [2501, 2502], [2521, 2532], [2550, 2554], [2581, 2581], [2601, 2620], [2641, 2641], [2713, 2713], [2722, 2723], [2743, 2743], [2749, 2749], [2751, 2753], [2755, 2756], [2791, 2797], [2801, 2804], [2839, 2853], [2873, 2874], [3101, 3107], [3131, 3148]],
                },
            ],
        },
        Availability: {
            Minutely: ["CN", "HK", "MO"],
            AirQuality: ["AD", "BE", "BG", "CA", "CN", "HR", "CZ", "DK", "FI", "FR", "DE", "GI", "GR", "HK", "HU", "IE", "JP", "KR", "LV", "LT", "MO", "MT", "NL", "MK", "NO", "PL", "PT", "RO", "RS", "SG", "SK", "SI", "ES", "SE", "CH", "TW", "TH", "GB", "US"],
        },
    };

    static async GetLocationsGrid(qweatherCache, setCache) {
        Console.info("☑️ GetLocationsGrid");
        const locationsGrid = qweatherCache?.locationsGrid;
        // cache within 30 days
        if (locationsGrid?.lastUpdated && locationsGrid.lastUpdated + 30 * 24 * 60 * 60 * 1000 > Date.now()) {
            Console.info("✅ GetLocationsGrid", "Cache found!");
            return locationsGrid.data;
        } else {
            Console.info("⚠️ GetLocationsGrid", "Cache not found or stale, fetching...");
            const response = await fetch({
                headers: locationsGrid?.etag ? { "If-None-Match": locationsGrid?.etag } : undefined,
                url: "https://raw.githubusercontent.com/NSRingo/QWeather-Location-Grid/refs/heads/main/data/qweather-china-city-list-grid.json",
            });

            if (response.status === 304) {
                Console.info("✅ GetLocationsGrid", "Cache not modified");
                setCache({ ...qweatherCache, locationsGrid: { ...locationsGrid, lastUpdated: Date.now() } });
                return locationsGrid.data;
            }

            const newLocationsGrid = JSON.parse(response.body);
            setCache({
                ...qweatherCache,
                locationsGrid: { etag: response.headers.ETag, lastUpdated: Date.now(), data: newLocationsGrid },
            });
            Console.info("✅ GetLocationsGrid");
            return newLocationsGrid;
        }
    }

    // Codes by Claude AI
    static GetLocationInfo(locationsGrid, latitude, longitude) {
        Console.info("☑️ GetLocationInfo");

        const { gridSize, grid } = locationsGrid;

        // Haversine距离计算
        const distance = (lat1, lng1, lat2, lng2) => {
            const R = 6371; // 地球半径(km)
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLng = ((lng2 - lng1) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const getNearbyGridKeys = (lat, lng, radius = 2) => {
            const centerX = Math.floor(lng / gridSize);
            const centerY = Math.floor(lat / gridSize);
            const keys = [];

            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    keys.push(`${centerX + dx},${centerY + dy}`);
                }
            }

            return keys;
        };

        const findNearestFast = (lat, lng) => {
            const keys = getNearbyGridKeys(lat, lng, 2);
            let nearest = null;
            let minDist = Number.POSITIVE_INFINITY;

            for (const key of keys) {
                const locations = grid[key];
                if (!locations) continue;

                for (const loc of locations) {
                    const dist = distance(lat, lng, loc.latitude, loc.longitude);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = loc;
                    }
                }
            }

            return nearest;
        };

        const nearest = findNearestFast(latitude, longitude);
        Console.info("✅ GetLocationInfo");
        return nearest;
    }

    /**
     * 从 FlatBuffer 的 QWeather 预警页面链接中提取地区标识。
     * Extract the location identifier from a FlatBuffer QWeather severe-weather URL.
     * @param {string | null | undefined} value 预警页面链接 / Severe-weather URL.
     * @returns {string | undefined} 地区标识 / Location identifier.
     */
    static ParseWeatherAlertPageURL(value) {
        try {
            const url = new URL(value);
            if (url.protocol !== "https:" || url.hostname !== "www.qweather.com") return undefined;
            if (url.search !== "?from=AppleWeatherService" || url.hash) return undefined;
            return decodeURIComponent(url.pathname).match(/^\/{1,2}(?:en\/)?severe-weather\/([^/]+)\.html$/)?.[1];
        } catch {
            return undefined;
        }
    }

    /**
     * 生成 QWeather 灾害预警页面链接。
     * Build a QWeather severe-weather page URL.
     * @param {string} identifier 地区标识 / Location identifier.
     * @param {string} language WeatherKit 语言 / WeatherKit language.
     * @param {boolean} includeAppleSource 是否附加 Apple 来源参数 / Whether to append the Apple source parameter.
     * @returns {URL} QWeather 页面链接 / QWeather page URL.
     */
    static BuildWeatherAlertPageURL(identifier, language = "zh-CN", includeAppleSource = true) {
        identifier = identifier?.trim();
        const url = new URL("https://www.qweather.com");
        url.pathname = language.toLowerCase().startsWith("en") ? `/en/severe-weather/${identifier}.html` : `/severe-weather/${identifier}.html`;
        if (includeAppleSource) url.searchParams.set("from", "AppleWeatherService");
        return url;
    }

    /**
     * 生成内部使用的 Apple 天气预警详情链接。
     * Build the internally rewritten Apple weather alert details URL.
     * @param {string} identifier 地区标识 / Location identifier.
     * @param {string} language WeatherKit 语言 / WeatherKit language.
     * @returns {string} Apple 预警详情链接 / Apple alert details URL.
     */
    static BuildAppleAlertDetailsURL(identifier, language = "zh-CN") {
        return `https://weatherkit.apple.com/alertDetails/index.html?ids=${encodeURIComponent(identifier)}&lang=${encodeURIComponent(language)}&party=qweather`;
    }

    /**
     * 从 QWeather HTML 提取原始预警来源记录。
     * Extract raw alert source records from QWeather HTML.
     * @param {string} html QWeather 页面 HTML / QWeather page HTML.
     * @returns {{alerts: Array<object>, areaName: string, source: string}} 提取后的来源集合 / Extracted source collection.
     */
    static ExtractWeatherAlertPage(html) {
        const sourceHtml = String(html ?? "");
        let city = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<h1[^>]*class=["'][^"']*c-submenu__location[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
        if (!city) {
            const titleText = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<title>([\s\S]*?)<\/title>/i);
            city = titleText.replace(/\s*(?:severe weather warning|灾害预警|天气预警).*$/i, "").trim();
        }
        const administration = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<span[^>]*class=["'][^"']*c-submenu__location-adm[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
        const dataSource = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<a[^>]*class=["'][^"']*data-source__txt[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
            .replace(/^(?:预警数据来源|Warning data source)\s*[:：]\s*/i, "")
            .trim();
        const starts = Array.from(sourceHtml.matchAll(/<div[^>]*class=["']([^"']*\bc-city-warning-events\b[^"']*)["'][^>]*>/gi), match => ({
            index: match.index,
            contentStart: match.index + match[0].length,
            className: match[1],
        }));
        const alerts = [];

        for (const [index, start] of starts.entries()) {
            let end = index + 1 < starts.length ? starts[index + 1].index : sourceHtml.length;
            const nearby = sourceHtml.indexOf('<div class="c-city-warning-around">', start.contentStart);
            if (nearby !== -1 && nearby < end) end = nearby;
            const block = sourceHtml.slice(start.contentStart, end);
            const description = QWeather.#FirstWeatherAlertPageMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i);
            const issueText = QWeather.#FirstWeatherAlertPageMatch(block, /<p[^>]*>\s*((?:Issue\s+date|发布\s*日期)\s*[:：][\s\S]*?)<\/p>/i)
                .replace(/^(?:Issue\s+date|发布\s*日期)\s*[:：]\s*/i, "")
                .trim();
            const message = QWeather.#FirstWeatherAlertPageMatch(block, /<p[^>]*class=["'][^"']*warning-events__txt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
            const standardBlock = block.match(/<div[^>]*class=["'][^"']*warning-explain[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const standard = QWeather.#FirstWeatherAlertPageMatch(standardBlock, /<h4[^>]*>[\s\S]*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
            const guideBlock = block.match(/<div[^>]*class=["'][^"']*warning-defense__txt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const guidelines = Array.from(guideBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), match =>
                QWeather.#DecodeWeatherAlertPageHTML(match[1])
                    .replace(/^\s*\d+[.、]\s*/, "")
                    .trim(),
            ).filter(Boolean);
            const normalizedIssueText = issueText && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(issueText) ? `${issueText.replace(" ", "T")}+08:00` : issueText;
            const issueDate = new Date(normalizedIssueText);
            if ((!description && !message) || Number.isNaN(issueDate.getTime())) continue;
            const headline = description || message;
            const parsedHeadline = QWeather.#ParseWeatherAlertPageHeadline(headline);
            const source = parsedHeadline.source || dataSource || "QWeather";

            const severitySource = `${start.className} ${description}`.toLowerCase();
            let severity = "unknown";
            switch (true) {
                case /warning--red|红色|\bred\b/.test(severitySource):
                    severity = "extreme";
                    break;
                case /warning--orange|橙色|\borange\b/.test(severitySource):
                    severity = "severe";
                    break;
                case /warning--yellow|黄色|\byellow\b/.test(severitySource):
                    severity = "moderate";
                    break;
                case /warning--blue|蓝色|\bblue\b/.test(severitySource):
                    severity = "minor";
                    break;
            }

            alerts.push({
                description: headline,
                ...(parsedHeadline.eventName ? { eventName: parsedHeadline.eventName } : {}),
                guidelines,
                issuedTime: issueDate.toISOString(),
                message,
                reportedAt: issueDate.toISOString(),
                severity,
                source,
                standard,
            });
        }

        return {
            alerts,
            areaName: city || administration,
            source: alerts.find(alert => alert?.source)?.source || dataSource || "QWeather",
        };
    }

    /**
     * 抓取并提取 QWeather 灾害预警页面。
     * Fetch and extract a QWeather severe-weather page.
     * @param {string} identifier 地区标识 / Location identifier.
     * @param {string} language WeatherKit 语言 / WeatherKit language.
     * @param {Record<string, string | string[] | undefined>} requestHeaders 原请求头 / Original request headers.
     * @returns {Promise<{alerts: Array<object>, areaName: string, source: string}>} 来源集合 / Source collection.
     */
    static async FetchWeatherAlertPage(identifier, language = "zh-CN", requestHeaders = {}) {
        const sourceUrl = QWeather.BuildWeatherAlertPageURL(identifier, language);
        const normalizedHeaders = Object.fromEntries(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), value]));
        const sourceHeaders = {
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": normalizedHeaders["accept-language"] ?? language,
            Referer: "https://www.qweather.com/",
        };
        if (normalizedHeaders["user-agent"]) sourceHeaders["User-Agent"] = normalizedHeaders["user-agent"];

        Console.info("☑️ QWeather.FetchWeatherAlertPage", `url: ${sourceUrl}`, `language: ${language}`);
        const sourceResponse = await fetch({
            url: sourceUrl.toString(),
            headers: sourceHeaders,
            "auto-cookie": false,
        });
        const contentType = sourceResponse.headers?.["Content-Type"] ?? sourceResponse.headers?.["content-type"] ?? "";
        Console.info("QWeather.FetchWeatherAlertPage", `status: ${sourceResponse.statusCode ?? sourceResponse.status}`, `contentType: ${contentType || "undefined"}`);
        if (!sourceResponse.ok) {
            Console.warn("QWeather.FetchWeatherAlertPage", `upstreamStatus: ${sourceResponse.statusCode ?? sourceResponse.status}`);
            return { alerts: [], areaName: "", source: "QWeather" };
        }
        if (!contentType.toLowerCase().includes("text/html")) {
            Console.warn("QWeather.FetchWeatherAlertPage", `unexpectedContentType: ${contentType || "undefined"}`);
            return { alerts: [], areaName: "", source: "QWeather" };
        }
        const html = String(sourceResponse.body ?? "");
        const sourceSize = new TextEncoder().encode(html).byteLength;
        Console.debug("QWeather.FetchWeatherAlertPage", `bodyBytes: ${sourceSize}`);
        if (sourceSize > QWeather.#MaximumWeatherAlertPageSize) throw new RangeError("QWeather alert page is too large");

        const extracted = QWeather.ExtractWeatherAlertPage(html);
        Console.info("✅ QWeather.FetchWeatherAlertPage", `alerts: ${extracted.alerts.length}`, `source: ${extracted.source}`);
        const areaId = identifier.match(/-(\d+)$/)?.[1];
        return {
            ...extracted,
            alerts: extracted.alerts.map(alert => ({
                ...alert,
                ...(areaId && !alert.areaId ? { areaId } : {}),
                ...(extracted.areaName && !alert.areaName ? { areaName: extracted.areaName } : {}),
            })),
        };
    }

    async GeoAPI(path = "city/lookup") {
        Console.info("☑️ GeoAPI");
        const request = {
            url: `${this.endpoint}/geo/v2/${path}?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let metadata;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200":
                    metadata = {
                        attributionUrl: body?.location?.[0]?.fxLink,
                        latitude: body?.location?.[0]?.lat,
                        longitude: body?.location?.[0]?.lon,
                        providerName: "和风天气",
                        locationID: body?.location?.[0]?.id,
                    };
                    break;
                default:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`GeoAPI: ${error}`);
        } finally {
            Console.debug(`metadata: ${JSON.stringify(metadata, null, 2)}`);
            Console.info("✅ GeoAPI");
        }
        return metadata;
    }

    /**
     * 拉取 QWeather weatheralert/v1/current，并标准化为 WeatherAlerts.Build 可消费的来源结构。
     * Fetch QWeather weatheralert/v1/current and normalize it for WeatherAlerts.Build.
     * @returns {Promise<{metadata: object, detailsUrl: string, alerts: Array<object>, areaName: string, source: string}>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlert() {
        Console.info("☑️ WeatherAlert");
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: "https://developer.qweather.com/attribution.html",
            },
            detailsUrl: `https://weatherkit.apple.com/alertDetails/index.html?ids=${this.latitude},${this.longitude}&lang=${encodeURIComponent(this.weatherKitLanguage)}&party=QWeather`,
            alerts: [],
            areaName: "",
            source: "国家预警信息发布中心",
        };
        const request = {
            url: `${this.endpoint}/weatheralert/v1/current/${this.latitude}/${this.longitude}?lang=${this.language}`,
            headers: {
                ...this.headers,
                Accept: "application/json",
            },
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            const response = await fetch(request);
            const body = JSON.parse(response?.body ?? "{}");
            if (response?.ok === false) {
                Console.warn("WeatherAlert", `upstreamStatus: ${response.statusCode ?? response.status}`);
                return failedWeatherAlerts;
            }
            if (!body?.metadata || !Array.isArray(body?.alerts)) throw Error(JSON.stringify(body?.error ?? body?.code ?? body));
            weatherAlerts = { ...failedWeatherAlerts, ...this.#CreateWeatherAlerts(body) };
        } catch (error) {
            Console.error(`WeatherAlert: ${error}`);
        } finally {
            Console.info("✅ WeatherAlert");
        }
        return weatherAlerts;
    }

    /**
     * 拉取 QWeather 灾害预警页面，并生成 WeatherKit 顶级预警对象。
     * Fetch a QWeather severe-weather page and build a top-level WeatherKit alert object.
     * @param {string | URL | null | undefined} url QWeather 预警页面链接 / QWeather severe-weather page URL.
     * @returns {Promise<object | undefined>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlertWeb(url) {
        Console.info("☑️ WeatherAlertWeb");
        const identifier = QWeather.ParseWeatherAlertPageURL(url);
        if (!identifier) {
            Console.info("✅ WeatherAlertWeb", "Unsupported URL");
            return undefined;
        }
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: String(url),
            },
            detailsUrl: QWeather.BuildAppleAlertDetailsURL(identifier, this.weatherKitLanguage),
            alerts: [],
            areaName: "",
            source: "QWeather",
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            weatherAlerts = { ...failedWeatherAlerts, ...(await QWeather.FetchWeatherAlertPage(identifier, this.weatherKitLanguage)) };
        } catch (error) {
            Console.error(`WeatherAlertWeb: ${error}`);
        } finally {
            Console.info("✅ WeatherAlertWeb");
        }
        return weatherAlerts;
    }

    async WeatherNow() {
        Console.info("☑️ WeatherNow");
        const request = {
            url: `${this.endpoint}/v7/weather/now?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let currentWeather;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    currentWeather = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + 60 * 60,
                            language: "zh-CN", // `${this.language}-${this.country}`,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            reportedTime: (new Date(body?.now?.pubTime).getTime() / 1000) | 0,
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                        },
                        cloudCover: Number.parseInt(body?.now?.cloud, 10),
                        ...Weather.ConvertWeatherCodeField(body?.now?.text),
                        humidity: Number.parseInt(body?.now?.humidity, 10),
                        perceivedPrecipitationIntensity: Number.parseFloat(body?.now?.precip),
                        pressure: Number.parseFloat(body?.now?.pressure),
                        temperature: Number.parseFloat(body?.now?.temp),
                        temperatureApparent: Number.parseFloat(body?.now?.feelsLike),
                        temperatureDewPoint: Number.parseFloat(body?.now?.dew),
                        visibility: Number.parseFloat(body?.now?.vis) * 1000,
                        windDirection: Number.parseInt(body?.now?.wind360, 10),
                        windSpeed: Number.parseFloat(body?.now?.windSpeed),
                    };
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`WeatherNow: ${error}`);
        } finally {
            //Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
            Console.info("✅ WeatherNow");
        }
        return currentWeather;
    }

    async AirNow() {
        Console.info("☑️ AirNow");
        const request = {
            url: `${this.endpoint}/v7/air/now?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    airQuality = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + 60 * 60,
                            language: "zh-CN", // `${this.language}-${this.country}`,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            reportedTime: (new Date(body?.now?.pubTime).getTime() / 1000) | 0,
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                        },
                        categoryIndex: Number.parseInt(body?.now?.level, 10),
                        index: Number.parseInt(body?.now?.aqi, 10),
                        isSignificant: false,
                        pollutants: this.#CreatePollutantsV7(body?.now),
                        previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
                        primaryPollutant: this.#Config.Pollutants[body?.now?.primary] || "NOT_AVAILABLE",
                        scale: "HJ6332012",
                    };
                    if (body?.refer?.sources?.[0]) airQuality.metadata.providerName += `\n数据源: ${body?.refer?.sources?.[0]}`;
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`AirNow: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AirNow");
        }
        return airQuality;
    }

    async #AirQualityCurrent() {
        Console.info("☑️ AirQualityCurrent");

        if (this.#cache.airQualityCurrent?.metadata?.tag && !this.#cache.airQualityCurrent?.error) {
            Console.info("✅ AirQualityCurrent", "Using cache");
            return this.#cache.airQualityCurrent;
        }

        const request = {
            url: `${this.endpoint}/airquality/v1/current/${this.latitude}/${this.longitude}`,
            headers: this.headers,
        };
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.error) {
                case undefined: {
                    this.#cache.airQualityCurrent = body;
                    return body;
                }
                default:
                    throw Error(JSON.stringify(body?.error, null, 2));
            }
        } catch (error) {
            Console.error(`AirQualityCurrent: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AirQualityCurrent");
        }
        return {};
    }

    async Minutely() {
        Console.info("☑️ Minutely");
        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.Minutely.includes(this.country)) {
            Console.warn("Minutely", `Unsupported country: ${this.country}`);
            return;
        }

        const request = {
            url: `${this.endpoint}/v7/minutely/5m?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let forecastNextHour;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    const reportedTime = Math.trunc(new Date(body?.updateTime).getTime() / 1000);
                    let minuteStemp = new Date(body?.updateTime).setSeconds(0, 0);
                    minuteStemp = minuteStemp.valueOf() / 1000;
                    forecastNextHour = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + ForecastNextHour.ExpirationInterval,
                            language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            reportedTime,
                            temporarilyUnavailable: false,
                            sourceType: "MODELED",
                        },
                        condition: [],
                        forecastEnd: 0,
                        forecastStart: minuteStemp,
                        minutes: body?.minutely
                            ?.map((minutely, index) => {
                                const minute = {
                                    perceivedPrecipitationIntensity: 0,
                                    precipitationChance: 0,
                                    precipitationIntensity: Number.parseFloat(minutely.precip) * 12,
                                    startTime: new Date(minutely.fxTime) / 1000,
                                };
                                let minutes = [{ ...minute }, { ...minute }, { ...minute }, { ...minute }, { ...minute }];
                                minutes = minutes.map((minute, index) => {
                                    minute.startTime = minute.startTime + index * 60;
                                    return minute;
                                });
                                return minutes;
                            })
                            .flat(Number.POSITIVE_INFINITY),
                        summary: [],
                    };
                    forecastNextHour.minutes.length = Math.min(85, forecastNextHour.minutes.length);
                    forecastNextHour.forecastEnd = minuteStemp + 60 * forecastNextHour.minutes.length;
                    forecastNextHour.minutes = ForecastNextHour.Minute(forecastNextHour.minutes, body?.summary, "mmph");
                    forecastNextHour.summary = ForecastNextHour.Summary(forecastNextHour.minutes);
                    forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.summary);
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`Minutely: ${error}`);
        } finally {
            //Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
            Console.info("✅ Minutely");
        }
        return forecastNextHour;
    }

    async Hourly(hours = 168) {
        Console.info("☑️ Hourly", `host: ${this.host}`);
        const request = {
            url: `${this.endpoint}/v7/weather/${hours}h?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let forecastHourly;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    forecastHourly = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + 60 * 60,
                            language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            // WeatherKit metadata 的 uint 时间字段使用 Unix epoch 秒，不能写入 Date 的毫秒值。
                            reportedTime: Math.trunc(new Date(body?.updateTime).getTime() / 1000),
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                        },
                        hours: body?.hourly?.map(hourly => {
                            return {
                                cloudCover: Number.parseInt(hourly?.cloud, 10),
                                // cloudCoverHighAltPct: 0, // Not given
                                // cloudCoverLowAltPct: 0, // Not given
                                // cloudCoverMidAltPct: 0, // Not given
                                ...Weather.ConvertWeatherCodeField(hourly?.text),
                                // daylight: false, // Not given
                                forecastStart: (new Date(hourly?.fxTime).getTime() / 1000) | 0,
                                humidity: Number.parseInt(hourly?.humidity, 10),
                                // perceivedPrecipitationIntensity: "", // Not given
                                precipitationAmount: Number.parseFloat(hourly?.precip),
                                precipitationChance: Number.parseInt(hourly?.pop, 10),
                                precipitationIntensity: Number.parseInt(hourly?.precip, 10),
                                // precipitationType: "", // Not given
                                pressure: Number.parseFloat(hourly?.pressure),
                                // pressureTrend: "", // Not given
                                // snowfallAmount: 0, // Not given
                                // snowfallIntensity: 0, // Not given
                                temperature: Number.parseFloat(hourly?.temp),
                                // temperatureApparent: 0, // Not given
                                temperatureDewPoint: Number.parseFloat(hourly?.dew),
                                // uvIndex: 0, // Not given
                                // visibility: 0, // Not given
                                windDirection: Number.parseInt(hourly?.wind360, 10),
                                // windGust: 0, // Not given
                                windSpeed: Number.parseFloat(hourly?.windSpeed),
                            };
                        }),
                    };
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`Hourly: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(forecastHourly, null, 2)}`);
            Console.info("✅ Hourly");
        }
        return forecastHourly;
    }

    async Daily(days = 10) {
        Console.info("☑️ Daily", `host: ${this.host}`);
        const request = {
            url: `${this.endpoint}/v7/weather/${days}d?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let forecastDaily;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    const reportedTime = new Date(body?.updateTime);
                    const metadata = {
                        attributionUrl: body?.fxLink,
                        expireTime: timeStamp + 60 * 60,
                        language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                        latitude: this.latitude,
                        longitude: this.longitude,
                        providerLogo: providerNameToLogo("和风天气", this.version),
                        providerName: "和风天气",
                        readTime: timeStamp,
                        // WeatherKit metadata 的 uint 时间字段使用 Unix epoch 秒，不能写入 Date 的毫秒值。
                        reportedTime: Math.trunc(reportedTime.getTime() / 1000),
                        temporarilyUnavailable: false,
                        sourceType: "STATION",
                    };
                    const timezoneOffset = reportedTime.getTimezoneOffset();
                    forecastDaily = {
                        metadata: metadata,
                        days: body?.daily?.map(daily => {
                            const timeStamp = ((Date.parse(daily?.fxDate) / 1000) | 0) + timezoneOffset * 60; // 本地转 Unix 时间戳
                            return {
                                forecastStart: timeStamp,
                                forecastEnd: timeStamp + 24 * 3600, // 24 hours
                                // conditionCode: Weather.ConvertWeatherCode(daily?.textDay), // Not given (用白天数据代替)
                                // humidity 用一整天的数据代替
                                // humidityMax: daily?.humidity, // Not Accurate
                                // humidityMin: daily?.humidity, // Not Accurate
                                maxUvIndex: Number.parseInt(daily?.uvIndex, 10),
                                moonPhase: Weather.ConvertMoonPhase(daily?.moonPhase),
                                moonrise: this.#ConvertTimeStamp(daily?.fxDate, daily?.moonrise),
                                moonset: this.#ConvertTimeStamp(daily?.fxDate, daily?.moonset),
                                // QWeather does not provide WeatherKit's paired by-type totals.
                                // Keep Apple's scalar/by-type amount pair atomic during the merge.
                                // precipitationAmountByType: [], // Not given
                                // precipitationChance: 0, // Not given
                                // precipitationType: "", // Not given
                                // snowfallAmount: 0, // Not given
                                // solarMidnight: 0, // Not given
                                // solarNoon: 0, // Not given
                                sunrise: this.#ConvertTimeStamp(daily?.fxDate, daily?.sunrise),
                                // sunriseAstronomical: 0, // Not given
                                // sunriseCivil: 0, // Not given
                                // sunriseNautical: 0, // Not given
                                sunset: this.#ConvertTimeStamp(daily?.fxDate, daily?.sunset),
                                // sunsetAstronomical: 0, // Not given
                                // sunsetCivil: 0, // Not given
                                // sunsetNautical: 0, // Not given
                                temperatureMax: Number.parseFloat(daily?.tempMax),
                                // temperatureMaxTime: 0, // Not given
                                temperatureMin: Number.parseFloat(daily?.tempMin),
                                // temperatureMinTime: 0, // Not given
                                // visibilityMax: 0, // Not given
                                // visibilityMin: 0, // Not given
                                // windGustSpeedMax: 0, // Not given
                                windSpeedAvg: (Number.parseFloat(daily?.windSpeedDay) * 7 + Number.parseFloat(daily?.windSpeedNight) * 17) / 24, // 加权平均：白天7小时，晚上17小时
                                // windSpeedMax: 0, // Not given
                                daytimeForecast: {
                                    forecastStart: timeStamp + 7 * 3600, // 7 hours
                                    forecastEnd: timeStamp + 7 * 3600 + 12 * 3600, // 7 + 12 hours
                                    // cloudCover: 0, // Not given
                                    // cloudCoverHighAltPct: 0, // Not given
                                    // cloudCoverLowAltPct: 0, // Not given
                                    // cloudCoverMidAltPct: 0, // Not given
                                    ...Weather.ConvertWeatherCodeField(daily?.textDay),
                                    // humidity 用一整天的数据代替
                                    // humidityMax: daily?.humidity, // Not Accurate
                                    // humidityMin: daily?.humidity, // Not Accurate
                                    // The daily total cannot be reused as a daytime-only accumulated amount.
                                    // precipitationAmountByType: [], // Not given
                                    // precipitationChance: 0, // Not given
                                    // precipitationType: "", // Not given
                                    // snowfallAmount: 0, // Not given
                                    // temperatureMax: 0, // Not given
                                    // temperatureMin: 0, // Not given
                                    // visibility 用一整天的数据代替
                                    // visibilityMax: 0, // Not given
                                    // visibilityMin: 0, // Not given
                                    windDirection: Number.parseInt(daily?.wind360Day, 10),
                                    // windGustSpeedMax: 0, // Not given
                                    windSpeed: Number.parseFloat(daily?.windSpeedDay),
                                    // windSpeedMax: 0, // Not given
                                },
                                overnightForecast: {
                                    forecastStart: timeStamp + 19 * 3600, // 19 hours
                                    forecastEnd: timeStamp + 19 * 3600 + 12 * 3600, // 19 + 12 hours
                                    // cloudCover: 0, // Not given
                                    // cloudCoverHighAltPct: 0, // Not given
                                    // cloudCoverLowAltPct: 0, // Not given
                                    // cloudCoverMidAltPct: 0, // Not given
                                    ...Weather.ConvertWeatherCodeField(daily?.textNight),
                                    // humidity 用一整天的数据代替
                                    // humidityMax: daily?.humidity, // Not Accurate
                                    // humidityMin: daily?.humidity, // Not Accurate
                                    // The daily total cannot be reused as an overnight-only accumulated amount.
                                    // precipitationAmountByType: [], // Not given
                                    // precipitationChance: 0, // Not given
                                    // precipitationType: "", // Not given
                                    // snowfallAmount: 0, // Not given
                                    // temperatureMax: 0, // Not given
                                    // temperatureMin: 0, // Not given
                                    // visibility 用一整天的数据代替
                                    // visibilityMax: 0, // Not given
                                    // visibilityMin: 0, // Not given
                                    windDirection: Number.parseInt(daily?.wind360Night, 10),
                                    // windGustSpeedMax: 0, // Not given
                                    windSpeed: Number.parseFloat(daily?.windSpeedNight),
                                    // windSpeedMax: 0, // Not given
                                },
                            };
                        }),
                    };
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`Daily: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(forecastDaily, null, 2)}`);
            Console.info("✅ Daily");
        }
        return forecastDaily;
    }

    async #HistoricalAir(locationID = new Number(), date = time("yyyyMMdd", Date.now() - 24 * 60 * 60 * 1000)) {
        Console.info("☑️ HistoricalAir", `locationID: ${locationID}`, `date: ${date}`);
        const request = {
            url: `${this.endpoint}/v7/historical/air/?location=${locationID}&date=${date}`,
            headers: this.headers,
        };
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    return body;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`HistoricalAir: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ HistoricalAir");
        }
        return {};
    }

    #CreateWeatherAlerts(body) {
        Console.info("☑️ CreateWeatherAlerts");
        const convertedAlerts = (Array.isArray(body?.alerts) ? body.alerts : []).map(alert => this.#CreateWeatherAlert(alert)).filter(Boolean);
        Console.info("✅ CreateWeatherAlerts");
        return {
            alerts: convertedAlerts,
            areaName: convertedAlerts.find(alert => alert?.areaName)?.areaName ?? "",
            source: convertedAlerts.find(alert => alert?.source)?.source || (Array.isArray(body?.metadata?.attributions) ? body.metadata.attributions : []).find(item => item && !/延迟|过时|disclaimer|delayed|outdated/i.test(item)) || "国家预警信息发布中心",
        };
    }

    /**
     * 将单条 QWeather 预警转成 Apple alertDetails JSON 的中间记录。
     * Convert one QWeather alert item to the intermediate record used by Apple alertDetails JSON.
     * @param {any} alert QWeather alerts[] 项；senderName 为签发者，areaName 为受影响区域，onsetTime 为事件开始时间，eventType.name 为本地化事件名，eventType.code 用于分类和 token。
     * QWeather alerts[] item; senderName is the issuer, areaName is the affected area, onsetTime is the event onset, eventType.name is the localized event name, and eventType.code supplies the category and token.
     * @returns {object | undefined} 标准化后的预警记录 / Normalized alert record.
     */
    #CreateWeatherAlert(alert) {
        const issuedTime = this.#DateISOString(alert?.issuedTime || alert?.effectiveTime);
        if (!issuedTime) return undefined;
        const effectiveTime = this.#DateISOString(alert?.effectiveTime) || issuedTime;
        const expireTime = this.#DateISOString(alert?.expiresTime || alert?.expireTime);
        const eventOnsetTime = this.#DateISOString(alert?.eventOnsetTime || alert?.onsetTime || alert?.effectiveTime) || effectiveTime;
        const eventEndTime = this.#DateISOString(alert?.eventEndTime || alert?.endTime || alert?.expiresTime || alert?.expireTime);
        const source = String(alert?.senderName ?? "").trim();
        const areaId = String(alert?.areaId ?? alert?.areaCode ?? "").trim();
        const areaName = String(alert?.areaName ?? "").trim();
        const token = String(alert?.token ?? alert?.eventType?.code ?? alert?.icon ?? "").trim();
        const eventCode = Number(alert?.eventType?.code);
        const eventName = String(alert?.eventType?.name ?? "").trim();
        return {
            ...(areaId ? { areaId } : {}),
            ...(areaName ? { areaName } : {}),
            certainty: alert?.certainty ?? "unknown",
            description: String(alert?.headline ?? "").trim(),
            effectiveTime,
            ...(eventEndTime ? { eventEndTime } : {}),
            eventOnsetTime,
            ...(expireTime ? { expireTime } : {}),
            guidelines: this.#SplitWeatherAlertGuidelines(alert?.instruction ?? alert?.instructions),
            identifier: alert?.id,
            ...(alert?.importance ? { importance: alert.importance } : {}),
            issuedTime,
            ...(eventName ? { eventName } : {}),
            message: (String(alert?.description ?? "").trim() || String(alert?.headline ?? "").trim()).replace(/^\p{Ll}/u, character => character.toUpperCase()),
            phenomenon: (this.#Config.WeatherAlert.EventCategories.find(({ codes }) => codes.some(([start, end]) => eventCode >= start && eventCode <= end))?.category ?? eventName) || "Other",
            responses: Array.isArray(alert?.responseTypes) ? alert.responseTypes.map(response => String(response ?? "").trim()).filter(Boolean) : [],
            reportedAt: issuedTime,
            ...(alert?.significance ? { significance: alert.significance } : {}),
            ...(source ? { source } : {}),
            severity: alert?.severity ?? "unknown",
            standard: "",
            ...(token ? { token } : {}),
            urgency: alert?.urgency ?? "unknown",
        };
    }

    #Metadata(attributionUrl = `https://www.qweather.com/`, sourceType = "MODELED", temporarilyUnavailable = false) {
        const timeStamp = Date.now() / 1000;
        return {
            longitude: this.longitude,
            providerName: "和风天气",
            providerLogo: providerNameToLogo("和风天气", this.version),
            reportedTime: timeStamp,
            latitude: this.latitude,
            expireTime: timeStamp + 60 * 60,
            attributionUrl,
            temporarilyUnavailable,
            readTime: timeStamp,
            sourceType,
        };
    }

    /**
     * 创建 WeatherKit 格式污染物对象（airquality/v1/current 数据源）。
     * @link https://dev.qweather.com/docs/airquality/
     * @param {Array<{
     *   code: string,
     *   concentration: { value: number, unit: string },
     *   subIndexes?: Array<{ code: string, aqi: number }>
     * }>} pollutantsObj - 原始污染物数组。
     * @param {string} [scaleCode] - 目标指数口径 code（如 cn-mee / us-epa）。
     * @returns {Array<{
     *   pollutantType: string,
     *   amount: number,
     *   units: string,
     *   index?: number
     * }>} 转换后的污染物数组。
     */
    #CreatePollutants(pollutantsObj, scaleCode) {
        Console.info("☑️ CreatePollutants");
        Console.debug(`pollutantsObj: ${JSON.stringify(pollutantsObj)}`);

        // TODO: what is ppmC? https://dev.qweather.com/docs/resource/air-info/#pollutants
        const pollutants = pollutantsObj
            .filter(pollutant => pollutant.concentration.unit !== "ppmC")
            .map(({ code, concentration, subIndexes = [] }) => {
                const { value, unit } = concentration;
                const pollutantType = this.#Config.Pollutants[code];
                const indexObj = subIndexes.find(subIndex => subIndex.code === scaleCode);
                if (scaleCode && !indexObj) Console.warn("CreatePollutants", `No index for ${pollutantType} was found for required scale`);

                const friendlyUnits = AirQuality.Config.Units.Friendly;
                const { ugm3, mgm3, ppb, ppm } = AirQuality.Config.Units.WeatherKit;
                switch (unit) {
                    case friendlyUnits.MILLIGRAMS_PER_CUBIC_METER:
                        return { pollutantType, amount: AirQuality.ConvertUnit(value, mgm3, ugm3), units: ugm3, index: scaleCode ? (indexObj?.aqi ?? -1) : undefined };
                    case friendlyUnits.PARTS_PER_MILLION:
                        return { pollutantType, amount: AirQuality.ConvertUnit(value, ppm, ppb), units: ppb, index: scaleCode ? (indexObj?.aqi ?? -1) : undefined };
                    default:
                        return { pollutantType, amount: value, units: this.#Config.Units[unit], index: scaleCode ? (indexObj?.aqi ?? -1) : undefined };
                }
            });

        Console.info("✅ CreatePollutants");
        return pollutants;
    }

    /**
     * 创建 WeatherKit 格式污染物对象（v7/air/now 与 historical/air 数据源）。
     * @link https://dev.qweather.com/docs/resource/unit/
     * @param {Object} pollutantsObj - v7 接口返回的污染物键值对象。
     * @returns {Array<{amount: number, pollutantType: string, units: string}>} 转换后的污染物数组。
     */
    #CreatePollutantsV7(pollutantsObj) {
        Console.info("☑️ CreatePollutantsV7");
        Console.debug(`pollutantsObj: ${JSON.stringify(pollutantsObj)}`);

        const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
        const pollutants = Object.entries(pollutantsObj)
            .map(([name, amount]) => {
                const parsedAmount = Number.parseFloat(amount);
                switch (name) {
                    case "co":
                        return {
                            amount: AirQuality.ConvertUnit(parsedAmount ?? -1, mgm3, ugm3),
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                        };
                    case "no":
                    case "no2":
                    case "so2":
                    case "o3":
                    case "nox":
                    case "pm25":
                    case "pm10":
                        return {
                            amount: parsedAmount ?? -1,
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                        };
                    default:
                        return null;
                }
            })
            .filter(Boolean);

        Console.info("✅ CreatePollutantsV7");
        return pollutants;
    }

    async CurrentAirQuality(forcePrimaryPollutant = true) {
        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.AirQuality.includes(this.country)) {
            Console.warn("CurrentAirQuality", `Unsupported country: ${this.country}`);
            return {
                metadata: this.#Metadata(`https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`, undefined, true),
                pollutants: [],
                previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
            };
        }

        const findSupportedIndex = indexes => {
            Console.info("☑️ findSupportedIndex");

            const supportedCodes = ["cn-mee", "cn-mee-1h", "eu-eea", "us-epa", "us-epa-nc"];
            for (const index of indexes) {
                if (supportedCodes.includes(index.code)) {
                    Console.info("✅ indexCodeToScale", `index.code: ${index.code}`);
                    return index;
                }
            }

            return {};
        };

        const indexCodeToScale = code => {
            Console.info("☑️ indexCodeToScale", `code: ${code}`);

            const { HJ6332012, EPA_NowCast, EU_EAQI } = AirQuality.Config.Scales;
            switch (code) {
                // We don't need calcualtion so they are same
                case "cn-mee":
                case "cn-mee-1h":
                    Console.info("✅ indexCodeToScale", "HJ6332012");
                    return HJ6332012;
                case "us-epa":
                case "us-epa-nc":
                    Console.info("✅ indexCodeToScale", "EPA_NowCast");
                    return EPA_NowCast;
                case "eu-eea":
                    Console.info("✅ indexCodeToScale", "EU_EAQI");
                    return EU_EAQI;
                default:
                    Console.error("indexCodeToScale", "不支持的code");
                    return {};
            }
        };

        Console.info("☑️ CurrentAirQuality");
        const airQualityCurrent = await this.#AirQualityCurrent();
        if (!Array.isArray(airQualityCurrent.pollutants)) {
            Console.error("AirQuality", "Failed to get current air quality data.");
            return {
                metadata: this.#Metadata(
                    // TODO: &lang=zh
                    `https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
                    undefined,
                    true,
                ),
                pollutants: [],
                previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
            };
        }

        const supportedIndex = findSupportedIndex(airQualityCurrent.indexes);
        const scale = indexCodeToScale(supportedIndex?.code);

        const particularAirQuality = {
            metadata: this.#Metadata(
                // TODO: &lang=zh
                `https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
            ),
            pollutants: this.#CreatePollutants(airQualityCurrent.pollutants, supportedIndex?.code),
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
        };

        if (!supportedIndex?.code || !scale?.categories) {
            Console.error("AirQuality", "No supported index found", `airQualityCurrent.indexes[].code = ${JSON.stringify(airQualityCurrent.indexes?.map(({ code }) => code))}`);
            return {
                ...particularAirQuality,
                index: -1,
                isSignificant: false,
                categoryIndex: -1,
                primaryPollutant: "NOT_AVAILABLE",
                scale: AirQuality.ToWeatherKitScale(AirQuality.Config.Scales.HJ6332012.weatherKitScale),
            };
        }

        const index = Number(supportedIndex.aqi);
        const suppliedCategoryIndex = Number.parseInt(supportedIndex.level, 10);
        // QWeather 允许 level 为 null；此时按同一 scale 的区间回算，避免 NaN 编码成无效等级 0。
        const categoryIndex = Number.isFinite(suppliedCategoryIndex) && suppliedCategoryIndex > 0 ? suppliedCategoryIndex : AirQuality.CategoryIndex(index, scale.categories);
        const apiPrimaryPollutant = this.#Config.Pollutants[supportedIndex.primaryPollutant?.code] || "NOT_AVAILABLE";
        Console.debug(`apiPrimaryPollutant: ${apiPrimaryPollutant}`);

        if (!forcePrimaryPollutant && apiPrimaryPollutant === "NOT_AVAILABLE") {
            Console.info("CurrentAirQuality", "Max index of pollutants is <= 50, primaryPollutant will be NOT_AVAILABLE.");
        }

        const airQuality = {
            metadata: this.#Metadata(
                // TODO: &lang=zh
                `https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
            ),
            categoryIndex,
            index,
            isSignificant: categoryIndex >= scale.categories.significantIndex,
            ...particularAirQuality,
            primaryPollutant: apiPrimaryPollutant,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };

        if (airQuality.primaryPollutant === "NOT_AVAILABLE") {
            const calculatedPrimaryPollutant = AirQuality.PrimaryPollutant(particularAirQuality.pollutants, scale.categories);
            const isNotAvailable = !forcePrimaryPollutant && calculatedPrimaryPollutant.index <= 50;
            if (isNotAvailable) {
                Console.info("CurrentAirQuality", `Max index of pollutants ${calculatedPrimaryPollutant.pollutantType} = ${calculatedPrimaryPollutant.index} is <= 50, primaryPollutant will be set to NOT_AVAILABLE.`);
            }
            if (!isNotAvailable) airQuality.primaryPollutant = calculatedPrimaryPollutant.pollutantType;
        }

        Console.info("✅ CurrentAirQuality");
        return airQuality;
    }

    async YesterdayAirQuality(locationInfo) {
        Console.info("☑️ YesterdayAirQuality", `locationInfo ${JSON.stringify(locationInfo)}`);
        const failedAirQuality = {
            metadata: this.#Metadata(undefined, undefined, true),
            categoryIndex: -1,
            pollutants: [],
        };

        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.AirQuality.includes(this.country)) {
            Console.warn("YesterdayAirQuality", `Unsupported country: ${this.country}`);
            return failedAirQuality;
        }

        // Some locationID at Hong Kong and Macau with length 9 is supported
        if (!locationInfo || locationInfo.iso === "TW" || locationInfo.id.length !== 9) {
            Console.error("YesterdayAirQuality", "Unsupported location");
            return failedAirQuality;
        }

        const historicalAir = await this.#HistoricalAir(locationInfo.id);
        if (!historicalAir.airHourly) {
            Console.error("YesterdayAirQuality", `Failed to get HistoricalAir(${locationInfo.id})`);
            return failedAirQuality;
        }

        const hour = new Date().getHours();
        const categoryIndex = Number.parseInt(historicalAir.airHourly[hour].level, 10);
        const index = Number.parseInt(historicalAir.airHourly[hour].aqi, 10);
        const pollutants = this.#CreatePollutantsV7(historicalAir.airHourly[hour]);
        Console.debug(`hour: ${hour}`, `index: ${index}`);

        Console.info("✅ YesterdayAirQuality", `pollutants: ${JSON.stringify(pollutants)}`, `categoryIndex: ${categoryIndex}`);
        return {
            metadata: this.#Metadata(historicalAir.fxLink),
            categoryIndex,
            index,
            pollutants,
            primaryPollutant: this.#Config.Pollutants[historicalAir.airHourly[hour].primary] || "NOT_AVAILABLE",
            scale: AirQuality.ToWeatherKitScale(AirQuality.Config.Scales.HJ6332012.weatherKitScale),
        };
    }

    #ConvertTimeStamp(fxDate, time) {
        const dateTime = `${fxDate}T${time}:00+08:00`;
        return (new Date(dateTime).getTime() / 1000) | 0;
    }

    #DateISOString(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toISOString();
    }

    #SplitWeatherAlertGuidelines(instruction) {
        return String(instruction ?? "")
            .split(/\r?\n/)
            .map(line => line.replace(/^\s*\d+[.、]\s*/, "").trim())
            .filter(Boolean);
    }

    /**
     * 解码 QWeather 灾害预警页面中的 HTML 文本。
     * Decode HTML text from a QWeather severe-weather page.
     * @param {string} value HTML 文本 / HTML text.
     * @returns {string} 纯文本 / Plain text.
     */
    static #DecodeWeatherAlertPageHTML(value) {
        const normalized = String(value ?? "")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/&apos;/gi, "&#39;")
            .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
            .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
        return _.unescape(normalized)
            .replace(/\r/g, "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    static #FirstWeatherAlertPageMatch(source, pattern, fallback = "") {
        const match = source.match(pattern);
        return match ? QWeather.#DecodeWeatherAlertPageHTML(match[1]) : fallback;
    }

    static #ParseWeatherAlertPageHeadline(description) {
        const title = String(description ?? "").trim();
        const chinese = title.match(/^(.+?)发布\s*[:：]?\s*(.+)$/);
        if (chinese?.[1] && chinese?.[2]) return { eventName: chinese[2].trim(), source: chinese[1].trim() };

        const cap = title.match(/^(.+?)\s+issued\b[\s\S]*\s+by\s+(.+)$/i);
        if (cap?.[1] && cap?.[2]) return { eventName: cap[1].trim(), source: cap[2].trim() };

        const issued = title.match(/^(.+?)\s+issued\b\s*[:：]?\s*(.+)$/i);
        if (issued?.[1] && issued?.[2]) {
            const context = issued[2].trim();
            const capContext = /^(?:for\b|\d{1,2}[/:.-]|\p{L}+\s+(?:\d{1,2}\b|at\b|until\b))/iu.test(context);
            return capContext ? { eventName: issued[1].trim(), source: "" } : { eventName: context, source: issued[1].trim() };
        }

        const issues = title.match(/^(.+?)\s+issues?\b\s*[:：]?\s*(.+)$/i);
        if (issues?.[1] && issues?.[2]) return { eventName: issues[2].trim(), source: issues[1].trim() };
        return { eventName: title, source: "" };
    }
}
