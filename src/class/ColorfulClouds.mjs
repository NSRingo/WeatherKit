import { Console, fetch, Lodash as _ } from "@nsnanocat/util";
import Weather from "./Weather.mjs";
import AirQuality from "./AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class ColorfulClouds {
	constructor(parameters, token) {
		this.Name = "ColorfulClouds";
		this.Version = "3.3.8";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
		this.endpoint = `https://api.caiyunapp.com/v2.6/${token}/${parameters.longitude},${parameters.latitude}`;
		this.headers = { Referer: "https://caiyunapp.com/" };
		this.version = parameters.version;
		this.language = parameters.language;
		this.country = parameters.country;
	}

	#cache = {
		realtime: {},
	};

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

	async #RealTime() {
		Console.info("☑️ RealTime");

		if (this.#cache.realtime?.result?.realtime?.status === "ok") {
			Console.info("✅ RealTime", "Using cache");
			return this.#cache.realtime;
		}

		const request = {
			url: `${this.endpoint}/realtime`,
			headers: this.headers,
		};
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			switch (body?.status) {
				case "ok":
					switch (body?.result?.realtime?.status) {
						case "ok": {
							this.#cache.realtime = body;
							Console.info("✅ RealTime");
							return body;
						}
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
			Console.error(`RealTime: ${error}`);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.info("✅ RealTime");
		}
		return {};
	}

	async Minutely() {
		Console.info("☑️ Minutely");
		const request = {
			url: `${this.endpoint}/minutely?unit=metric:v2`,
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
								expireTime: timeStamp + 60 * 60,
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

	async #Hourly(hourlysteps = 273, begin = undefined) {
		Console.info("☑️ Hourly");
		const request = {
			url: `${this.endpoint}/hourly?hourlysteps=${hourlysteps}`,
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
			url: `${this.endpoint}/daily?dailysteps=${dailysteps}`,
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
									conditionCode: Weather.ConvertWeatherCode(body?.result?.daily?.skycon?.[i]?.value),
									humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100),
									humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100),
									// maxUvIndex: Weather.ConvertDSWRF(body?.result?.daily?.dswrf?.[i]?.max), // ConvertDSWRF 转换不准确
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
										conditionCode: Weather.ConvertWeatherCode(body?.result?.daily?.skycon_08h_20h?.[i]?.value),
										// humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100), // Not given
										// humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100), // Not given
										precipitationAmount: body?.result?.daily?.precipitation_08h_20h?.[i]?.avg,
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
										conditionCode: Weather.ConvertWeatherCode(body?.result?.daily?.skycon_20h_32h?.[i]?.value),
										// humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100), // Not given
										// humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100), // Not given
										precipitationAmount: body?.result?.daily?.precipitation_20h_32h?.[i]?.avg,
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

	#Metadata(reportedTime, location = [this.parameters.latitude, this.parameters.longitude], temporarilyUnavailable = false) {
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
	 * 创建WeatherKit格式的污染物对象
	 * @link https://docs.caiyunapp.com/weather-api/v2/v2.6/1-realtime.html
	 * @returns {Array<{amount: number, pollutantType: string, units: string}>}
	 */
	#CreatePollutants(realtimeAirQuality) {
		Console.info("☑️ CreatePollutants");
		if (realtimeAirQuality?.description?.usa === "") {
			Console.error("❌ CreatePollutants", `Failed to get air_quality data`);
			return [];
		}

		Console.info("✅ CreatePollutants");
		const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
		return Object.entries(realtimeAirQuality).map(([name, amount]) => ({
			amount: name === "co" ? AirQuality.ConvertUnit(amount, mgm3, ugm3) : amount,
			pollutantType: this.#Config.Pollutants[name],
			units: ugm3,
		}));
	}

	async CurrentAirQuality(useUsa = true, forcePrimaryPollutant = true) {
		Console.info("☑️ CurrentAirQuality");
		const realtime = await this.#RealTime();
		if (!realtime.result) {
			Console.error("❌ CurrentAirQuality", "Failed to get realtime data");
			return {
				metadata: this.#Metadata(undefined, undefined, true),
			};
		}

		const particularAirQuality = {
			metadata: this.#Metadata(realtime.result.realtime.air_quality.obs_time, realtime.location),
			pollutants: this.#CreatePollutants(realtime.result.realtime.air_quality),
			previousDayComparison: "UNKNOWN",
		};

		if (useUsa) {
			const scale = AirQuality.Config.Scales.EPA_NowCast;
			const index = realtime.result.realtime.air_quality.aqi.usa;
			const categoryIndex = AirQuality.CategoryIndex(index, scale);
			return {
				...particularAirQuality,
				categoryIndex,
				index,
				isSignificant: categoryIndex >= scale.categories.significantIndex,
				primaryPollutant: "NOT_AVAILABLE",
				scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
			};
		} else {
			const scale = AirQuality.Config.Scales.HJ6332012;
			const index = realtime.result.realtime.air_quality.aqi.chn;
			const categoryIndex = AirQuality.CategoryIndex(index, scale);

			const chnIaqi = [
				{ pollutantType: "PM2_5", index: realtime.result.realtime.air_quality.pm25_iaqi_chn },
				{ pollutantType: "PM10", index: realtime.result.realtime.air_quality.pm10_iaqi_chn },
				{ pollutantType: "OZONE", index: realtime.result.realtime.air_quality.o3_iaqi_chn },
				{ pollutantType: "SO2", index: realtime.result.realtime.air_quality.so2_iaqi_chn },
				{ pollutantType: "NO2", index: realtime.result.realtime.air_quality.no2_iaqi_chn },
				{ pollutantType: "CO", index: realtime.result.realtime.air_quality.co_iaqi_chn },
			];

			const primaryPollutant = AirQuality.FindPrimaryPollutants(chnIaqi)[0];
			const isNotAvailable = !forcePrimaryPollutant && primaryPollutant.index <= 50;
			if (isNotAvailable) {
				Console.warn("⚠️ CurrentAirQuality", `Max index of pollutants ${primaryPollutant.pollutantType} = ${primaryPollutant.index} is <= 50, primaryPollutant will be NOT_AVAILABLE.`);
			}

			Console.info("✅ CurrentAirQuality");
			return {
				...particularAirQuality,
				categoryIndex,
				index,
				isSignificant: categoryIndex >= scale.categories.significantIndex,
				primaryPollutant: isNotAvailable ? "NOT_AVAILABLE" : primaryPollutant.pollutantType,
				scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
			};
		}
	}

	async CurrentWeather() {
		Console.info("☑️ CurrentWeather");
		const realtime = await this.#RealTime();
		if (!realtime.result) {
			Console.error("❌ CurrentWeather", "Failed to get realtime data");
			return {
				metadata: this.#Metadata(undefined, undefined, true),
			};
		}

		Console.info("✅ CurrentWeather");
		return {
			metadata: this.#Metadata(realtime.result.server_time, realtime.location),
			cloudCover: Math.round(realtime.result.realtime.cloudrate * 100),
			conditionCode: Weather.ConvertWeatherCode(realtime.result.realtime.skycon),
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

	async YesterdayCategoryIndex(useUsa = true) {
		Console.info("☑️ YesterdayCategoryIndex");
		const yesterdayHourly = await this.#Hourly(1, (Date.now() - 864e5) / 1000);

		if (!yesterdayHourly.result) {
			Console.error("❌ YesterdayCategoryIndex", "Failed to get hourly data");
			return "UNKNOWN";
		}

		Console.info("✅ YesterdayCategoryIndex");
		const { usa, chn } = yesterdayHourly.result.hourly.air_quality.aqi[0].value;
		return useUsa ? AirQuality.CategoryIndex(usa, AirQuality.Config.Scales.EPA_NowCast) : AirQuality.CategoryIndex(chn, AirQuality.Config.Scales.HJ6332012);
	}

	async ForecastHourly() {
		Console.info("☑️ ForecastHourly");
		const hourly = await this.#Hourly();
		if (!hourly.result) {
			Console.error("❌ ForecastHourly", "Failed to get hourly data");
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
				conditionCode: Weather.ConvertWeatherCode(hourly.result.hourly.skycon[i].value),
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
}
