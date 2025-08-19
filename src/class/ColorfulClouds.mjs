import { Console, fetch, Lodash as _ } from "@nsnanocat/util";
import AirQuality from "./AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class ColorfulClouds {
	constructor(options) {
		this.Name = "ColorfulClouds";
		this.Version = "3.1.0";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
		this.url = new URL($request.url);
		this.header = { "Content-Type": "application/json" };
		const Parameters = parseWeatherKitURL(this.url);
		Object.assign(this, Parameters, options);
	}

	#Config = {
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

	async RealTime(token = this.token) {
		Console.log("☑️ RealTime");
		const request = {
			url: `https://api.caiyunapp.com/v2.6/${token}/${this.longitude},${this.latitude}/realtime`,
			header: this.header,
		};
		let airQuality;
		let currentWeather;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.status) {
				case "ok":
					switch (body?.result?.realtime?.status) {
						case "ok":
							airQuality = {
								metadata: {
									attributionUrl: "https://www.caiyunapp.com/h5",
									expireTime: timeStamp + 60 * 60,
									language: `${this.language}-${this.country}`,
									latitude: body?.location?.[0],
									longitude: body?.location?.[1],
									providerLogo: providerNameToLogo("彩云天气", this.version),
									providerName: "彩云天气",
									readTime: timeStamp,
									reportedTime: body?.server_time,
									temporarilyUnavailable: false,
									sourceType: "STATION",
								},
								categoryIndex: AirQuality.CategoryIndex(body?.result?.realtime?.air_quality?.aqi.chn, "HJ_633"),
								index: Number.parseInt(body?.result?.realtime?.air_quality?.aqi.chn, 10),
								isSignificant: true,
								pollutants: this.#CreatePollutants(body?.result?.realtime?.air_quality),
								previousDayComparison: "UNKNOWN",
								primaryPollutant: "NOT_AVAILABLE",
								scale: "HJ6332012",
							};
							currentWeather = {
								metadata: {
									attributionUrl: "https://www.caiyunapp.com/h5",
									expireTime: timeStamp + 60 * 60,
									language: `${this.language}-${this.country}`,
									latitude: body?.location?.[0],
									longitude: body?.location?.[1],
									providerLogo: providerNameToLogo("彩云天气", this.version),
									providerName: "彩云天气",
									readTime: timeStamp,
									reportedTime: body?.server_time,
									temporarilyUnavailable: false,
									sourceType: "STATION",
								},
								cloudCover: Math.round(body?.result?.realtime?.cloudrate * 100),
								conditionCode: this.#ConvertWeatherCode(body?.result?.realtime?.skycon),
								humidity: Math.round(body?.result?.realtime?.humidity * 100),
								uvIndex: dswrfToUVIndex(body?.result?.realtime?.dswrf),
								perceivedPrecipitationIntensity: body?.result?.realtime?.precipitation?.local?.intensity,
								pressure: body?.result?.realtime?.pressure,
								temperature: body?.result?.realtime?.temperature,
								temperatureApparent: body?.result?.realtime?.apparent_temperature,
								visibility: body?.result?.realtime?.visibility * 1000,
								windDirection: body?.result?.realtime?.wind?.direction,
								windSpeed: body?.result?.realtime?.wind?.speed,
							};
							break;
						case "error":
						case undefined:
							throw Error(JSON.stringify({ status: body?.result?.realtime?.status, reason: body?.result?.realtime }));
					}
					break;
				case "error":
				case "failed":
				case undefined:
					throw Error(JSON.stringify(body ?? {}));
			}
		} catch (error) {
			this.logErr(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ RealTime");
		}
		return { airQuality, currentWeather };
	}

	async Minutely(token = this.token) {
		Console.log("☑️ Minutely");
		const request = {
			url: `https://api.caiyunapp.com/v2.6/${token}/${this.longitude},${this.latitude}/minutely?unit=metric:v2`,
			header: this.header,
		};
		let forecastNextHour;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.status) {
				case "ok":
					switch (body?.result?.minutely?.status) {
						case "ok":
							body.result.minutely.probability = body.result.minutely.probability.map(probability => Math.round(probability * 100));
							let minuteStemp = new Date(body?.server_time * 1000).setSeconds(0, 0);
							minuteStemp = minuteStemp.valueOf() / 1000 - 60;
							forecastNextHour = {
								metadata: {
									attributionUrl: "https://www.caiyunapp.com/h5",
									expireTime: timeStamp + 60 * 60,
									language: `${this.language}-${this.country}`, // body?.lang,
									latitude: body?.location?.[0],
									longitude: body?.location?.[1],
									providerLogo: providerNameToLogo("彩云天气", this.version),
									providerName: "彩云天气",
									readTime: timeStamp,
									reportedTime: body?.server_time,
									temporarilyUnavailable: false,
									sourceType: "MODELED",
								},
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
							forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.minutes);
							break;
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
			Console.error(error);
		} finally {
			//Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
			Console.log("✅ Minutely");
		}
		return forecastNextHour;
	}

	async Hourly(token = this.token, hourlysteps = 1, begin = Date.now()) {
		Console.log("☑️ Hourly");
		const request = {
			url: `https://api.caiyunapp.com/v2.6/${token}/${this.longitude},${this.latitude}/hourly?hourlysteps=${hourlysteps}&begin=${parseInt(begin / 1000, 10)}`,
			header: this.header,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.status) {
				case "ok":
					switch (body?.result?.hourly?.status) {
						case "ok":
							airQuality = {
								metadata: {
									attributionUrl: "https://www.caiyunapp.com/h5",
									expireTime: timeStamp + 60 * 60,
									language: `${this.language}-${this.country}`,
									latitude: body?.location?.[0],
									longitude: body?.location?.[1],
									providerLogo: providerNameToLogo("彩云天气", this.version),
									providerName: "彩云天气",
									readTime: timeStamp,
									reportedTime: body?.server_time,
									temporarilyUnavailable: false,
									sourceType: "STATION",
								},
								categoryIndex: AirQuality.CategoryIndex(body?.result?.hourly?.air_quality?.aqi?.[0]?.value?.chn, "HJ_633"),
								index: Number.parseInt(body?.result?.hourly?.air_quality?.aqi?.[0]?.value?.chn, 10),
								isSignificant: true,
								pollutants: [],
								previousDayComparison: "UNKNOWN",
								primaryPollutant: "NOT_AVAILABLE",
								scale: "HJ6332012",
							};
							break;
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
			this.logErr(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ Hourly");
		}
		return airQuality;
	}

	#CreatePollutants(pollutantsObj = {}) {
		Console.log("☑️ CreatePollutants");
		const pollutants = [];
		for (const [key, value] of Object.entries(pollutantsObj)) {
			switch (key) {
				case "co":
					pollutants.push({
						amount: value ?? -1,
						pollutantType: this.#Config.Pollutants[key],
						units: "MILLIGRAMS_PER_CUBIC_METER",
					});
					break;
				case "no":
				case "no2":
				case "so2":
				case "o3":
				case "nox":
				case "pm25":
				case "pm10":
					pollutants.push({
						amount: value ?? -1,
						pollutantType: this.#Config.Pollutants[key],
						units: "MICROGRAMS_PER_CUBIC_METER",
					});
					break;
			}
		}
		//Console.debug(`pollutants: ${JSON.stringify(pollutants, null, 2)}`);
		Console.log("✅ CreatePollutants");
		return pollutants;
	}

	#ConvertWeatherCode(skycon) {
		Console.debug(`skycon: ${skycon}`);
		switch (skycon) {
			case "CLEAR_DAY":
			case "CLEAR_NIGHT":
				return "CLEAR";

			case "PARTLY_CLOUDY_DAY":
				return "PARTLY_CLOUDY";
			case "PARTLY_CLOUDY_NIGHT":
				return "PARTLY_CLOUDY";

			case "CLOUDY":
				return "CLOUDY";

			case "LIGHT_HAZE":
			case "MODERATE_HAZE":
			case "HEAVY_HAZE":
				return "HAZE";

			case "LIGHT_RAIN":
				return "DRIZZLE";
			case "MODERATE_RAIN":
				return "RAIN";
			case "HEAVY_RAIN":
				return "HEAVY_RAIN";
			case "STORM_RAIN":
				return "THUNDERSTORMS";

			case "FOG":
				return "FOGGY";

			case "LIGHT_SNOW":
				return "FLURRIES";
			case "MODERATE_SNOW":
				return "SNOW";
			case "HEAVY_SNOW":
				return "HEAVY_SNOW";
			case "STORM_SNOW":
				return "HEAVY_SNOW";

			case "DUST":
			case "SAND":
				return "HAZE"; // Apple 没单独 DUST/SAND，用 HAZE 替代

			case "WIND":
				return "WINDY";

			default:
				return null;
		}
	}
}

/**
 * 将 DSWRF（W/m²）估算为 UV Index（整数）
 * @param {number} dswrf - 向下短波辐射通量
 * @param {number} k - UV 占比系数，可选，默认 0.04
 * @returns {number} UV Index（四舍五入为整数）
 */
function dswrfToUVIndex(dswrf, k = 0.04) {
    if (dswrf <= 0) return 0;
    const uvIndex = dswrf * k / 0.025; // 估算 UV Index
    // 限制结果在 0~11，并四舍五入为整数
    return Math.min(Math.max(Math.round(uvIndex), 0), 11);
}