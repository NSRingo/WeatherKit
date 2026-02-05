import { Console, fetch, Lodash as _, time } from "@nsnanocat/util";
import Weather from "./Weather.mjs";
import AirQuality from "../class/AirQuality.mjs";
import ForecastNextHour from "./ForecastNextHour.mjs";
import providerNameToLogo from "../function/providerNameToLogo.mjs";

export default class QWeather {
	constructor(parameters, token, host = "devapi.qweather.com") {
		this.Name = "QWeather";
		this.Version = "4.4.11";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
		this.endpoint = `https://${host}`;
		this.headers = { "X-QW-Api-Key": token };
		this.version = parameters.version;
		this.language = parameters.language;
		this.latitude = parameters.latitude;
		this.longitude = parameters.longitude;
		this.country = parameters.country;
		this.stations;
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
			"mg/m3": "MILLIGRAMS_PER_CUBIC_METER",
			ppb: "PARTS_PER_BILLION",
			ppm: "PARTS_PER_MILLION",
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
				url: 'https://raw.githubusercontent.com/NSRingo/WeatherKit/refs/heads/main/data/qweather-locations-grid.json',
			});

			if (response.status === 304) {
				Console.info("✅ GetLocationsGrid", "Cache not modified");
				setCache({ ...qweatherCache, locationsGrid: { ...locationsGrid, lastUpdated: Date.now() } });
				return locationsGrid.data;
			}

			const newLocationsGrid = JSON.parse(response.body);
			setCache({
				...qweatherCache,
				locationsGrid: { etag: response.headers.get("ETag"), lastUpdated: Date.now(), data: newLocationsGrid },
			});
			Console.info("✅ GetLocationsGrid");
			return newLocationsGrid;
		}
	}

	// Codes by Claude AI
	static GetLocationID(locationsGrid, lat, lng) {
		const { gridSize, grid } = locationsGrid;

		// Haversine距离计算
		const distance = (lat1, lng1, lat2, lng2) => {
			const R = 6371; // 地球半径(km)
			const dLat = (lat2 - lat1) * Math.PI / 180;
			const dLng = (lng2 - lng1) * Math.PI / 180;
			const a = Math.sin(dLat/2) ** 2 +
				Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
				Math.sin(dLng/2) ** 2;
			return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		}

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
		}

		const findNearestFast = (lat, lng) => {
			const keys = getNearbyGridKeys(lat, lng, 2);
			let nearest = null;
			let minDist = Infinity;

			for (const key of keys) {
				const locations = grid[key];
				if (!locations) continue;
		
				for (const loc of locations) {
					const dist = distance(lat, lng, loc.lat, loc.lng);
					if (dist < minDist) {
						minDist = dist;
						nearest = loc;
					}
				}
			}

			return nearest;
		}

		return findNearestFast(lat, lng)?.id;
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
			Console.error(`AirNow: ${error}`);
		} finally {
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.info("✅ AirNow");
		}
		return airQuality;
	}

	async #AirQualityCurrent() {
		Console.info("☑️ AirQualityCurrent");
		const request = {
			url: `${this.endpoint}/airquality/v1/current/${this.latitude}/${this.longitude}`,
			headers: this.headers,
		};
		let airQuality;
		try {
			const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
			switch (body?.error) {
				case undefined: {
					if (Array.isArray(body.stations)) {
						this.stations = body.stations;
					}
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
		return airQuality;
	}

	async Minutely() {
		Console.info("☑️ Minutely");
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
							language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
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
					const metadata = {
						attributionUrl: body?.fxLink,
						expireTime: timeStamp + 60 * 60,
						language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
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

	#Metadata(
		attributionUrl = `https://www.qweather.com/`,
		sourceType = "MODELED",
		temporarilyUnavailable = false,
	) {
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

	#CreatePollutants(pollutantsObj) {
		Console.info("☑️ CreatePollutants");

		Console.info("✅ CreatePollutants");
		// TODO: what is ppmC?
		return pollutantsObj.filter((pollutant) => pollutant.concentration.unit !== "ppmC")
			.map(({ code, concentration }) => {
				const { value, unit } = concentration;
				const pollutantType = this.#Config.Pollutants[code];

				const friendlyUnits = AirQuality.Config.Units.Friendly;
				const { ugm3, mgm3, ppb, ppm } = AirQuality.Config.Units.WeatherKit;
				switch (unit) {
					case friendlyUnits.MILLIGRAMS_PER_CUBIC_METER:
						return { pollutantType, amount: AirQuality.ConvertUnit(value, mgm3, ugm3), units: ugm3 };
					case friendlyUnits.PARTS_PER_MILLION:
						return { pollutantType, amount: AirQuality.ConvertUnit(value, ppm, ppb), units: ppb };
					default:
						return { pollutantType, amount: value, units: this.#Config.Units[unit] };
				};
			});
	}

	/**
	 * 创建苹果格式的污染物对象
	 * @link https://dev.qweather.com/docs/resource/unit/
	 * @param {Object} pollutantsObj - 污染物对象
	 * @returns {Object} 修复后的污染物对象
	 */
	#CreatePollutantsV7(pollutantsObj) {
		Console.info("☑️ CreatePollutantsV7");

		Console.info("✅ CreatePollutantsV7");
		return Object.entries(pollutantsObj).filter(([name]) => this.#Config.Pollutants[name] !== undefined)
			.map(([name, rawAmount]) => {
				const amount = Number.parseFloat(rawAmount);

				const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
				return {
					amount: name === 'co' ? AirQuality.ConvertUnit(amount, mgm3, ugm3) : amount,
					pollutantType: this.#Config.Pollutants[name],
					units: ugm3,
				};
			});
	}

	async AirQuality(forcePrimaryPollutant = false) {
		const findSupportedIndex = (indexes) => {
			const supportedCodes = ['cn-mee', 'cn-mee-1h', 'eu-eea', 'us-epa', 'us-epa-nc'];
			for (const index of indexes) {
				if (supportedCodes.includes(index.code)) {
					return index;
				}
			}

			return {};
		};

		const indexCodeToScale = (code) => {
			switch (code) {
				// We don't need calcualtion so they are same
				case 'cn-mee':
				case 'cn-mee-1h':
					return AirQuality.Config.Scales.HJ6332012;
				case 'us-epa':
				case 'us-epa-nc':
					return AirQuality.Config.Scales.EPA_NowCast;
				case 'eu-eea':
					return AirQuality.Config.Scales.EU_EAQI;
				default:
					return {};
			}
		};

		const getPrimaryPollutant = (scaleCode, pollutants) => {
			Console.info("☑️ getPrimaryPollutant", `scaleCode = ${scaleCode}`);
			if (pollutants.length === 0) {
				Console.warn("⚠️ getPrimaryPollutant", "pollutants is empty!");
				return "NOT_AVAILABLE";
			}

			const pollutantIndexes = pollutants.map((pollutant) => {
				const pollutantType = this.#Config.Pollutants[pollutant.code];
				for (const subIndex of pollutant.subIndexes) {
					if (subIndex.code === scaleCode) {
						return { pollutantType, index: subIndex.aqi };
					}
				}

				Console.warn("⚠️ getPrimaryPollutant", `No index of ${pollutantType} found for required scale`);
				return { pollutantType, index: -1 };
			});

			const primaryPollutant = AirQuality.FindPrimaryPollutants(pollutantIndexes)[0];
			if (primaryPollutant.index < 0) {
				Console.warn("⚠️ getPrimaryPollutant", "No any valid sub-index");
				return "NOT_AVAILABLE";
			}

			Console.info("✅ getPrimaryPollutant");
			return primaryPollutant.pollutantType;
		};

		Console.info("☑️ AirQuality");
		const airQualityCurrent = await this.#AirQualityCurrent();

		const particularAirQuality = {
			pollutants: this.#CreatePollutants(airQualityCurrent.pollutants),
			previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
		};

		const supportedIndex = findSupportedIndex(airQualityCurrent.indexes);
		const scale = indexCodeToScale(supportedIndex?.code);

		if (!supportedIndex?.code || !scale?.categories) {
			Console.error("❌ AirQuality", "No supported index found");
			Console.debug(
				"airQualityCurrent.indexes[].code = "
					+ `${JSON.stringify(airQualityCurrent.indexes?.map(({ code }) => code))}`
			);
			return {
				metadata: this.#Metadata(
					// TODO: &lang=zh
					`https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
					undefined,
					true,
				),
				...particularAirQuality,
			};
		}

		const categoryIndex = Number.parseInt(supportedIndex.level, 10);
		const apiPrimaryPollutant = this.#Config.Pollutants[supportedIndex.primaryPollutant.code] || "NOT_AVAILABLE";

		if (!forcePrimaryPollutant && apiPrimaryPollutant === "NOT_AVAILABLE") {
			Console.warn(
				"⚠️ AirQuality",
				"Max index of pollutants is <= 50, primaryPollutant will be NOT_AVAILABLE.",
			);
		}

		Console.info("✅ AirQuality");
		return {
			metadata: this.#Metadata(
				// TODO: &lang=zh
				`https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
			),
			categoryIndex,
			index: supportedIndex.aqi,
			isSignificant: categoryIndex >= scale.categories.significantIndex,
			...particularAirQuality,
			primaryPollutant: forcePrimaryPollutant && apiPrimaryPollutant === "NOT_AVAILABLE"
				? getPrimaryPollutant(supportedIndex.code, airQualityCurrent.pollutants)
				: apiPrimaryPollutant,
			scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
		}
	}

	async YesterdayAirQuality(locationID) {
		Console.info("☑️ YesterdayAirQuality");
		const historicalAir = await this.#HistoricalAir(locationID);
		const hour = new Date().getHours();
		Console.info("✅ YesterdayAirQuality");
		return {
			metadata: this.#Metadata(historicalAir.fxLink),
			categoryIndex: Number.parseInt(historicalAir.airHourly[hour].level, 10),
			index: Number.parseInt(historicalAir.airHourly[hour].aqi, 10),
			pollutants: this.#CreatePollutantsV7(historicalAir.airHourly[hour]),
			primaryPollutant: this.#Config.Pollutants[historicalAir.airHourly[hour].primary] || "NOT_AVAILABLE",
			scale: AirQuality.ToWeatherKitScale(AirQuality.Config.Scales.HJ6332012.weatherKitScale),
		}
	}

	#ConvertTimeStamp(fxDate, time) {
		const dateTime = `${fxDate}T${time}:00+08:00`;
		return (new Date(dateTime).getTime() / 1000) | 0;
	}
}
