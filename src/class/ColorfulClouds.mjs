import { Console, fetch, Lodash as _ } from "@nsnanocat/util";
import Weather from "./Weather.mjs";
import AirQuality from "./AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class ColorfulClouds {
    constructor(parameters, token) {
        this.Name = "ColorfulClouds";
        this.Version = "4.3.0";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.endpoint = `https://api.caiyunapp.com/v2.6/${token}/${parameters.longitude},${parameters.latitude}`;
        this.headers = { Referer: "https://caiyunapp.com/" };
        this.token = token;
        this.version = parameters.version;
        this.language =
            this.#Config.Language[
                String(parameters.language ?? "")
                    .trim()
                    .toLowerCase()
            ] ?? this.#Config.Language[""];
        this.latitude = parameters.latitude;
        this.longitude = parameters.longitude;
        this.country = parameters.country;
        this.weatherKitLanguage = String(parameters.weatherKitLanguage ?? parameters.language ?? "").trim() || "zh-CN";
    }

    #cache = {
        alert: {},
        realtime: {},
    };

    #Config = {
        Language: {
            "": "zh_CN",
            ja: "ja",
            "ja-jp": "ja",
            en: "en_US",
            "en-gb": "en_GB",
            "en-au": "en_US",
            "en-ca": "en_US",
            "en-us": "en_US",
            zh: "zh_CN",
            "zh-cn": "zh_CN",
            "zh-hans": "zh_CN",
            "zh-hans-cn": "zh_CN",
            "zh-sg": "zh_CN",
            "zh-hant": "zh_TW",
            "zh-hant-hk": "zh_TW",
            "zh-hant-mo": "zh_TW",
            "zh-hant-tw": "zh_TW",
            "zh-hk": "zh_TW",
            "zh-mo": "zh_TW",
            "zh-tw": "zh_TW",
        },
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
        },
        WeatherAlert: {
            Events: {
                "01": "台风",
                "02": "暴雨",
                "03": "暴雪",
                "04": "寒潮",
                "05": "大风",
                "06": "沙尘暴",
                "07": "高温",
                "08": "干旱",
                "09": "雷电",
                10: "冰雹",
                11: "霜冻",
                12: "大雾",
                13: "霾",
                14: "道路结冰",
                15: "森林火险",
                16: "雷雨大风",
                17: "春季沙尘天气趋势预警",
                18: "沙尘",
            },
            Severities: {
                "00": "unknown",
                "01": "minor",
                "02": "moderate",
                "03": "severe",
                "04": "extreme",
                1: "extreme",
                2: "severe",
                3: "moderate",
                4: "minor",
                5: "unknown",
            },
            Sources: {
                1: "US National Weather Service",
                2: "Environment and Climate Change Canada",
            },
            Certainties: {
                1: "observed",
                2: "likely",
                3: "possible",
                4: "unlikely",
                5: "unknown",
            },
            Urgencies: {
                1: "immediate",
                2: "expected",
                3: "future",
                4: "past",
                5: "unknown",
            },
            Categories: {
                1: "Geo",
                2: "Met",
                3: "Safety",
                4: "Security",
                5: "Rescue",
                6: "Fire",
                7: "Health",
                8: "Env",
                9: "Transport",
                10: "Infra",
                11: "CBRNE",
                12: "Other",
            },
        },
        Availability: {
            Minutely: [
                "CN",
                "HK",
                "MO",
                "TW",
                "IT",
                "LT",
                "MT",
                "FR",
                "SK",
                "NO",
                "BY",
                "IS",
                "CZ",
                "SI",
                "DE",
                "ES",
                "UA",
                "DK",
                "PL",
                "FI",
                "SE",
                "HR",
                "RU",
                "RO",
                "PT",
                "EE",
                "RS",
                "AT",
                "GR",
                "HU",
                "FJ",
                "GU",
                "MH",
                "NC",
                "TR",
                "BH",
                "SA",
                "ID",
                "IR",
                "SG",
                "OM",
                "PH",
                "IN",
                "KH",
                "CY",
                "MY",
                "VN",
                "KW",
                "TH",
                "KR",
                "KP",
                "CA",
                "BS",
                "KY",
                "MX",
                "PA",
                "MQ",
                "CU",
                "BM",
                "PR",
                "CW",
                "GP",
                "NI",
                "BR",
                "GF",
                "CO",
                "GY",
                "PY",
                "AR",
            ],
            AirQuality: ["CN", "HK", "MO"],
        },
    };

    async #RealTime() {
        Console.info("☑️ RealTime");

        if (this.#cache.realtime?.result?.realtime?.status === "ok") {
            Console.info("✅ RealTime", "Using cache");
            return this.#cache.realtime;
        }

        const request = {
            url: `${this.endpoint}/realtime?lang=${this.language}&alert=true`,
            headers: this.headers,
        };
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok": {
                    switch (body?.result?.realtime?.status) {
                        case "ok": {
                            this.#cache.realtime = body;
                            break;
                        }
                        case "error":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.realtime?.status, reason: body?.result?.realtime }));
                    }
                    switch (body?.result?.alert?.status) {
                        case "ok":
                            this.#cache.alert = body.result.alert;
                            break;
                        case "error":
                        case undefined:
                            break;
                    }
                    Console.info("✅ RealTime");
                    return body;
                }
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`RealTime: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ RealTime");
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
            url: `${this.endpoint}/minutely?unit=metric:v2&lang=${this.language}`,
            headers: this.headers,
        };
        let forecastNextHour;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok":
                    switch (body?.result?.minutely?.status) {
                        case "ok": {
                            const timeStamp = (Date.now() / 1000) | 0;
                            const metadata = {
                                attributionUrl: "https://www.caiyunapp.com/h5",
                                expireTime: timeStamp + ForecastNextHour.ExpirationInterval,
                                language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                                latitude: body?.location?.[0],
                                longitude: body?.location?.[1],
                                providerLogo: providerNameToLogo("彩云天气", this.version),
                                providerName: "彩云天气",
                                readTime: timeStamp,
                                reportedTime: body?.server_time,
                                temporarilyUnavailable: false,
                                sourceType: "MODELED",
                            };
                            body.result.minutely.probability = body.result.minutely.probability.map(probability => Math.round(probability * 100));
                            let minuteStemp = new Date(body?.server_time * 1000).setSeconds(0, 0);
                            minuteStemp = minuteStemp.valueOf() / 1000 - 60;
                            forecastNextHour = {
                                metadata: metadata,
                                condition: [],
                                forecastEnd: 0,
                                forecastStart: minuteStemp,
                                minutes: body?.result?.minutely?.precipitation_2h?.map((precipitationIntensity, index) => {
                                    const minute = {
                                        perceivedPrecipitationIntensity: 0,
                                        precipitationChance: 0,
                                        precipitationIntensity: precipitationIntensity,
                                        startTime: minuteStemp + 60 * index,
                                    };
                                    if (index < 30) minute.precipitationChance = body?.result?.minutely?.probability?.[0];
                                    else if (index < 60) minute.precipitationChance = body?.result?.minutely?.probability?.[1];
                                    else if (index < 90) minute.precipitationChance = body?.result?.minutely?.probability?.[2];
                                    else minute.precipitationChance = body?.result?.minutely?.probability?.[3];
                                    return minute;
                                }),
                                summary: [],
                            };
                            forecastNextHour.minutes.length = Math.min(85, forecastNextHour.minutes.length);
                            forecastNextHour.forecastEnd = minuteStemp + 60 * forecastNextHour.minutes.length;
                            forecastNextHour.minutes = ForecastNextHour.Minute(forecastNextHour.minutes, body?.result?.minutely?.description, "mmph");
                            forecastNextHour.summary = ForecastNextHour.Summary(forecastNextHour.minutes);
                            forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.summary);
                            break;
                        }
                        case "error":
                        case "failed":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.minutely?.status, reason: body?.result?.minutely }));
                    }
                    break;
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`Minutely: ${error}`);
        } finally {
            //Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
            Console.info("✅ Minutely");
        }
        return forecastNextHour;
    }

    /**
     * 从彩云实况缓存读取 v2.6 预警，并标准化为 WeatherAlerts.mergeAlerts 可消费的来源结构。
     * Read Caiyun v2.6 alerts from the realtime cache and normalize them for WeatherAlerts.mergeAlerts.
     * @link https://docs.caiyunapp.com/weather-api/v2/v2.6/5-alert.html
     * @returns {Promise<{metadata: object, detailsUrl: string, alerts: Array<object>, areaName: string, source: string}>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlert() {
        Console.info("☑️ WeatherAlert");
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: "https://www.caiyunapp.com/h5",
            },
            detailsUrl: `https://weatherkit.apple.com/alertDetails/index.html?ids=${this.latitude},${this.longitude}&lang=${encodeURIComponent(this.weatherKitLanguage)}&party=ColorfulClouds`,
            alerts: [],
            areaName: "",
            source: "彩云天气",
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            await this.#RealTime();
            if (!Array.isArray(this.#cache.alert?.content)) throw Error(JSON.stringify(this.#cache.alert));
            weatherAlerts = { ...failedWeatherAlerts, ...this.#CreateWeatherAlerts(this.#cache.alert) };
        } catch (error) {
            Console.error(`WeatherAlert: ${error}`);
        } finally {
            Console.info("✅ WeatherAlert");
        }
        return weatherAlerts;
    }

    /**
     * 拉取彩云 v3 CAP 预警，并标准化为 WeatherAlerts.mergeAlerts 可消费的来源结构。
     * Fetch Caiyun v3 CAP alerts and normalize them for WeatherAlerts.mergeAlerts.
     * @returns {Promise<{metadata: object, detailsUrl: string, alerts: Array<object>, areaName: string, source: string}>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlertV3CAP() {
        Console.info("☑️ WeatherAlertV3CAP");
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: "https://www.caiyunapp.com/h5",
            },
            detailsUrl: `https://weatherkit.apple.com/alertDetails/index.html?ids=${this.latitude},${this.longitude}&lang=${encodeURIComponent(this.weatherKitLanguage)}&party=ColorfulClouds`,
            alerts: [],
            areaName: "",
            source: "彩云天气",
        };
        const url = new URL("https://singer.caiyunhub.com/v3/cap_alert/location");
        url.searchParams.set("token", this.token);
        url.searchParams.set("longitude", this.longitude);
        url.searchParams.set("latitude", this.latitude);
        url.searchParams.set("language", this.language);
        const request = {
            url: url.toString(),
            headers: this.headers,
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            const response = await fetch(request);
            const body = JSON.parse(response?.body ?? "{}");
            if (response?.ok === false) {
                Console.warn("WeatherAlertV3CAP", `upstreamStatus: ${response.statusCode ?? response.status}`);
                return failedWeatherAlerts;
            }
            if (!Array.isArray(body?.alerts)) throw Error(JSON.stringify(body?.error ?? body?.reason ?? body?.code ?? body));
            weatherAlerts = { ...failedWeatherAlerts, ...this.#CreateWeatherAlertsV3CAP(body) };
        } catch (error) {
            Console.error(`WeatherAlertV3CAP: ${error}`);
        } finally {
            Console.info("✅ WeatherAlertV3CAP");
        }
        return weatherAlerts;
    }

    async #Hourly(hourlysteps = 273, begin = undefined) {
        Console.info("☑️ Hourly", `hourlysteps: ${hourlysteps}`, `begin: ${begin}`);
        const request = {
            url: `${this.endpoint}/hourly?hourlysteps=${hourlysteps}&lang=${this.language}`,
            headers: this.headers,
        };
        if (begin) request.url += `&begin=${begin}`;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok":
                    switch (body?.result?.hourly?.status) {
                        case "ok": {
                            Console.info("✅ Hourly");
                            return body;
                        }
                        case "error":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.hourly?.status, reason: body?.result?.hourly }));
                    }
                    break;
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`Hourly: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(this.airQuality, null, 2)}`);
            Console.info("✅ Hourly");
        }
        return {};
    }

    async Daily(dailysteps = 10, begin = undefined) {
        Console.info("☑️ Daily");
        const request = {
            url: `${this.endpoint}/daily?dailysteps=${dailysteps}&lang=${this.language}`,
            headers: this.headers,
        };
        if (begin) request.url += `&begin=${begin}`;
        let forecastDaily;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok":
                    switch (body?.result?.daily?.status) {
                        case "ok": {
                            const timeStamp = (Date.now() / 1000) | 0;
                            const metadata = {
                                attributionUrl: "https://www.caiyunapp.com/h5",
                                expireTime: timeStamp + 60 * 60,
                                language: "zh-CN", // `${this.language}-${this.country}`,
                                latitude: body?.location?.[0],
                                longitude: body?.location?.[1],
                                providerLogo: providerNameToLogo("彩云天气", this.version),
                                providerName: "彩云天气",
                                readTime: timeStamp,
                                reportedTime: body?.server_time,
                                temporarilyUnavailable: false,
                                sourceType: "STATION",
                            };
                            forecastDaily = {
                                metadata: metadata,
                                days: [],
                            };
                            for (let i = 0; i < dailysteps; i++) {
                                const timeStamp = (new Date(body?.result?.daily?.skycon?.[i]?.date).getTime() / 1000) | 0;
                                forecastDaily.days.push({
                                    forecastStart: timeStamp,
                                    forecastEnd: timeStamp + 24 * 3600, // 24 hours
                                    ...Weather.ConvertWeatherCodeField(body?.result?.daily?.skycon?.[i]?.value),
                                    humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100),
                                    humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100),
                                    // maxUvIndex: Weather.ConvertDSWRF(body?.result?.daily?.dswrf?.[i]?.max), // ConvertDSWRF 转换不准确
                                    // moonPhase: "", // Not given
                                    // moonrise: body?.result?.daily?.astro?.[i].sunset.time, // Not given
                                    // moonset: body?.result?.daily?.astro?.[i].sunrise.time, // Not given
                                    // Caiyun `avg` is an average rate (mm/h), not WeatherKit's accumulated amount (mm).
                                    // Leave both amount fields absent so the merge keeps Apple's paired scalar/by-type totals.
                                    // precipitationAmountByType: [], // Not given
                                    precipitationChance: body?.result?.daily?.precipitation?.[i]?.probability,
                                    // precipitationType: "", // Not given
                                    // snowfallAmount: 0, // Not given
                                    // solarMidnight: 0, // Not given
                                    // solarNoon: 0, // Not given
                                    //sunrise: body?.result?.daily?.astro?.[i].sunrise.time, // 未转换
                                    // sunriseAstronomical: 0, // Not given
                                    // sunriseCivil: 0, // Not given
                                    // sunriseNautical: 0, // Not given
                                    //sunset: body?.result?.daily?.astro?.[i].sunset.time, // 未转换
                                    // sunsetAstronomical: 0, // Not given
                                    // sunsetCivil: 0, // Not given
                                    // sunsetNautical: 0, // Not given
                                    temperatureMax: body?.result?.daily?.temperature?.[i]?.max,
                                    // temperatureMaxTime: 0, // Not given
                                    temperatureMin: body?.result?.daily?.temperature?.[i]?.min,
                                    // temperatureMinTime: 0, // Not given
                                    visibilityMax: body?.result?.daily?.visibility?.[i]?.max * 1000,
                                    visibilityMin: body?.result?.daily?.visibility?.[i]?.min * 1000,
                                    // windGustSpeedMax: 0, // Not given
                                    windSpeedAvg: body?.result?.daily?.wind?.[i]?.avg?.speed,
                                    windSpeedMax: body?.result?.daily?.wind?.[i]?.max?.speed,
                                    daytimeForecast: {
                                        forecastStart: timeStamp + 8 * 3600, // 8 hours
                                        forecastEnd: timeStamp + 8 * 3600 + 12 * 3600, // 8 + 12 hours
                                        cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
                                        // cloudCoverHighAltPct: 0, // Not given
                                        // cloudCoverLowAltPct: 0, // Not given
                                        // cloudCoverMidAltPct: 0, // Not given
                                        ...Weather.ConvertWeatherCodeField(body?.result?.daily?.skycon_08h_20h?.[i]?.value),
                                        // humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100), // Not given
                                        // humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100), // Not given
                                        // Caiyun `avg` is mm/h and cannot replace WeatherKit's accumulated precipitation total.
                                        // precipitationAmountByType: [], // Not given
                                        precipitationChance: body?.result?.daily?.precipitation_08h_20h?.[i]?.probability,
                                        // precipitationType: "", // Not given
                                        // snowfallAmount: 0, // Not given
                                        temperatureMax: body?.result?.daily?.temperature_08h_20h?.[i]?.max,
                                        temperatureMin: body?.result?.daily?.temperature_08h_20h?.[i]?.min,
                                        // visibilityMax: body?.result?.daily?.visibility?.[i]?.max * 1000, // Not given
                                        // visibilityMin: body?.result?.daily?.visibility?.[i]?.min * 1000, // Not given
                                        windDirection: body?.result?.daily?.wind_08h_20h?.[i]?.avg?.direction,
                                        // windGustSpeedMax: 0, // Not given
                                        windSpeed: body?.result?.daily?.wind_08h_20h?.[i]?.avg?.speed,
                                        windSpeedMax: body?.result?.daily?.wind_08h_20h?.[i]?.max?.speed,
                                    },
                                    overnightForecast: {
                                        forecastStart: timeStamp + 20 * 3600, // 20 hours
                                        forecastEnd: timeStamp + 20 * 3600 + 12 * 3600, // 20 + 12 hours
                                        cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
                                        // cloudCoverHighAltPct: 0, // Not given
                                        // cloudCoverLowAltPct: 0, // Not given
                                        // cloudCoverMidAltPct: 0, // Not given
                                        ...Weather.ConvertWeatherCodeField(body?.result?.daily?.skycon_20h_32h?.[i]?.value),
                                        // humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100), // Not given
                                        // humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100), // Not given
                                        // Caiyun `avg` is mm/h and cannot replace WeatherKit's accumulated precipitation total.
                                        // precipitationAmountByType: [], // Not given
                                        precipitationChance: body?.result?.daily?.precipitation_20h_32h?.[i]?.probability,
                                        // precipitationType: "", // Not given
                                        // snowfallAmount: 0, // Not given
                                        temperatureMax: body?.result?.daily?.temperature_20h_32h?.[i]?.max,
                                        temperatureMin: body?.result?.daily?.temperature_20h_32h?.[i]?.min,
                                        // visibilityMax: body?.result?.daily?.visibility?.[i]?.max * 1000, // Not given
                                        // visibilityMin: body?.result?.daily?.visibility?.[i]?.min * 1000, // Not given
                                        windDirection: body?.result?.daily?.wind_20h_32h?.[i]?.avg?.direction,
                                        // windGustSpeedMax: 0, // Not given
                                        windSpeed: body?.result?.daily?.wind_20h_32h?.[i]?.avg?.speed,
                                        windSpeedMax: body?.result?.daily?.wind_20h_32h?.[i]?.max?.speed,
                                    },
                                });
                            }
                            break;
                        }
                        case "error":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.daily?.status, reason: body?.result?.daily }));
                    }
                    break;
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`Daily: ${error}`);
        } finally {
            //Console.debug(`Daily: ${JSON.stringify(Daily, null, 2)}`);
            Console.info("✅ Daily");
        }
        return forecastDaily;
    }

    #Metadata(reportedTime, location = [this.latitude, this.longitude], temporarilyUnavailable = false) {
        const timeStamp = Math.trunc(Date.now() / 1000);
        const [latitude, longitude] = location;
        return {
            longitude,
            providerName: "彩云天气",
            reportedTime: reportedTime ?? timeStamp,
            latitude,
            expireTime: timeStamp + 60 * 60,
            attributionUrl: "https://www.caiyunapp.com/h5",
            providerLogo: providerNameToLogo("彩云天气", this.version),
            temporarilyUnavailable,
            readTime: timeStamp,
            sourceType: "MODELED",
        };
    }

    /**
     * 创建 WeatherKit 格式的污染物对象
     * @link https://docs.caiyunapp.com/weather-api/v2/v2.6/1-realtime.html
     * @param {Object} pollutantsObj - 污染物对象
     * @param {String} [scale] - AQI 标准（如 HJ6332012）
     * @returns {Object} 修复后的污染物对象
     */
    #CreatePollutants(pollutantsObj = {}, scale = "") {
        Console.info("☑️ CreatePollutants");
        const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
        const pollutants = Object.entries(pollutantsObj)
            .map(([name, amount]) => {
                switch (name) {
                    case "co":
                        return {
                            amount: AirQuality.ConvertUnit(amount ?? -1, mgm3, ugm3),
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                            index: scale === "HJ6332012" ? pollutantsObj.co_iaqi_chn : undefined,
                        };
                    case "no":
                    case "no2":
                    case "so2":
                    case "o3":
                    case "nox":
                    case "pm25":
                    case "pm10":
                        return {
                            amount: amount ?? -1,
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                            index: scale === "HJ6332012" ? pollutantsObj[`${name}_iaqi_chn`] : undefined,
                        };
                    default:
                        return null;
                }
            })
            .filter(Boolean);

        Console.info("✅ CreatePollutants");
        return pollutants;
    }

    /**
     * 获取当前空气质量并转换为 WeatherKit 风格结构。
     *
     * 逻辑概览：
     * 1) 校验国家/地区是否支持空气质量；
     * 2) 拉取 realtime 数据并做可用性检查；
     * 3) 构建通用空气质量基础结构（metadata/pollutants）；
     * 4) 按 useUsa 选择 US 或 CN 口径生成 index、categoryIndex 与 primaryPollutant。
     *
     * @param {boolean} [useUsa=true]
     * 是否使用美国 AQI 口径。
     * - true: 使用 `EPA_NowCast`（usa）；
     * - false: 使用 `HJ6332012`（chn）。
     *
     * @param {boolean} [forcePrimaryPollutant=true]
     * 在 CN 口径下是否强制展示主污染物。
     * - true: 始终展示计算得到的主污染物；
     * - false: 当主污染物 index <= 50 时返回 `NOT_AVAILABLE`。
     *
     * @returns {Promise<{
     *   metadata: any,
     *   pollutants: Array<{amount: number, pollutantType: string, units: string}>,
     *   previousDayComparison: string,
     *   categoryIndex?: number,
     *   index?: number,
     *   isSignificant?: boolean,
     *   primaryPollutant?: string,
     *   scale?: string
     * }>}
     * 成功时返回完整空气质量对象；不可用时返回 temporarilyUnavailable 的降级对象。
     */
    async CurrentAirQuality(useUsa = true, forcePrimaryPollutant = true) {
        Console.info("☑️ CurrentAirQuality");
        // 统一失败兜底对象，任一关键步骤失败时直接返回。
        const failedAirQuality = {
            metadata: this.#Metadata(undefined, undefined, true),
            pollutants: [],
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
        };

        // 可用性判断：当前数据源不支持该国家/地区时直接返回兜底结果。
        if (!this.#Config.Availability.AirQuality.includes(this.country)) {
            Console.warn("CurrentAirQuality", `Unsupported country: ${this.country}`);
            return failedAirQuality;
        }

        // 拉取实时数据（内部已带缓存）。
        const realtime = await this.#RealTime();

        // realtime 主体缺失，视为不可用。
        if (!realtime.result) {
            Console.error("CurrentAirQuality", "无法获取realtime数据");
            return failedAirQuality;
        }

        // 彩云在不支持位置时 usa 描述为空字符串。
        if (realtime.result.realtime.air_quality.description.usa === "") {
            Console.error("CurrentAirQuality", `不支持的位置`);
            return failedAirQuality;
        }

        // 构建与算法无关的基础空气质量结构。
        const particularAirQuality = {
            metadata: this.#Metadata(realtime.result.realtime.air_quality.obs_time, realtime.location),
            pollutants: this.#CreatePollutants(realtime.result.realtime.air_quality, useUsa ? undefined : "HJ6332012"),
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
        };

        // US 口径：直接使用 usa AQI，并按 EPA_NowCast 分类。
        if (useUsa) {
            const scale = AirQuality.Config.Scales.EPA_NowCast;
            const index = realtime.result.realtime.air_quality.aqi.usa;
            const categoryIndex = AirQuality.CategoryIndex(index, scale.categories);

            const airQuality = {
                ...particularAirQuality,
                categoryIndex,
                index,
                isSignificant: categoryIndex >= scale.categories.significantIndex,
                primaryPollutant: "NOT_AVAILABLE",
                scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
            };
            Console.info("✅ CurrentAirQuality");
            return airQuality;
        } else {
            // CN 口径：使用 chn AQI，并基于分污染物 IAQI 判定主污染物。
            const scale = AirQuality.Config.Scales.HJ6332012;
            const index = realtime.result.realtime.air_quality.aqi.chn;
            const categoryIndex = AirQuality.CategoryIndex(index, scale.categories);

            const primaryPollutant = AirQuality.PrimaryPollutant(particularAirQuality.pollutants, scale.categories);
            // 当不强制展示主污染物且整体空气质量较好（<=50）时，主污染物置为不可用。
            const isNotAvailable = !forcePrimaryPollutant && primaryPollutant.index <= 50;
            if (isNotAvailable) {
                Console.info("CurrentAirQuality", `Max index of pollutants ${primaryPollutant.pollutantType} = ${primaryPollutant.index} is <= 50, primaryPollutant will be set to NOT_AVAILABLE.`);
            }

            const airQuality = {
                ...particularAirQuality,
                categoryIndex,
                index,
                isSignificant: categoryIndex >= scale.categories.significantIndex,
                primaryPollutant: isNotAvailable ? "NOT_AVAILABLE" : primaryPollutant.pollutantType,
                scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
            };
            Console.info("✅ CurrentAirQuality");
            return airQuality;
        }
    }

    async CurrentWeather() {
        Console.info("☑️ CurrentWeather");
        const realtime = await this.#RealTime();
        if (!realtime.result) {
            Console.error("CurrentWeather", "无法获取realtime数");
            return {
                metadata: this.#Metadata(undefined, undefined, true),
            };
        }

        Console.info("✅ CurrentWeather");
        return {
            metadata: this.#Metadata(realtime.result.server_time, realtime.location),
            cloudCover: Math.round(realtime.result.realtime.cloudrate * 100),
            ...Weather.ConvertWeatherCodeField(realtime.result.realtime.skycon),
            humidity: Math.round(realtime.result.realtime.humidity * 100),
            // uvIndex: Weather.ConvertDSWRF(body?.result?.realtime?.dswrf), // ConvertDSWRF 转换不准确
            perceivedPrecipitationIntensity: realtime.result.realtime.precipitation.local.intensity,
            pressure: realtime.result.realtime.pressure / 100,
            temperature: realtime.result.realtime.temperature,
            temperatureApparent: realtime.result.realtime.apparent_temperature,
            visibility: realtime.result.realtime.visibility * 1000,
            windDirection: realtime.result.realtime.wind.direction,
            windSpeed: realtime.result.realtime.wind.speed,
        };
    }

    async YesterdayAirQuality(useUsa = true) {
        Console.info("☑️ YesterdayAirQuality");

        const yesterdayHourly = await this.#Hourly(1, Math.trunc((Date.now() - 864e5) / 1000));
        const scale = useUsa ? AirQuality.Config.Scales.EPA_NowCast : AirQuality.Config.Scales.HJ6332012;
        const particularAirQuality = {
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
            pollutants: [],
            primaryPollutant: "NOT_AVAILABLE",
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };

        if (!yesterdayHourly.result) {
            Console.error("YesterdayAirQuality", "无法获取hourly数据");
            return {
                ...particularAirQuality,
                categoryIndex: -1,
                metadata: this.#Metadata(undefined, undefined, true),
            };
        }

        const { usa, chn } = yesterdayHourly.result.hourly.air_quality.aqi[0].value;
        if (usa === 0 && chn === 0) {
            Console.warn("YesterdayAirQuality", "usa和chn的AQI值都为0，不支持的位置？");
        }

        const index = useUsa ? usa : chn;
        const categoryIndex = AirQuality.CategoryIndex(index, scale.categories);
        const isSignificant = categoryIndex >= scale.categories.significantIndex;
        Console.debug(`index: ${index}`);

        Console.info("✅ YesterdayAirQuality", `categoryIndex: ${categoryIndex}`);
        return {
            ...particularAirQuality,
            index,
            categoryIndex,
            isSignificant,
            metadata: this.#Metadata(yesterdayHourly.result.server_time, yesterdayHourly.location),
        };
    }

    async ForecastHourly(hourlysteps, begin) {
        Console.info("☑️ ForecastHourly");
        const hourly = await this.#Hourly(hourlysteps, begin);
        if (!hourly.result) {
            Console.error("ForecastHourly", "Failed to get hourly data");
            return {
                metadata: this.#Metadata(undefined, undefined, true),
            };
        }

        Console.info("✅ ForecastHourly");
        return {
            metadata: this.#Metadata(hourly.result.server_time, hourly.location),
            hours: Array.from({ length: hourly.result.hourly.skycon.length }, (_, i) => ({
                cloudCover: hourly.result.hourly.cloudrate[i].value,
                // cloudCoverHighAltPct: 0, // Not given
                // cloudCoverLowAltPct: 0, // Not given
                // cloudCoverMidAltPct: 0, // Not given
                ...Weather.ConvertWeatherCodeField(hourly.result.hourly.skycon[i].value),
                // daylight: false, // Not given
                forecastStart: (new Date(hourly.result.hourly.skycon[i].datetime).getTime() / 1000) | 0,
                humidity: Math.round(hourly.result.hourly.humidity[i].value * 100),
                // perceivedPrecipitationIntensity: "", // Not given
                precipitationAmount: hourly.result.hourly.precipitation[i].value,
                precipitationChance: hourly.result.hourly.precipitation[i].probability,
                // precipitationIntensity: 0, // Not given
                // precipitationType: "", // Not given
                pressure: hourly.result.hourly.pressure[i].value / 100,
                // pressureTrend: "", // Not given
                // snowfallAmount: 0, // Not given
                // snowfallIntensity: 0, // Not given
                temperature: hourly.result.hourly.temperature[i].value,
                temperatureApparent: hourly.result.hourly.apparent_temperature[i].value,
                // temperatureDewPoint: 0, // Not given
                // uvIndex: 0, // Not given
                visibility: hourly.result.hourly.visibility[i].value * 1000,
                windDirection: hourly.result.hourly.wind[i].direction,
                // windGust: 0, // Not given
                windSpeed: hourly.result.hourly.wind[i].speed,
            })),
        };
    }

    #CreateWeatherAlerts(body) {
        Console.info("☑️ CreateWeatherAlerts");
        const convertedAlerts = (Array.isArray(body?.content) ? body.content : [])
            .map(alert => {
                const issuedTime = this.#DateISOString(alert?.pubtimestamp);
                if (!issuedTime) return undefined;
                const code = String(alert?.code ?? "").trim();
                const eventName = this.#Config.WeatherAlert.Events[code.slice(0, 2)] ?? "";
                const source = String(alert?.source ?? "").trim();
                return {
                    ...(alert?.adcode ? { areaId: String(alert.adcode).trim() } : {}),
                    ...(alert?.location ? { areaName: String(alert.location).trim() } : {}),
                    certainty: "unknown",
                    description: String(alert?.title ?? "").trim(),
                    effectiveTime: issuedTime,
                    eventOnsetTime: issuedTime,
                    guidelines: [],
                    identifier: alert?.alertId,
                    issuedTime,
                    ...(eventName ? { eventName } : {}),
                    message: String(alert?.description ?? alert?.title ?? "").trim(),
                    phenomenon: eventName || "Other",
                    reportedAt: issuedTime,
                    severity: this.#Config.WeatherAlert.Severities[code.slice(2, 4)] || "unknown",
                    ...(source ? { source } : {}),
                    standard: "",
                    ...(code ? { token: code } : {}),
                    urgency: "unknown",
                };
            })
            .filter(Boolean);
        Console.info("✅ CreateWeatherAlerts");
        return {
            alerts: convertedAlerts,
            areaName: convertedAlerts.find(alert => alert?.areaName)?.areaName ?? "",
            source: convertedAlerts.find(alert => alert?.source)?.source || "彩云天气",
        };
    }

    #CreateWeatherAlertsV3CAP(body) {
        Console.info("☑️ CreateWeatherAlertsV3CAP");
        const convertedAlerts = (Array.isArray(body?.alerts) ? body.alerts : [])
            .map(alert => {
                const issuedTime = this.#DateISOString(alert?.sent_time);
                if (!issuedTime) return undefined;
                const effectiveTime = this.#DateISOString(alert?.effective_time) || issuedTime;
                const expireTime = this.#DateISOString(alert?.expires_time);
                const eventOnsetTime = this.#DateISOString(alert?.onset_time) || effectiveTime;
                const area = Array.isArray(alert?.areas) ? alert.areas.find(item => item) : undefined;
                const geocode = Array.isArray(area?.geocodes) ? area.geocodes.find(item => item?.value) : undefined;
                const source = String(alert?.sender_name ?? "").trim() || this.#Config.WeatherAlert.Sources[Number(alert?.source)] || "";
                const eventName = String(alert?.event_name ?? "").trim();
                return {
                    ...(geocode?.value ? { areaId: String(geocode.value).trim() } : {}),
                    ...(area?.area_desc ? { areaName: String(area.area_desc).trim() } : {}),
                    certainty: this.#Config.WeatherAlert.Certainties[Number(alert?.certainty)] || "unknown",
                    description: String(alert?.headline ?? "").trim(),
                    effectiveTime,
                    eventOnsetTime,
                    ...(expireTime ? { eventEndTime: expireTime, expireTime } : {}),
                    guidelines: this.#SplitWeatherAlertGuidelines(alert?.instruction),
                    identifier: alert?.id,
                    issuedTime,
                    ...(eventName ? { eventName } : {}),
                    message: String(alert?.description ?? alert?.headline ?? "").trim(),
                    phenomenon: (Array.isArray(alert?.categories) ? alert.categories : []).map(category => this.#Config.WeatherAlert.Categories[Number(category)]).find(Boolean) || eventName || "Other",
                    reportedAt: issuedTime,
                    severity: this.#Config.WeatherAlert.Severities[Number(alert?.severity)] || "unknown",
                    ...(source ? { source } : {}),
                    standard: "",
                    urgency: this.#Config.WeatherAlert.Urgencies[Number(alert?.urgency)] || "unknown",
                };
            })
            .filter(Boolean);
        Console.info("✅ CreateWeatherAlertsV3CAP");
        return {
            alerts: convertedAlerts,
            areaName: convertedAlerts.find(alert => alert?.areaName)?.areaName ?? "",
            source: convertedAlerts.find(alert => alert?.source)?.source || "彩云天气",
        };
    }

    #DateISOString(value) {
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds <= 0) return "";
        return new Date(seconds * 1000).toISOString();
    }

    #SplitWeatherAlertGuidelines(instruction) {
        return String(instruction ?? "")
            .split(/\r?\n/)
            .map(line => line.replace(/^\s*\d+[.、]\s*/, "").trim())
            .filter(Boolean);
    }
}
