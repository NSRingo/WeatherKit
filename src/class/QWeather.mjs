import { Console, fetch, Lodash as _, time } from "@nsnanocat/util";
import AirQuality from "../class/AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class QWeather {
	constructor(options) {
		this.Name = "QWeather";
		this.Version = "4.3.0";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
		this.url = new URL($request.url);
		this.host = "devapi.qweather.com";
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
			pm2p5: "PM2_5",
			pm10: "PM10",
			other: "NOT_AVAILABLE",
			na: "NOT_AVAILABLE",
			undefined: "NOT_AVAILABLE",
			null: "NOT_AVAILABLE",
		},
		Units: {
			"μg/m3": "MICROGRAMS_PER_CUBIC_METER",
			"ug/m3": "MILLIGRAMS_PER_CUBIC_METER",
			ppb: "PARTS_PER_BILLION",
			ppm: "PARTS_PER_MILLION",
		},
	};

	async GeoAPI(token = this.token, path = "city/lookup") {
		Console.log("☑️ GeoAPI");
		const request = {
			url: `https://geoapi.qweather.com/v2/${path}?location=${this.longitude},${this.latitude}&key=${token}`,
			header: this.header,
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
			Console.error(error);
		} finally {
			Console.debug(`metadata: ${JSON.stringify(metadata, null, 2)}`);
			Console.log("✅ GeoAPI");
		}
		return metadata;
	}

	async WeatherNow(token = this.token) {
		Console.log("☑️ Now");
		const request = {
			url: `https://${this.host}/v7/weather/now?location=${this.longitude},${this.latitude}&key=${token}`,
			header: this.header,
		};
		let currentWeather;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.code) {
				case "200":
					currentWeather = {
						metadata: {
							attributionUrl: body?.fxLink,
							expireTime: timeStamp + 60 * 60,
							language: `${this.language}-${this.country}`,
							latitude: this.latitude,
							longitude: this.longitude,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							readTime: timeStamp,
							reportedTime: Math.round(new Date(body?.now?.pubTime).valueOf() / 1000),
							temporarilyUnavailable: false,
							sourceType: "STATION",
						},
						cloudCover: body?.now?.cloud,
						conditionCode: this.#ConvertWeatherCode(body?.now?.text),
						humidity: body?.now?.humidity,
						perceivedPrecipitationIntensity: body?.now?.precip,
						pressure: body?.now?.pressure,
						temperature: body?.now?.temp,
						temperatureApparent: body?.now?.feelsLike,
						temperatureDewPoint: body?.now.dew,
						visibility: body?.now?.vis * 1000,
						windDirection: body?.now?.wind360,
						windSpeed: body?.now?.windSpeed,
					};
					break;
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
			Console.error(error);
		} finally {
			//Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
			Console.log("✅ WeatherNow");
		}
		return currentWeather;
	}

	async AirNow(token = this.token) {
		Console.log("☑️ AirNow");
		const request = {
			url: `https://${this.host}/v7/air/now?location=${this.longitude},${this.latitude}&key=${token}`,
			header: this.header,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.code) {
				case "200":
					airQuality = {
						metadata: {
							attributionUrl: body?.fxLink,
							expireTime: timeStamp + 60 * 60,
							language: `${this.language}-${this.country}`,
							latitude: this.latitude,
							longitude: this.longitude,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							readTime: timeStamp,
							reportedTime: Math.round(new Date(body?.now?.pubTime).valueOf() / 1000),
							temporarilyUnavailable: false,
							sourceType: "STATION",
						},
						categoryIndex: Number.parseInt(body?.now?.level, 10),
						index: Number.parseInt(body?.now?.aqi, 10),
						isSignificant: true,
						pollutants: this.#CreatePollutants(body?.now),
						previousDayComparison: "UNKNOWN",
						primaryPollutant: this.#Config.Pollutants[body?.now?.primary] || "NOT_AVAILABLE",
						scale: "HJ6332012",
					};
					if (body?.refer?.sources?.[0]) airQuality.metadata.providerName += `\n数据源: ${body?.refer?.sources?.[0]}`;
					break;
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ AirNow");
		}
		return airQuality;
	}

	async AirQualityCurrent(token = this.token) {
		Console.log("☑️ AirQualityCurrent");
		const request = {
			url: `https://${this.host}/airquality/v1/current/${this.latitude}/${this.longitude}?key=${token}`,
			header: this.header,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.error) {
				case undefined:
					airQuality = {
						metadata: {
							attributionUrl: request.url,
							expireTime: timeStamp + 60 * 60,
							language: `${this.language}-${this.country}`,
							latitude: this.latitude,
							longitude: this.longitude,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							readTime: timeStamp,
							reportedTime: timeStamp,
							temporarilyUnavailable: false,
							sourceType: "STATION",
							stationID: body?.stations?.[0]?.id,
						},
						categoryIndex: Number.parseInt(body?.indexes?.[0]?.level, 10),
						index: body?.indexes?.[0]?.aqi,
						isSignificant: true,
						pollutants: body?.pollutants?.map(pollutant => {
							pollutant.pollutantType = this.#Config.Pollutants[pollutant?.code];
							pollutant.amount = pollutant?.concentration?.value;
							pollutant.units = this.#Config.Units[pollutant?.concentration?.unit];
							return pollutant;
						}),
						previousDayComparison: "UNKNOWN",
						primaryPollutant: this.#Config.Pollutants[body?.indexes?.[0]?.primaryPollutant?.code] || "NOT_AVAILABLE",
						scale: "HJ6332012",
					};
					if (body?.stations?.[0]?.name) airQuality.metadata.providerName += `\n数据源: ${body?.stations?.[0]?.name}检测站`;
					break;
				default:
					throw Error(JSON.stringify(body?.error, null, 2));
			}
		} catch (error) {
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ AirQualityCurrent");
		}
		return airQuality;
	}

	async Minutely(token = this.token) {
		Console.log("☑️ Minutely", `host: ${this.host}`);
		const request = {
			url: `https://${this.host}/v7/minutely/5m?location=${this.longitude},${this.latitude}&key=${token}`,
			header: this.header,
		};
		let forecastNextHour;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Math.round(Date.now() / 1000);
			switch (body?.code) {
				case "200":
					let minuteStemp = new Date(body?.updateTime).setSeconds(0, 0);
					minuteStemp = minuteStemp.valueOf() / 1000;
					forecastNextHour = {
						metadata: {
							attributionUrl: body?.fxLink,
							expireTime: timeStamp + 60 * 60,
							language: `${this.language}-${this.country}`, // body?.lang,
							latitude: this.latitude,
							longitude: this.longitude,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							readTime: timeStamp,
							reportedTime: minuteStemp,
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
					forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.minutes);
					break;
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
			Console.error(error);
		} finally {
			//Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
			Console.log("✅ Minutely");
		}
		return forecastNextHour;
	}

	async Hourly(token = this.token, hours = 24) {
		Console.log("☑️ Daily", `host: ${this.host}`);
		const request = {
			url: `https://${this.host}/v7/weather/${hours.toString()}h?location=${this.longitude},${this.latitude}&key=${token}`,
			header: this.header,
		};
		let forecastHourly;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const timeStamp = Number.parseInt(Date.parse(body?.daily?.[0]?.fxTime) / 1000, 10);
			switch (body?.code) {
				case "200":
					forecastHourly = {
						metadata: {
							attributionUrl: body?.fxLink,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							sourceType: "STATION",
						},
						hours: Array.from({ length: hours }, (_, i) => {
							return {
								cloudCover: body?.hourly?.[i]?.cloud,
								// cloudCoverHighAltPct: 0, // Not given
								// cloudCoverLowAltPct: 0, // Not given
								// cloudCoverMidAltPct: 0, // Not given
								conditionCode: this.#ConvertWeatherCode(body?.hourly?.[i]?.text),
								// daylight: false, // Not given
								forecastStart: timeStamp + i * 3600,
								humidity: body?.hourly?.[i]?.humidity,
								// perceivedPrecipitationIntensity: "", // Not given
								precipitationAmount: body?.hourly?.[i]?.precip,
								precipitationChance: body?.hourly?.[i]?.pop,
								precipitationIntensity: body?.hourly?.[i]?.precip,
								// precipitationType: "", // Not given
								pressure: body?.hourly?.[i]?.pressure,
								// pressureTrend: "", // Not given
								// snowfallAmount: 0, // Not given
								// snowfallIntensity: 0, // Not given
								temperature: body?.hourly?.[i]?.temp,
								// temperatureApparent: 0, // Not given
								temperatureDewPoint: body?.hourly?.[i]?.dew,
								// uvIndex: 0, // Not given
								// visibility: 0, // Not given
								windDirection: body?.hourly?.[i]?.wind360,
								// windGust: 0, // Not given
								windSpeed: body?.hourly?.[i]?.windSpeed,
							};
						}),
					};
					break;
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(forecastHourly, null, 2)}`);
			Console.log("✅ Daily");
		}
		return forecastHourly;
	}

	async Daily(token = this.token, days = 10) {
		Console.log("☑️ Daily", `host: ${this.host}`);
		const request = {
			url: `https://${this.host}/v7/weather/${days.toString()}d?location=${this.longitude},${this.latitude}&key=${token}`,
			header: this.header,
		};
		let forecastDaily;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			switch (body?.code) {
				case "200":
					forecastDaily = {
						metadata: {
							attributionUrl: body?.fxLink,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							sourceType: "STATION",
						},
						days: Array.from({ length: days }, (_, i) => {
							const timeGap = 86400;
							const timeStamp = Number.parseInt(Date.parse(body?.daily?.[i]?.fxDate) / 1000, 10); // 0H

							const dayTimeGap = 43200;
							const dayTimeStamp = timeStamp + 7 * 3600; // 7H

							const nightTimeGap = 43200;
							const nightTimeStamp = timeStamp + 19 * 3600; // 19H

							return {
								forecastStart: timeStamp,
								forecastEnd: timeStamp + timeGap,
								conditionCode: this.#ConvertWeatherCode(body?.daily?.[i]?.textDay), // Not Accurate (用白天数据代替)
								// humidity 用一整天的数据代替
								// humidityMax: body?.daily?.[i]?.humidity, // Not Accurate
								// humidityMin: body?.daily?.[i]?.humidity, // Not Accurate
								maxUvIndex: body?.daily?.[i]?.uvIndex, // Not Accurate
								moonPhase: body?.daily?.[i]?.moonPhase,
								moonrise: body?.daily?.[i]?.moonrise,
								moonset: body?.daily?.[i]?.moonset,
								precipitationAmount: body?.daily?.[i]?.precip,
								// precipitationAmountByType: [], // Not given
								// precipitationChance: 0, // Not given
								// precipitationType: "", // Not given
								// snowfallAmount: 0, // Not given
								// solarMidnight: 0, // Not given
								// solarNoon: 0, // Not given
								sunrise: body?.daily?.[i]?.sunrise,
								// sunriseAstronomical: 0, // Not given
								// sunriseCivil: 0, // Not given
								// sunriseNautical: 0, // Not given
								sunset: body?.daily?.[i]?.sunset,
								// sunsetAstronomical: 0, // Not given
								// sunsetCivil: 0, // Not given
								// sunsetNautical: 0, // Not given
								temperatureMax: body?.daily?.[i]?.tempMax,
								// temperatureMaxTime: 0, // Not given
								temperatureMin: body?.daily?.[i]?.tempMin,
								// temperatureMinTime: 0, // Not given
								visibilityMax: body?.daily?.[i]?.vis, // Not Accurate
								visibilityMin: body?.daily?.[i]?.vis, // Not Accurate
								// windGustSpeedMax: 0, // Not given
								windSpeedAvg: (body?.daily?.[i]?.windSpeedDay + body?.daily?.[i]?.windSpeedNight) / 2, // Not Accurate (用白天+晚上数据代替)
								windSpeedMax: Math.max(body?.daily?.[i]?.windSpeedDay, body?.daily?.[i]?.windSpeedNight),
								daytimeForecast: {
									forecastStart: dayTimeStamp,
									forecastEnd: dayTimeStamp + dayTimeGap,
									cloudCover: body?.daily?.[i]?.cloud,
									// cloudCoverHighAltPct: 0, // Not given
									// cloudCoverLowAltPct: 0, // Not given
									// cloudCoverMidAltPct: 0, // Not given
									conditionCode: this.#ConvertWeatherCode(body?.daily?.[i]?.textDay),
									// humidity 用一整天的数据代替
									// humidityMax: body?.daily?.[i]?.humidity, // Not Accurate
									// humidityMin: body?.daily?.[i]?.humidity, // Not Accurate
									precipitationAmount: body?.daily?.[i]?.precip,
									// precipitationAmountByType: [], // Not given
									// precipitationChance: 0, // Not given
									// precipitationType: "", // Not given
									// snowfallAmount: 0, // Not given
									// temperatureMax: 0, // Not given
									// temperatureMin: 0, // Not given
									// visibility 用一整天的数据代替
									// visibilityMax: 0, // Not given
									// visibilityMin: 0, // Not given
									windDirection: body?.daily?.[i]?.wind360Day,
									// windGustSpeedMax: 0, // Not given
									windSpeed: body?.daily?.[i]?.windSpeedDay,
									windSpeedMax: (body?.daily?.[i]?.windScaleDay).splite("-")[1],
								},
								overnightForecast: {
									forecastStart: nightTimeStamp,
									forecastEnd: nightTimeStamp + nightTimeGap,
									cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
									// cloudCoverHighAltPct: 0, // Not given
									// cloudCoverLowAltPct: 0, // Not given
									// cloudCoverMidAltPct: 0, // Not given
									conditionCode: this.#ConvertWeatherCode(body?.daily?.[i]?.textNight),
									// humidity 用一整天的数据代替
									// humidityMax: body?.daily?.[i]?.humidity, // Not Accurate
									// humidityMin: body?.daily?.[i]?.humidity, // Not Accurate
									precipitationAmount: body?.daily?.[i]?.precip,
									// precipitationAmountByType: [], // Not given
									// precipitationChance: 0, // Not given
									// precipitationType: "", // Not given
									// snowfallAmount: 0, // Not given
									// temperatureMax: 0, // Not given
									// temperatureMin: 0, // Not given
									// visibility 用一整天的数据代替
									// visibilityMax: 0, // Not given
									// visibilityMin: 0, // Not given
									windDirection: body?.daily?.[i]?.wind360Night,
									// windGustSpeedMax: 0, // Not given
									windSpeed: body?.daily?.[i]?.windSpeedNight,
									windSpeedMax: (body?.daily?.[i]?.windScaleNight).splite("-")[1],
								},
							};
						}),
					};
					break;
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(forecastDaily, null, 2)}`);
			Console.log("✅ Daily");
		}
		return forecastDaily;
	}

	async HistoricalAir(token = this.token, locationID = new Number(), date = time("yyyyMMdd", Date.now() - 24 * 60 * 60 * 1000)) {
		Console.log("☑️ HistoricalAir", `locationID:${locationID}`, `date: ${date}`);
		const request = {
			url: `https://${this.host}/v7/historical/air/?location=${locationID}&date=${date}&key=${token}`,
			header: this.header,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			const Hour = new Date().getHours();
			switch (body?.code) {
				case "200":
					airQuality = {
						metadata: {
							attributionUrl: body?.fxLink,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							sourceType: "STATION",
						},
						categoryIndex: Number.parseInt(body?.airHourly?.[Hour]?.level, 10),
						index: Number.parseInt(body?.airHourly?.[Hour]?.aqi, 10),
						pollutants: this.#CreatePollutants(body?.airHourly?.[Hour]),
						primaryPollutant: this.#Config.Pollutants[body?.airHourly?.[Hour]?.primary] || "NOT_AVAILABLE",
						scale: "HJ6332012",
					};
					break;
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ HistoricalAir");
		}
		return airQuality;
	}

	#CreatePollutants(pollutantsObj = {}) {
		Console.log("☑️ CreatePollutants");
		const pollutants = [];
		for (const [key, value] of Object.entries(pollutantsObj)) {
			switch (key) {
				case "co":
				case "no":
				case "no2":
				case "so2":
				case "o3":
				case "nox":
				case "pm25":
				case "pm2p5":
				case "pm10":
					pollutants.push({
						amount: Number.parseFloat(value ?? -1),
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

	#ConvertWeatherCode(textDescription) {
		Console.debug(`textDescription: ${textDescription}`);
		switch (textDescription) {
			// 晴天
			case "晴":
				return "CLEAR";

			// 多云相关
			case "多云":
				return "PARTLY_CLOUDY";
			case "少云":
				return "MOSTLY_CLEAR";
			case "晴间多云":
				return "PARTLY_CLOUDY";
			case "阴":
				return "CLOUDY";

			// 雾霾相关
			case "薄雾":
			case "雾":
			case "浓雾":
			case "强浓雾":
			case "大雾":
			case "特强浓雾":
				return "FOGGY";
			case "霾":
			case "中度霾":
			case "重度霾":
			case "严重霾":
				return "HAZE";

			// 沙尘相关(暂用 HAZE 代替)
			case "扬沙":
			case "浮尘":
			case "沙尘暴":
			case "强沙尘暴":
				return "HAZE";

			// 降雨相关
			case "毛毛雨/细雨":
				return "DRIZZLE";
			case "小雨":
				return "DRIZZLE";
			case "中雨":
			case "小到中雨":
				return "RAIN";
			case "大雨":
			case "中到大雨":
				return "HEAVY_RAIN";
			case "暴雨":
			case "大暴雨":
			case "特大暴雨":
			case "大到暴雨":
			case "暴雨到大暴雨":
			case "大暴雨到特大暴雨":
			case "极端降雨":
				return "HEAVY_RAIN";
			case "阵雨":
				return "RAIN";
			case "强阵雨":
				return "HEAVY_RAIN";
			case "雨":
				return "RAIN";

			// 雷雨相关
			case "雷阵雨":
			case "强雷阵雨":
				return "THUNDERSTORMS";
			case "雷阵雨伴有冰雹":
				return "THUNDERSTORMS";

			// 降雪相关
			case "小雪":
				return "FLURRIES";
			case "中雪":
			case "小到中雪":
				return "SNOW";
			case "大雪":
			case "中到大雪":
				return "HEAVY_SNOW";
			case "暴雪":
			case "大到暴雪":
				return "BLIZZARD";
			case "阵雪":
			case "雪":
				return "SNOW";

			// 雨雪混合
			case "雨夹雪":
			case "雨雪天气":
			case "阵雨夹雪":
			case "冻雨":
				return "FREEZING_DRIZZLE";

			// 温度相关
			case "热":
			case "冷":

			// 未知
			case "未知":
			default:
				return null;
		}
	}
}
