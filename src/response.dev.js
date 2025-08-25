import { $app, Console, done, Lodash as _ } from "@nsnanocat/util";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
import parseWeatherKitURL from "./function/parseWeatherKitURL.mjs";
import providerNameToLogo from "./function/providerNameToLogo.mjs";
import WeatherKit2 from "./class/WeatherKit2.mjs";
import WAQI from "./class/WAQI.mjs";
import ColorfulClouds from "./class/ColorfulClouds.mjs";
import QWeather from "./class/QWeather.mjs";
import AirQuality from "./class/AirQuality.mjs";
import * as flatbuffers from "flatbuffers";
import MatchEnum from "./class/MatchEnum.mjs";
/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
Console.info(`url: ${url.toJSON()}`);
// 获取连接参数
const PATHs = url.pathname.split("/").filter(Boolean);
Console.info(`PATHs: ${PATHs}`);
// 解析格式
const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
Console.info(`FORMAT: ${FORMAT}`);
!(async () => {
	/**
	 * 设置
	 * @type {{Settings: import('./types').Settings}}
	 */
	const { Settings, Caches, Configs } = setENV("iRingo", "WeatherKit", database);
	Console.logLevel = Settings.LogLevel;
	// 创建空数据
	let body = {};
	// 格式判断
	switch (FORMAT) {
		case undefined: // 视为无body
			break;
		case "application/x-www-form-urlencoded":
		case "text/plain":
		default:
			//Console.debug(`body: ${body}`);
			break;
		case "application/x-mpegURL":
		case "application/x-mpegurl":
		case "application/vnd.apple.mpegurl":
		case "audio/mpegurl":
			//body = M3U8.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = M3U8.stringify(body);
			break;
		case "text/xml":
		case "text/html":
		case "text/plist":
		case "application/xml":
		case "application/plist":
		case "application/x-plist":
			//body = XML.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = XML.stringify(body);
			break;
		case "text/vtt":
		case "application/vtt":
			//body = VTT.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = VTT.stringify(body);
			break;
		case "text/json":
		case "application/json":
			body = JSON.parse($response.body ?? "{}");
			switch (url.hostname) {
				case "weatherkit.apple.com":
					// 路径判断
					if (url.pathname.startsWith("/api/v1/availability/")) {
						Console.debug(`body: ${JSON.stringify(body)}`);
						body = Configs?.Availability?.v2;
					}
					break;
			}
			$response.body = JSON.stringify(body);
			break;
		case "application/vnd.apple.flatbuffer":
		case "application/protobuf":
		case "application/x-protobuf":
		case "application/vnd.google.protobuf":
		case "application/grpc":
		case "application/grpc+proto":
		case "application/octet-stream": {
			//Console.debug(`$response: ${JSON.stringify($response, null, 2)}`);
			let rawBody = $app === "Quantumult X" ? new Uint8Array($response.bodyBytes ?? []) : ($response.body ?? new Uint8Array());
			//Console.debug(`isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody)}`);
			switch (FORMAT) {
				case "application/vnd.apple.flatbuffer": {
					// 解析FlatBuffer
					const ByteBuffer = new flatbuffers.ByteBuffer(rawBody);
					const Builder = new flatbuffers.Builder();
					// 主机判断
					switch (url.hostname) {
						case "weatherkit.apple.com":
							// 路径判断
							if (url.pathname.startsWith("/api/v2/weather/")) {
								body = WeatherKit2.decode(ByteBuffer, "all");
								const matchEnum = new MatchEnum(body);
								if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
									await matchEnum.init();
								}
								const parameters = parseWeatherKitURL(url);
								const enviroments = {
									colorfulClouds: new ColorfulClouds(parameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
									qWeather: new QWeather(parameters, Settings?.API?.QWeather?.Token, Settings?.API?.QWeather?.Host),
									waqi: new WAQI(parameters, Settings?.API?.WAQI?.Token),
								};
								if (url.searchParams.get("dataSets").includes("airQuality")) {
									//Console.debug(`body.airQuality: ${JSON.stringify(body?.airQuality, null, 2)}`);
									if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
										matchEnum.airQuality();
									}
									// InjectAirQuality
									if (Settings?.AQI?.ReplaceProviders?.includes(body?.airQuality?.metadata?.providerName)) body.airQuality = await InjectAirQuality(body.airQuality, Settings, enviroments);
									// ConvertAirQuality
									if (body?.airQuality?.pollutants && Settings?.AQI?.Local?.ReplaceScales.includes(body?.airQuality?.scale.split(".")?.[0])) body.airQuality = AirQuality.Convert(body.airQuality, Settings);
									// CompareAirQuality
									body.airQuality = await CompareAirQuality(body.airQuality, Settings, enviroments);
									// FixPollutantUnits
									if (body?.airQuality?.pollutants) body.airQuality.pollutants = AirQuality.FixUnits(body.airQuality.pollutants, body?.airQuality?.metadata?.providerName);
									// Convert units that does not supported in Apple Weather
									if (body?.airQuality?.pollutants) body.airQuality.pollutants = AirQuality.ConvertUnits(body.airQuality.pollutants);
									// ProviderLogo
									if (body?.airQuality?.metadata?.providerName && !body?.airQuality?.metadata?.providerLogo) body.airQuality.metadata.providerLogo = providerNameToLogo(body?.airQuality?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("currentWeather")) {
									// Console.debug(`body.currentWeather: ${JSON.stringify(body?.currentWeather, null, 2)}`);
									if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
										matchEnum.weatherCondition();
										matchEnum.pressureTrend();
									}
									body.currentWeather = await InjectCurrentWeather(body.currentWeather, Settings, enviroments);
									if (body?.currentWeather?.metadata?.providerName && !body?.currentWeather?.metadata?.providerLogo) body.currentWeather.metadata.providerLogo = providerNameToLogo(body?.currentWeather?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("forecastDaily")) {
									//Console.debug(`body.forecastDaily: ${JSON.stringify(body?.forecastDaily, null, 2)}`);
									body.forecastDaily = await InjectForecastDaily(body.forecastDaily, Settings, enviroments);
									if (body?.forecastDaily?.metadata?.providerName && !body?.forecastDaily?.metadata?.providerLogo) body.forecastDaily.metadata.providerLogo = providerNameToLogo(body?.forecastDaily?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("forecastHourly")) {
									//Console.debug(`body.forecastHourly: ${JSON.stringify(body?.forecastHourly, null, 2)}`);
									body.forecastHourly = await InjectForecastHourly(body.forecastHourly, Settings, enviroments);
									if (body?.forecastHourly?.metadata?.providerName && !body?.forecastHourly?.metadata?.providerLogo) body.forecastHourly.metadata.providerLogo = providerNameToLogo(body?.forecastHourly?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("forecastNextHour")) {
									//Console.debug(`body.forecastNextHour: ${JSON.stringify(body?.forecastNextHour, null, 2)}`);
									if (!body?.forecastNextHour) body.forecastNextHour = await InjectForecastNextHour(body.forecastNextHour, Settings, enviroments);
									if (body?.forecastNextHour?.metadata?.providerName && !body?.forecastNextHour?.metadata?.providerLogo) body.forecastNextHour.metadata.providerLogo = providerNameToLogo(body?.forecastNextHour?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("weatherAlerts")) {
									if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
										matchEnum.severity();
										matchEnum.significanceType();
										matchEnum.urgency();
										matchEnum.certainty();
										matchEnum.importanceType();
										matchEnum.responseType();
									}
									if (body?.weatherAlerts?.metadata?.providerName && !body?.weatherAlerts?.metadata?.providerLogo) body.weatherAlerts.metadata.providerLogo = providerNameToLogo(body?.weatherAlerts?.metadata?.providerName, "v2");
									//Console.debug(`body.weatherAlerts: ${JSON.stringify(body?.weatherAlerts, null, 2)}`);
								}
								if (url.searchParams.get("dataSets").includes("WeatherChange")) {
									if (body?.WeatherChanges?.metadata?.providerName && !body?.WeatherChanges?.metadata?.providerLogo) body.WeatherChanges.metadata.providerLogo = providerNameToLogo(body?.WeatherChanges?.metadata?.providerName, "v2");
									//Console.debug(`body.WeatherChanges: ${JSON.stringify(body?.WeatherChanges, null, 2)}`);
								}
								if (url.searchParams.get("dataSets").includes("trendComparison")) {
									if (body?.historicalComparisons?.metadata?.providerName && !body?.historicalComparisons?.metadata?.providerLogo) body.historicalComparisons.metadata.providerLogo = providerNameToLogo(body?.historicalComparisons?.metadata?.providerName, "v2");
									//Console.debug(`body.historicalComparisons: ${JSON.stringify(body?.historicalComparisons, null, 2)}`);
								}
								if (url.searchParams.get("dataSets").includes("locationInfo")) {
									if (body?.locationInfo?.metadata?.providerName && !body?.locationInfo?.metadata?.providerLogo) body.locationInfo.metadata.providerLogo = providerNameToLogo(body?.locationInfo?.metadata?.providerName, "v2");
									//Console.debug(`body.locationInfo: ${JSON.stringify(body?.locationInfo, null, 2)}`);
								}
								const WeatherData = WeatherKit2.encode(Builder, "all", body);
								Builder.finish(WeatherData);
								break;
							}
							break;
					}
					rawBody = Builder.asUint8Array(); // Of type `Uint8Array`.
					break;
				}
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
					break;
				case "application/grpc":
				case "application/grpc+proto":
					break;
				case "application/octet-stream":
					break;
			}
			// 写入二进制数据
			$response.body = rawBody;
			break;
		}
	}
})()
	.catch(e => Console.error(e))
	.finally(() => done($response));

/**
 * 注入空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的空气质量数据
 */
async function InjectAirQuality(airQuality, Settings, enviroments) {
	Console.log("☑️ InjectAirQuality");
	let newAirQuality;
	switch (Settings?.AQI?.Provider) {
		case "WeatherKit":
			break;
		case "QWeather": {
			newAirQuality = await enviroments.qWeather.AirNow();
			//newAirQuality = await enviroments.qWeather.AirQualityCurrent();
			break;
		}
		case "ColorfulClouds":
		default: {
			newAirQuality = (await enviroments.colorfulClouds.RealTime()).airQuality;
			break;
		}
		case "WAQI": {
			if (Settings?.API?.WAQI?.Token) {
				newAirQuality = await enviroments.waqi.AQI2();
			} else {
				const Nearest = await enviroments.waqi.Nearest();
				const Token = await enviroments.waqi.Token(Nearest?.metadata?.stationId);
				//Caches.WAQI.set(stationId, Token);
				newAirQuality = await enviroments.waqi.AQI(Nearest?.metadata?.stationId, Token);
				newAirQuality.metadata = { ...Nearest?.metadata, ...newAirQuality?.metadata };
				newAirQuality = { ...Nearest, ...newAirQuality };
			}
			break;
		}
	}
	if (newAirQuality?.metadata) {
		newAirQuality.metadata = { ...airQuality?.metadata, ...newAirQuality.metadata };
		airQuality = { ...airQuality, ...newAirQuality };
		if (!airQuality?.pollutants) airQuality.pollutants = [];
		//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
	}
	Console.log("✅ InjectAirQuality");
	return airQuality;
}

/**
 * 比较空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 比较后的空气质量数据
 */
async function CompareAirQuality(airQuality, Settings, enviroments) {
	Console.log("☑️ CompareAirQuality");
	let ConvertedAirQualtiy;
	switch (Settings?.AQI?.ComparisonProvider || Settings?.AQI?.Provider) {
		case "WeatherKit":
		default:
			break;
		case "QWeather": {
			if (!airQuality?.metadata?.locationID) {
				const metadata = await enviroments.qWeather.GeoAPI();
				if (!airQuality?.metadata?.attributionUrl) airQuality.metadata.attributionUrl = metadata.attributionUrl;
				airQuality.metadata.locationID = metadata?.locationID;
			}
			const historicalAirQuality = await enviroments.qWeather.HistoricalAir(airQuality?.metadata?.locationID);

			Console.debug(`airQuality.scale: ${airQuality?.scale}`, `historicalAirQuality.scale: ${historicalAirQuality?.scale}`);
			if (airQuality?.scale === historicalAirQuality?.scale) {
				ConvertedAirQualtiy = historicalAirQuality;
			} else {
				ConvertedAirQualtiy = AirQuality.Convert(historicalAirQuality, Settings);
				if (airQuality?.scale !== ConvertedAirQualtiy?.scale) {
					ConvertedAirQualtiy = null;
				}
			}
			airQuality.previousDayComparison = AirQuality.ComparisonTrend(airQuality?.index, ConvertedAirQualtiy?.index);
			break;
		}
		case "ColorfulClouds": {
			const Hourly = (await enviroments.colorfulClouds.Hourly(1, ((Date.now() - 864e5) / 1000) | 0)).airQuality;
			airQuality.previousDayComparison = AirQuality.ComparisonTrend(airQuality?.index, Hourly?.index);
			break;
		}
		case "WAQI": {
			break;
		}
	}
	Console.log("✅ CompareAirQuality");
	return airQuality;
}

/**
 * 注入下一小时天气预报数据
 * @param {any} forecastNextHour - 下一小时预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的下一小时预报数据
 */
async function InjectForecastNextHour(forecastNextHour, Settings, enviroments) {
	Console.log("☑️ InjectForecastNextHour");
	let newForecastNextHour;
	switch (Settings?.NextHour?.Provider) {
		case "WeatherKit":
			break;
		case "QWeather": {
			newForecastNextHour = await enviroments.qWeather.Minutely();
			break;
		}
		case "ColorfulClouds":
		default: {
			newForecastNextHour = await enviroments.colorfulClouds.Minutely();
			break;
		}
	}
	if (newForecastNextHour?.metadata) {
		newForecastNextHour.metadata = { ...forecastNextHour?.metadata, ...newForecastNextHour.metadata };
		forecastNextHour = { ...forecastNextHour, ...newForecastNextHour };
		//Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
	}
	Console.log("✅ InjectForecastNextHour");
	return forecastNextHour;
}

/**
 * 注入当前天气数据
 * @param {any} currentWeather - 当前天气数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的当前天气数据
 */
async function InjectCurrentWeather(currentWeather, Settings, enviroments) {
	Console.log("☑️ InjectCurrentWeather");
	let newCurrentWeather;
	switch (Settings?.Weather?.Provider) {
		case "WeatherKit":
		default:
			break;
		case "QWeather": {
			newCurrentWeather = await enviroments.qWeather.WeatherNow();
			break;
		}
		case "ColorfulClouds": {
			newCurrentWeather = (await enviroments.colorfulClouds.RealTime()).currentWeather;
			break;
		}
	}
	if (newCurrentWeather?.metadata) {
		newCurrentWeather.metadata = { ...currentWeather?.metadata, ...newCurrentWeather.metadata };
		currentWeather = { ...currentWeather, ...newCurrentWeather };
		//Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
	}
	Console.log("✅ InjectCurrentWeather");
	return currentWeather;
}

/**
 * 注入每日天气预报数据
 * @param {any} forecastDaily - 每日预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的每日预报数据
 */
async function InjectForecastDaily(forecastDaily, Settings, enviroments) {
	Console.log("☑️ InjectForecastDaily");
	let newForecastDaily;
	switch (Settings?.Weather?.Provider) {
		case "WeatherKit":
		default:
			break;
		case "QWeather": {
			newForecastDaily = await enviroments.qWeather.Daily();
			break;
		}
		case "ColorfulClouds": {
			const dailysteps = forecastDaily.days?.length || 11;
			const begin = forecastDaily.days?.[0]?.forecastStart || undefined;
			Console.debug(`dailysteps: ${dailysteps}, begin: ${begin}`);
			newForecastDaily = await enviroments.colorfulClouds.Daily(dailysteps, begin);
			break;
		}
	}
	if (newForecastDaily?.metadata) {
		forecastDaily.metadata = { ...forecastDaily?.metadata, ...newForecastDaily.metadata };
		forecastDaily.days = forecastDaily.days.map((day, i) => {
			Console.debug(`forecastStart: ${day.forecastStart}`);
			Console.debug(`newForecastStart: ${newForecastDaily.days[i]?.forecastStart}`);
			if (newForecastDaily.days[i]) {
				newForecastDaily.days[i].daytimeForecast = { ...day.daytimeForecast, ...newForecastDaily.days[i].daytimeForecast };
				newForecastDaily.days[i].overnightForecast = { ...day.overnightForecast, ...newForecastDaily.days[i].overnightForecast };
				return { ...day, ...newForecastDaily.days[i] };
			} else return day;
		});
		//Console.debug(`forecastDaily: ${JSON.stringify(forecastDaily, null, 2)}`);
	}
	Console.log("✅ InjectForecastDaily");
	return forecastDaily;
}

/**
 * 注入小时天气预报数据
 * @param {any} forecastHourly - 小时预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的小时预报数据
 */
async function InjectForecastHourly(forecastHourly, Settings, enviroments) {
	Console.log("☑️ InjectForecastHourly");
	let newForecastHourly;
	switch (Settings?.Weather?.Provider) {
		case "WeatherKit":
		default:
			break;
		case "QWeather": {
			newForecastHourly = await enviroments.qWeather.Hourly();
			break;
		}
		case "ColorfulClouds": {
			const hourlysteps = forecastHourly.hours?.length || 273;
			const begin = forecastHourly.hours?.[0]?.forecastStart || undefined;
			Console.debug(`hourlysteps: ${hourlysteps}, begin: ${begin}`);
			newForecastHourly = (await enviroments.colorfulClouds.Hourly(hourlysteps, begin)).forecastHourly;
			break;
		}
	}
	if (newForecastHourly?.metadata) {
		forecastHourly.metadata = { ...forecastHourly?.metadata, ...newForecastHourly.metadata };
		forecastHourly.hours = forecastHourly.hours.map((hour, i) => {
			Console.debug(`forecastStart: ${hour.forecastStart}`);
			Console.debug(`newForecastStart: ${newForecastHourly.hours[i]?.forecastStart}`);
			return {
				...hour,
				...newForecastHourly.hours[i],
			};
		});
		//Console.debug(`forecastHourly: ${JSON.stringify(forecastHourly, null, 2)}`);
	}
	Console.log("✅ InjectForecastHourly");
	return forecastHourly;
}
