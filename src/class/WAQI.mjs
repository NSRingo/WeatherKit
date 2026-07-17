import { Console, fetch } from "@nsnanocat/util";
import AirQuality from "../class/AirQuality.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class WAQI {
    constructor(parameters, token) {
        this.Name = "WAQI";
        this.Version = "1.4.3";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.headers = { Accept: "application/json" };
        this.token = token;
        this.version = parameters.version;
        this.language = parameters.language;
        this.latitude = parameters.latitude;
        this.longitude = parameters.longitude;
        this.country = parameters.country;
    }

    #Configs = {
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
    };

    #NormalizeAirQuality(index, primaryPollutant = "NOT_AVAILABLE") {
        const scale = AirQuality.Config.Scales.WAQI_InstantCast_US;
        const numericIndex = Number.parseInt(index, 10);
        const categoryIndex = AirQuality.CategoryIndex(numericIndex, scale.categories);
        return {
            categoryIndex,
            index: numericIndex,
            isSignificant: categoryIndex >= scale.categories.significantIndex,
            primaryPollutant,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };
    }

    async Nearest(mapqVersion = "mapq") {
        Console.info("☑️ Nearest", `mapqVersion: ${mapqVersion}`);
        const request = {
            url: `https://api.waqi.info/${mapqVersion}/nearest?n=1&geo=1/${this.latitude}/${this.longitude}`,
            //"url": `https://mapq.waqi.info/${mapqVersion}/nearest/station/${stationId}?n=1`,
            headers: this.headers,
        };
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (mapqVersion) {
                case "mapq":
                    switch (body?.status) {
                        default:
                        case undefined: {
                            const timeStamp = (Date.now() / 1000) | 0;
                            airQuality = {
                                metadata: {
                                    attributionUrl: request.url,
                                    expireTime: timeStamp + 60 * 60,
                                    language: `${this.language}-${this.country}`,
                                    latitude: body?.d?.[0]?.geo?.[0],
                                    longitude: body?.d?.[0]?.geo?.[1],
                                    providerLogo: providerNameToLogo("WAQI", this.version),
                                    providerName: `World Air Quality Index Project\n监测站：${body?.d?.[0]?.nna}`,
                                    readTime: timeStamp,
                                    reportedTime: body?.d?.[0]?.t,
                                    temporarilyUnavailable: false,
                                    sourceType: "STATION",
                                    stationId: Number.parseInt(body?.d?.[0]?.x, 10),
                                    stationKey: body?.d?.[0]?.k,
                                },
                                ...this.#NormalizeAirQuality(body?.d?.[0]?.v, this.#Configs.Pollutants[body?.d?.[0]?.pol] || "NOT_AVAILABLE"),
                                //"previousDayComparison": "UNKNOWN",
                            };
                            break;
                        }
                        case "error":
                            throw JSON.stringify({ status: body?.status, reason: body?.message });
                    }
                    break;
                case "mapq2":
                    switch (body?.status) {
                        case "ok": {
                            const timeStamp = (Date.now() / 1000) | 0;
                            airQuality = {
                                metadata: {
                                    attributionUrl: request.url,
                                    language: `${this.language}-${this.country}`,
                                    latitude: body?.data?.stations?.[0]?.geo?.[0],
                                    longitude: body?.data?.stations?.[0]?.geo?.[1],
                                    expireTime: timeStamp + 60 * 60,
                                    providerLogo: providerNameToLogo("WAQI", this.version),
                                    providerName: `World Air Quality Index Project\n监测站：${body?.data?.stations?.[0]?.name}`,
                                    readTime: timeStamp,
                                    reportedTime: (new Date(body?.data?.stations?.[0]?.utime).getTime() / 1000) | 0,
                                    temporarilyUnavailable: false,
                                    sourceType: "STATION",
                                    stationId: Number.parseInt(body?.data?.stations?.[0]?.idx, 10),
                                },
                                ...this.#NormalizeAirQuality(body?.data?.stations?.[0]?.aqi),
                                //"previousDayComparison": "UNKNOWN",
                            };
                            break;
                        }
                        case "error":
                        case undefined:
                            throw JSON.stringify({ status: body?.status, reason: body?.reason });
                    }
                    break;
                default:
                    break;
            }
        } catch (error) {
            Console.error(`Nearest: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ Nearest");
        }
        return airQuality;
    }

    async Token(stationId = Number()) {
        Console.info("☑️ Token", `stationId: ${stationId}`);
        const request = {
            url: `https://api.waqi.info/api/token/${stationId}`,
            headers: this.headers,
        };
        let token;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "error":
                    throw JSON.stringify({ status: body?.status, reason: body?.data });
                default:
                    switch (body?.rxs?.status) {
                        case "ok":
                            switch (body?.rxs?.obs?.[0]?.status) {
                                case "ok":
                                    token = body?.rxs?.obs?.[0]?.msg?.token;
                                    //uid = body?.rxs?.obs?.[0]?.uid;
                                    break;
                                case "error":
                                    throw JSON.stringify({ status: body?.rxs?.obs?.[0]?.status, reason: body?.rxs?.obs?.[0]?.msg });
                            }
                            break;
                        case "error":
                        case undefined:
                            throw JSON.stringify({ status: body?.rxs?.status, reason: body?.rxs });
                    }
                    break;
            }
        } catch (error) {
            Console.error(`Token: ${error}`);
        } finally {
            //Console.debug(`token: ${token}`);
            Console.info("✅ Token");
        }
        return token;
    }

    async AQI(stationId = Number(), token = this.token) {
        Console.info("☑️ AQI", `stationId: ${stationId}`, `token: ${token}`);
        const request = {
            url: `https://api.waqi.info/api/feed/@${stationId}/aqi.json`,
            headers: this.headers,
            body: `token=${token}&id=${stationId}`,
        };
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "error":
                    throw JSON.stringify({ status: body?.status, reason: body?.data });
                default:
                case undefined:
                    switch (body?.rxs?.status) {
                        case "ok":
                            switch (body?.rxs?.obs?.[0]?.status) {
                                case "ok": {
                                    const timeStamp = (Date.now() / 1000) | 0;
                                    airQuality = {
                                        metadata: {
                                            attributionUrl: body?.rxs?.obs?.[0]?.msg?.city?.url,
                                            expireTime: timeStamp + 60 * 60,
                                            language: `${this.language}-${this.country}`,
                                            latitude: body?.rxs?.obs?.[0]?.msg?.city?.geo?.[0],
                                            longitude: body?.rxs?.obs?.[0]?.msg?.city?.geo?.[1],
                                            providerLogo: providerNameToLogo("WAQI", this.version),
                                            providerName: `World Air Quality Index Project\n监测站：${body?.rxs?.obs?.[0]?.msg?.city?.name}`,
                                            readTime: timeStamp,
                                            reportedTime: body?.rxs?.obs?.[0]?.msg?.time?.v,
                                            temporarilyUnavailable: false,
                                            sourceType: "STATION",
                                            stationId: stationId,
                                        },
                                        ...this.#NormalizeAirQuality(body?.rxs?.obs?.[0]?.msg?.aqi, this.#Configs.Pollutants[body?.rxs?.obs?.[0]?.msg?.dominentpol] || "NOT_AVAILABLE"),
                                        //"previousDayComparison": "UNKNOWN",
                                    };
                                    break;
                                }
                                case "error":
                                case undefined:
                                    throw JSON.stringify({ status: body?.rxs?.[0]?.status, reason: body?.rxs?.obs?.[0]?.msg });
                            }
                            break;
                        case "error":
                        case undefined:
                            throw JSON.stringify({ status: body?.rxs?.status, reason: body?.rxs });
                    }
                    break;
            }
        } catch (error) {
            Console.error(`AQI: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AQI");
        }
        return airQuality;
    }

    async AQI2(stationId = Number(), token = this.token) {
        Console.info("☑️ AQI2", `stationId: ${stationId}`);
        const request = {
            url: `https://api2.waqi.info/feed/geo:${this.latitude};${this.longitude}/?token=${token}`,
            headers: this.headers,
        };
        if (stationId) request.url = `https://api2.waqi.info/feed/@${stationId}/?token=${token}`;
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    airQuality = {
                        metadata: {
                            attributionUrl: body?.data?.city?.url,
                            expireTime: timeStamp + 60 * 60,
                            language: `${this.language}-${this.country}`,
                            latitude: body?.data?.city?.geo?.[0],
                            longitude: body?.data?.city?.geo?.[1],
                            providerLogo: providerNameToLogo("WAQI", this.version),
                            providerName: `World Air Quality Index Project\n监测站：${body?.data?.city?.name}`,
                            readTime: timeStamp,
                            reportedTime: body?.data?.time?.v,
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                            stationId: stationId || Number.parseInt(body?.data?.idx, 10),
                        },
                        ...this.#NormalizeAirQuality(body?.data?.aqi, this.#Configs.Pollutants[body?.data?.dominentpol] || "NOT_AVAILABLE"),
                        //"previousDayComparison": "UNKNOWN",
                    };
                    break;
                }
                case "error":
                case undefined:
                    throw JSON.stringify({ status: body?.status, reason: body?.data });
            }
        } catch (error) {
            Console.error(`AQI2: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AQI2");
        }
        return airQuality;
    }
}
