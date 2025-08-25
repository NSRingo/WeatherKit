import { Console, fetch, Lodash as _, time } from "@nsnanocat/util";
import Weather from "./Weather.mjs";
import AirQuality from "../class/AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class QWeather {
	constructor(parameters, token, host = "devapi.qweather.com") {
		this.Name = "QWeather";
		this.Version = "4.4.7";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
		this.endpoint = `https://${host}`;
		this.headers = { "X-QW-Api-Key": token };
		this.version = parameters.version;
		this.language = parameters.language;
		this.latitude = parameters.latitude;
		this.longitude = parameters.longitude;
		this.country = parameters.country;
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

	async GeoAPI(path = "city/lookup") {
		Console.log("☑️ GeoAPI");
		const request = {
			url: `${this.endpoint}/v2/${path}?location=${this.longitude},${this.latitude}`,
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
			Console.error(error);
		} finally {
			Console.debug(`metadata: ${JSON.stringify(metadata, null, 2)}`);
			Console.log("✅ GeoAPI");
		}
		return metadata;
	}

	async WeatherNow() {
		Console.log("☑️ WeatherNow");
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
							language: `${this.language}-${this.country}`,
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
						conditionCode: Weather.ConvertWeatherCode(body?.now?.text),
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
			Console.error(error);
		} finally {
			//Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
			Console.log("✅ WeatherNow");
		}
		return currentWeather;
	}

	async AirNow() {
		Console.log("☑️ AirNow");
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
							language: `${this.language}-${this.country}`,
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
						isSignificant: true,
						pollutants: this.#CreatePollutants(body?.now),
						previousDayComparison: "UNKNOWN",
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ AirNow");
		}
		return airQuality;
	}

	async AirQualityCurrent() {
		Console.log("☑️ AirQualityCurrent");
		const request = {
			url: `${this.endpoint}/airquality/v1/current/${this.latitude}/${this.longitude}`,
			headers: this.headers,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			switch (body?.error) {
				case undefined: {
					const timeStamp = (Date.now() / 1000) | 0;
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
				}
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

	async Minutely() {
		Console.log("☑️ Minutely");
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
							reportedTime: timeStamp,
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
			Console.error(error);
		} finally {
			//Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
			Console.log("✅ Minutely");
		}
		return forecastNextHour;
	}

	async Hourly(hours = 168) {
		Console.log("☑️ Hourly", `host: ${this.host}`);
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
							language: `${this.language}-${this.country}`, // body?.lang,
							latitude: this.latitude,
							longitude: this.longitude,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							readTime: timeStamp,
							reportedTime: new Date(body?.updateTime),
							temporarilyUnavailable: false,
							sourceType: "STATION",
						},
						hours: body?.hourly?.map(hourly => {
							return {
								cloudCover: Number.parseInt(hourly?.cloud, 10),
								// cloudCoverHighAltPct: 0, // Not given
								// cloudCoverLowAltPct: 0, // Not given
								// cloudCoverMidAltPct: 0, // Not given
								conditionCode: Weather.ConvertWeatherCode(hourly?.text),
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(forecastHourly, null, 2)}`);
			Console.log("✅ Hourly");
		}
		return forecastHourly;
	}

	async Daily(days = 10) {
		Console.log("☑️ Daily", `host: ${this.host}`);
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
					const metadata = {
						attributionUrl: body?.fxLink,
						expireTime: timeStamp + 60 * 60,
						language: `${this.language}-${this.country}`, // body?.lang,
						latitude: this.latitude,
						longitude: this.longitude,
						providerLogo: providerNameToLogo("和风天气", this.version),
						providerName: "和风天气",
						readTime: timeStamp,
						reportedTime: new Date(body?.updateTime),
						temporarilyUnavailable: false,
						sourceType: "STATION",
					};
					const timezoneOffset = metadata.reportedTime.getTimezoneOffset();
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
								precipitationAmount: Number.parseFloat(daily?.precip),
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
									conditionCode: Weather.ConvertWeatherCode(daily?.textDay),
									// humidity 用一整天的数据代替
									// humidityMax: daily?.humidity, // Not Accurate
									// humidityMin: daily?.humidity, // Not Accurate
									precipitationAmount: Number.parseFloat(daily?.precip),
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
									conditionCode: Weather.ConvertWeatherCode(daily?.textNight),
									// humidity 用一整天的数据代替
									// humidityMax: daily?.humidity, // Not Accurate
									// humidityMin: daily?.humidity, // Not Accurate
									precipitationAmount: Number.parseFloat(daily?.precip),
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
			Console.error(error);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(forecastDaily, null, 2)}`);
			Console.log("✅ Daily");
		}
		return forecastDaily;
	}

	async HistoricalAir(locationID = new Number(), date = time("yyyyMMdd", Date.now() - 24 * 60 * 60 * 1000)) {
		Console.log("☑️ HistoricalAir", `locationID:${locationID}`, `date: ${date}`);
		const request = {
			url: `${this.endpoint}/v7/historical/air/?location=${locationID}&date=${date}`,
			headers: this.headers,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			switch (body?.code) {
				case "200": {
					const timeStamp = (Date.now() / 1000) | 0;
					const Hour = new Date().getHours();
					airQuality = {
						metadata: {
							attributionUrl: body?.fxLink,
							expireTime: timeStamp + 60 * 60,
							language: `${this.language}-${this.country}`, // body?.lang,
							latitude: this.latitude,
							longitude: this.longitude,
							providerLogo: providerNameToLogo("和风天气", this.version),
							providerName: "和风天气",
							readTime: timeStamp,
							reportedTime: timeStamp,
							temporarilyUnavailable: false,
							sourceType: "STATION",
						},
						categoryIndex: Number.parseInt(body?.airHourly?.[Hour]?.level, 10),
						index: Number.parseInt(body?.airHourly?.[Hour]?.aqi, 10),
						pollutants: this.#CreatePollutants(body?.airHourly?.[Hour]),
						primaryPollutant: this.#Config.Pollutants[body?.airHourly?.[Hour]?.primary] || "NOT_AVAILABLE",
						scale: "HJ6332012",
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

	#ConvertTimeStamp(fxDate, time) {
		const dateTime = `${fxDate}T${time}:00+08:00`;
		return (new Date(dateTime).getTime() / 1000) | 0;
	}
}
