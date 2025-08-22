import { Console, fetch, Lodash as _ } from "@nsnanocat/util";
import AirQuality from "./AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class ColorfulClouds {
	constructor(options) {
		this.Name = "ColorfulClouds";
		this.Version = "3.1.1";
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
		let forecastHourly;
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
							forecastHourly = {
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
								hours: Array.from({ length: hours }, (_, i) => {
									return {
										cloudCover: body?.result?.hourly?.cloudrate?.[i]?.value,
										// cloudCoverHighAltPct: 0, // Not given
										// cloudCoverLowAltPct: 0, // Not given
										// cloudCoverMidAltPct: 0, // Not given
										conditionCode: this.#ConvertWeatherCode(body?.result?.hourly?.skycon?.[i]?.value),
										// daylight: false, // Not given
										forecastStart: Math.round(Date.parse(body?.result?.hourly?.skycon?.[i]?.datetime) / 1000),
										humidity: body?.result?.hourly?.humidity?.[i]?.value,
										// perceivedPrecipitationIntensity: "", // Not given
										precipitationAmount: body?.result?.hourly?.precipitation?.[i]?.value,
										precipitationChance: body?.result?.hourly?.precipitation?.[i]?.probability,
										// precipitationIntensity: 0, // Not given
										// precipitationType: "", // Not given
										pressure: body?.result?.hourly?.pressure?.[i]?.value / 10,
										// pressureTrend: "", // Not given
										// snowfallAmount: 0, // Not given
										// snowfallIntensity: 0, // Not given
										temperature: body?.result?.hourly?.temperature?.[i]?.value,
										temperatureApparent: body?.result?.hourly?.apparent_temperature?.[i]?.value,
										// temperatureDewPoint: 0, // Not given
										// uvIndex: 0, // Not given
										visibility: body?.result?.hourly?.visibility?.[i]?.value,
										windDirection: body?.result?.hourly?.wind?.[i]?.direction,
										// windGust: 0, // Not given
										windSpeed: body?.result?.hourly?.wind?.[i]?.speed,
									};
								}),
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
		return { airQuality, forecastHourly };
	}

	async Daily(token = this.token, dailysteps = 10, begin = Date.now()) {
		Console.log("☑️ Daily");
		const request = {
			url: `https://api.caiyunapp.com/v2.6/${token}/${this.longitude},${this.latitude}/daily?dailysteps=${dailysteps}&begin=${parseInt(begin / 1000, 10)}`,
			header: this.header,
		};
		let forecastDaily;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.status) {
				case "ok":
					switch (body?.result?.daily?.status) {
						case "ok":
							forecastDaily = {
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
								days: Array.from({ length: dailysteps }, (_, i) => {
									const timeGap = 86400;
									const timeStamp = parseInt(Date.parse(body?.result?.daily?.skycon?.[i]?.date) / 1000, 10); // 0H

									const dayTimeGap = 43200;
									const dayTimeStamp = timeStamp + 7 * 3600; // 7H

									const nightTimeGap = 43200;
									const nightTimeStamp = timeStamp + 19 * 3600; // 19H

									return {
										forecastStart: timeStamp,
										forecastEnd: timeStamp + timeGap,
										conditionCode: this.#ConvertWeatherCode(body?.result?.daily?.skycon?.[i]?.value),
										humidityMax: body?.result?.daily?.humidity?.[i]?.max,
										humidityMin: body?.result?.daily?.humidity?.[i]?.min,
										maxUvIndex: dswrfToUVIndex(body?.result?.daily?.dswrf?.[i]?.max),
										// moonPhase: "", // Not given
										// moonrise: body?.result?.daily?.astro?.[i].sunset.time, // Not given
										// moonset: body?.result?.daily?.astro?.[i].sunrise.time, // Not given
										precipitationAmount: body?.result?.daily?.precipitation?.[i]?.avg,
										// precipitationAmountByType: [], // Not given
										precipitationChance: body?.result?.daily?.precipitation?.[i]?.probability,
										// precipitationType: "", // Not given
										// snowfallAmount: 0, // Not given
										// solarMidnight: 0, // Not given
										// solarNoon: 0, // Not given
										sunrise: body?.result?.daily?.astro?.[i].sunrise.time,
										// sunriseAstronomical: 0, // Not given
										// sunriseCivil: 0, // Not given
										// sunriseNautical: 0, // Not given
										sunset: body?.result?.daily?.astro?.[i].sunset.time,
										// sunsetAstronomical: 0, // Not given
										// sunsetCivil: 0, // Not given
										// sunsetNautical: 0, // Not given
										temperatureMax: body?.result?.daily?.temperature?.[i]?.max,
										// temperatureMaxTime: 0, // Not given
										temperatureMin: body?.result?.daily?.temperature?.[i]?.min,
										// temperatureMinTime: 0, // Not given
										visibilityMax: body?.result?.daily?.visibility?.[i]?.max,
										visibilityMin: body?.result?.daily?.visibility?.[i]?.min,
										// windGustSpeedMax: 0, // Not given
										windSpeedAvg: body?.result?.daily?.wind?.[i]?.avg?.speed,
										windSpeedMax: body?.result?.daily?.wind?.[i]?.max?.speed,
										daytimeForecast: {
											forecastStart: dayTimeStamp,
											forecastEnd: dayTimeStamp + dayTimeGap,
											cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
											// cloudCoverHighAltPct: 0, // Not given
											// cloudCoverLowAltPct: 0, // Not given
											// cloudCoverMidAltPct: 0, // Not given
											conditionCode: this.#ConvertWeatherCode(body?.result?.daily?.skycon_08h_20h?.[i]?.value),
											// humidity 用一整天的数据代替
											humidityMax: body?.result?.daily?.humidity?.[i]?.max,
											humidityMin: body?.result?.daily?.humidity?.[i]?.min,
											precipitationAmount: body?.result?.daily?.precipitation_08h_20h?.[i]?.avg,
											// precipitationAmountByType: [], // Not given
											precipitationChance: body?.result?.daily?.precipitation_08h_20h?.[i]?.probability,
											// precipitationType: "", // Not given
											// snowfallAmount: 0, // Not given
											temperatureMax: body?.result?.daily?.temperature_08h_20h?.[i]?.max,
											temperatureMin: body?.result?.daily?.temperature_08h_20h?.[i]?.min,
											// visibility 用一整天的数据代替
											visibilityMax: body?.result?.daily?.visibility?.[i]?.max,
											visibilityMin: body?.result?.daily?.visibility?.[i]?.min,
											windDirection: body?.result?.daily?.wind_08h_20h?.[i]?.avg?.direction,
											// windGustSpeedMax: 0, // Not given
											windSpeed: body?.result?.daily?.wind_08h_20h?.[i]?.avg?.speed,
											windSpeedMax: body?.result?.daily?.wind_08h_20h?.[i]?.max?.speed,
										},
										overnightForecast: {
											forecastStart: nightTimeStamp,
											forecastEnd: nightTimeStamp + nightTimeGap,
											cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
											// cloudCoverHighAltPct: 0, // Not given
											// cloudCoverLowAltPct: 0, // Not given
											// cloudCoverMidAltPct: 0, // Not given
											conditionCode: this.#ConvertWeatherCode(body?.result?.daily?.skycon_20h_32h?.[i]?.value),
											// humidity 用一整天的数据代替
											humidityMax: body?.result?.daily?.humidity?.[i]?.max,
											humidityMin: body?.result?.daily?.humidity?.[i]?.min,
											precipitationAmount: body?.result?.daily?.precipitation_20h_32h?.[i]?.avg,
											// precipitationAmountByType: [], // Not given
											precipitationChance: body?.result?.daily?.precipitation_20h_32h?.[i]?.probability,
											// precipitationType: "", // Not given
											// snowfallAmount: 0, // Not given
											temperatureMax: body?.result?.daily?.temperature_20h_32h?.[i]?.max,
											temperatureMin: body?.result?.daily?.temperature_20h_32h?.[i]?.min,
											// visibility 用一整天的数据代替
											visibilityMax: body?.result?.daily?.visibility?.[i]?.max,
											visibilityMin: body?.result?.daily?.visibility?.[i]?.min,
											windDirection: body?.result?.daily?.wind_20h_32h?.[i]?.avg?.direction,
											// windGustSpeedMax: 0, // Not given
											windSpeed: body?.result?.daily?.wind_20h_32h?.[i]?.avg?.speed,
											windSpeedMax: body?.result?.daily?.wind_20h_32h?.[i]?.max?.speed,
										},
									};
								}),
							};
							break;
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
			this.logErr(error);
		} finally {
			//Console.debug(`Daily: ${JSON.stringify(Daily, null, 2)}`);
			Console.log("✅ Daily");
		}
		return forecastDaily;
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
				return "BLIZZARD";

			// Apple 缺失 DUST/SAND 定义，用 HAZE 替代
			case "DUST":
			case "SAND":
				return "HAZE";

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
	const uvIndex = (dswrf * k) / 0.025; // 估算 UV Index
	// 限制结果在 0~11，并四舍五入为整数
	return Math.min(Math.max(Math.round(uvIndex), 0), 11);
}
