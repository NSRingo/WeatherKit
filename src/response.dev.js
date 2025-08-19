import { $app, Console, done, Lodash as _ } from "@nsnanocat/util";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
import providerNameToLogo from "./function/providerNameToLogo.mjs";
import WeatherKit2 from "./class/WeatherKit2.mjs";
import WAQI from "./class/WAQI.mjs";
import ColorfulClouds from "./class/ColorfulClouds.mjs";
import QWeather from "./class/QWeather.mjs";
import AirQuality from "./class/AirQuality.mjs";
import * as flatbuffers from "flatbuffers";
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
								if (url.searchParams.get("dataSets").includes("airQuality")) {
									Console.debug(`body.airQuality: ${JSON.stringify(body?.airQuality, null, 2)}`);
									// InjectAirQuality
									if (Settings?.AQI?.ReplaceProviders?.includes(body?.airQuality?.metadata?.providerName)) body = await InjectAirQuality(url, body, Settings);
									// CompareAirQuality
									body = await CompareAirQuality(url, body, Settings);
									// PollutantUnitConverter
									switch (body?.airQuality?.metadata?.providerName?.split("\n")?.[0]) {
										case "和风天气":
										case "QWeather":
											if (body?.airQuality?.pollutants)
												body.airQuality.pollutants = body.airQuality.pollutants.map(pollutant => {
													switch (pollutant.pollutantType) {
														case "CO": // Fix CO amount units
															pollutant.units = "MILLIGRAMS_PER_CUBIC_METER";
															break;
														default:
															break;
													}
													return pollutant;
												});
											break;
									}
									// ConvertAirQuality
									if (Settings?.AQI?.Local?.ReplaceScales.includes(body?.airQuality?.scale.split(".")?.[0])) body = ConvertAirQuality(body, Settings);
									// Fix Convert units that does not supported in Apple Weather
									if (body?.airQuality?.pollutants) body.airQuality.pollutants = AirQuality.FixUnits(body.airQuality.pollutants);
									// ProviderLogo
									if (body?.airQuality?.metadata?.providerName && !body?.airQuality?.metadata?.providerLogo) body.airQuality.metadata.providerLogo = providerNameToLogo(body?.airQuality?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("currentWeather")) {
									if (body?.currentWeather?.metadata?.providerName && !body?.currentWeather?.metadata?.providerLogo) body.currentWeather.metadata.providerLogo = providerNameToLogo(body?.currentWeather?.metadata?.providerName, "v2");
									//Console.debug(`body.currentWeather: ${JSON.stringify(body?.currentWeather, null, 2)}`);

                                    body = await InjectCurrentWeather(url, body, Settings);
								}
								if (url.searchParams.get("dataSets").includes("forecastNextHour")) {
									Console.debug(`body.forecastNextHour: ${JSON.stringify(body?.forecastNextHour, null, 2)}`);
									if (!body?.forecastNextHour) body = await InjectForecastNextHour(url, body, Settings);
									if (body?.forecastNextHour?.metadata?.providerName && !body?.forecastNextHour?.metadata?.providerLogo) body.forecastNextHour.metadata.providerLogo = providerNameToLogo(body?.forecastNextHour?.metadata?.providerName, "v2");
								}
								if (url.searchParams.get("dataSets").includes("weatherAlerts")) {
									if (body?.weatherAlerts?.metadata?.providerName && !body?.weatherAlerts?.metadata?.providerLogo) body.weatherAlerts.metadata.providerLogo = providerNameToLogo(body?.weatherAlerts?.metadata?.providerName, "v2");
									Console.debug(`body.weatherAlerts: ${JSON.stringify(body?.weatherAlerts, null, 2)}`);
								}
								if (url.searchParams.get("dataSets").includes("WeatherChange")) {
									if (body?.WeatherChanges?.metadata?.providerName && !body?.WeatherChanges?.metadata?.providerLogo) body.WeatherChanges.metadata.providerLogo = providerNameToLogo(body?.WeatherChanges?.metadata?.providerName, "v2");
									Console.debug(`body.WeatherChanges: ${JSON.stringify(body?.WeatherChanges, null, 2)}`);
								}
								if (url.searchParams.get("dataSets").includes("trendComparison")) {
									if (body?.historicalComparisons?.metadata?.providerName && !body?.historicalComparisons?.metadata?.providerLogo) body.historicalComparisons.metadata.providerLogo = providerNameToLogo(body?.historicalComparisons?.metadata?.providerName, "v2");
									Console.debug(`body.historicalComparisons: ${JSON.stringify(body?.historicalComparisons, null, 2)}`);
								}
								if (url.searchParams.get("dataSets").includes("locationInfo")) {
									if (body?.locationInfo?.metadata?.providerName && !body?.locationInfo?.metadata?.providerLogo) body.locationInfo.metadata.providerLogo = providerNameToLogo(body?.locationInfo?.metadata?.providerName, "v2");
									Console.debug(`body.locationInfo: ${JSON.stringify(body?.locationInfo, null, 2)}`);
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
 * @param {string} url
 * @param {any} body
 * @param {import('./types').Settings} Settings
 */
async function InjectAirQuality(url, body, Settings) {
	Console.log("☑️ InjectAirQuality");
	let airQuality;
	switch (Settings?.AQI?.Provider) {
		case "WeatherKit":
			break;
		case "QWeather": {
			const qWeather = new QWeather({ url: url, host: Settings?.API?.QWeather?.Host, header: Settings?.API?.QWeather?.Header, token: Settings?.API?.QWeather?.Token });
			airQuality = await qWeather.AirNow();
			//airQuality = await qWeather.AirQualityCurrent();
			break;
		}
		case "ColorfulClouds":
		default: {
			const colorfulClouds = new ColorfulClouds({ url: url, header: Settings?.API?.ColorfulClouds?.Header, token: Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==" });
			airQuality = await colorfulClouds.RealTime();
			break;
		}
		case "WAQI": {
			const waqi = new WAQI({ url: url, header: Settings?.API?.WAQI?.Header, token: Settings?.API?.WAQI?.Token });
			if (Settings?.API?.WAQI?.Token) {
				airQuality = await waqi.AQI2();
			} else {
				const Nearest = await waqi.Nearest();
				const Token = await waqi.Token(Nearest?.metadata?.stationId);
				//Caches.WAQI.set(stationId, Token);
				airQuality = await waqi.AQI(Nearest?.metadata?.stationId, Token);
				airQuality.metadata = { ...Nearest?.metadata, ...airQuality?.metadata };
				airQuality = { ...Nearest, ...airQuality };
			}
			break;
		}
	}
	if (airQuality?.metadata) {
		airQuality.metadata = { ...body?.airQuality?.metadata, ...airQuality.metadata };
		body.airQuality = { ...body?.airQuality, ...airQuality };
		if (!body?.airQuality?.pollutants) body.airQuality.pollutants = [];
		Console.debug(`body.airQuality: ${JSON.stringify(body?.airQuality, null, 2)}`);
	}
	Console.log("✅ InjectAirQuality");
	return body;
}

/**
 * @param {string} url
 * @param {any} body
 * @param {import('./types').Settings} Settings
 */
async function CompareAirQuality(url, body, Settings) {
	Console.log("☑️ CompareAirQuality");
	switch (body?.airQuality?.metadata?.providerName?.split("\n")?.[0]) {
		case null:
		case undefined:
		case "BreezoMeter":
		case "The Weather Channel":
		default:
			break;
		case "和风天气":
		case "QWeather": {
			const qWeather = new QWeather({ url: url, host: Settings?.API?.QWeather?.Host, header: Settings?.API?.QWeather?.Header, token: Settings?.API?.QWeather?.Token });
			if (!body?.airQuality?.metadata?.locationID) {
				const metadata = await qWeather.GeoAPI();
				if (!body?.airQuality?.metadata?.attributionUrl) body.airQuality.metadata.attributionUrl = metadata.attributionUrl;
				body.airQuality.metadata.locationID = metadata?.locationID;
			}
			const HistoricalAirQuality = await qWeather.HistoricalAir(undefined, body.airQuality?.metadata?.locationID);
			body.airQuality.previousDayComparison = AirQuality.ComparisonTrend(body.airQuality?.index, HistoricalAirQuality?.index);
			break;
		}
		case "彩云天气":
		case "ColorfulClouds": {
			const colorfulClouds = new ColorfulClouds({ url: url, header: Settings?.API?.ColorfulClouds?.Header, token: Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==" });
			const Hourly = await colorfulClouds.Hourly(undefined, 1, Date.now() - 24 * 60 * 60 * 1000);
			body.airQuality.previousDayComparison = AirQuality.ComparisonTrend(body.airQuality.index, Hourly.index);
			break;
		}
		case "WAQI":
		case "World Air Quality Index Project": {
			const waqi = new WAQI({ url: url, header: Settings?.API?.WAQI?.Header, token: Settings?.API?.WAQI?.Token });
			break;
		}
	}
	Console.log("✅ CompareAirQuality");
	return body;
}

/**
 * @param {any} body
 * @param {import('./types').Settings} Settings
 */
function ConvertAirQuality(body, Settings) {
	Console.log("☑️ ConvertAirQuality");
	let airQuality;
	switch (Settings?.AQI?.Local?.Scale) {
		case "NONE":
			break;
		case "HJ_633":
		case "EPA_NowCast":
		case "WAQI_InstantCast":
		default:
			airQuality = AirQuality.ConvertScale(body?.airQuality?.pollutants, Settings?.AQI?.Local?.Scale, Settings?.AQI?.Local?.ConvertUnits);
			break;
	}
	if (airQuality.index) {
		body.airQuality = { ...body.airQuality, ...airQuality };
		body.airQuality.metadata.providerName += `\nConverted using ${Settings?.AQI?.Local?.Scale}`;
		Console.debug(`body.airQuality: ${JSON.stringify(body.airQuality, null, 2)}`);
	}
	Console.log("✅ ConvertAirQuality");
	return body;
}

/**
 * @param {string} url
 * @param {any} body
 * @param {import('./types').Settings} Settings
 */
async function InjectForecastNextHour(url, body, Settings) {
	Console.log("☑️ InjectForecastNextHour");
	let forecastNextHour;
	switch (Settings?.NextHour?.Provider) {
		case "WeatherKit":
			break;
		case "QWeather": {
			const qWeather = new QWeather({ url: url, host: Settings?.API?.QWeather?.Host, header: Settings?.API?.QWeather?.Header, token: Settings?.API?.QWeather?.Token });
			forecastNextHour = await qWeather.Minutely();
			break;
		}
		case "ColorfulClouds":
		default: {
			const colorfulClouds = new ColorfulClouds({ url: url, header: Settings?.API?.ColorfulClouds?.Header, token: Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==" });
			forecastNextHour = await colorfulClouds.Minutely();
			break;
		}
	}
	if (forecastNextHour?.metadata) {
		forecastNextHour.metadata = { ...body?.forecastNextHour?.metadata, ...forecastNextHour.metadata };
		body.forecastNextHour = { ...body?.forecastNextHour, ...forecastNextHour };
		Console.debug(`body.forecastNextHour: ${JSON.stringify(body?.forecastNextHour, null, 2)}`);
	}
	Console.log("✅ InjectForecastNextHour");
	return body;
}

/**
 * @param {string} url
 * @param {any} body
 * @param {import('./types').Settings} Settings
 */
async function InjectCurrentWeather(url, body, Settings) {
    Console.log("☑️ InjectCurrentWeather");
    let currentWeather;
    switch (Settings?.NextHour?.Provider) {
        case "WeatherKit":
            body.currentWeather = { ...body?.currentWeather, ...currentWeather };
            break;
        case "QWeather": {
            const qWeather = new QWeather({ url: url, host: Settings?.API?.QWeather?.Host, header: Settings?.API?.QWeather?.Header, token: Settings?.API?.QWeather?.Token });
            currentWeather = await qWeather.RealTime();
            body.currentWeather = { ...body?.currentWeather, ...currentWeather };
            break;
        }
        case "ColorfulClouds":
        default: {
            const colorfulClouds = new ColorfulClouds({ url: url, header: Settings?.API?.ColorfulClouds?.Header, token: Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==" });
            const result = await colorfulClouds.RealTime();
            body.currentWeather = ColorfulCloudsToAppleWeather(result, body.currentWeather);
            break;
        }
    }
    Console.log("✅ InjectCurrentWeather");
    return body;
}

/**
 * @param {any} colorfulData 彩云天气原始数据
 * @param {any} appleWeatherData Apple天气原始数据
 */
function ColorfulCloudsToAppleWeather(colorfulData, appleWeatherData) {
    Console.debug(`colorfulData: ${JSON.stringify(colorfulData, null, 2)}`);
    Console.debug(`appleWeatherData: ${JSON.stringify(appleWeatherData, null, 2)}`);
    appleWeatherData =  {
        ...appleWeatherData,
        cloudCover: Math.round(colorfulData.cloudrate * 100), // 云量
        humidity: Math.round(colorfulData.humidity * 100), // 湿度
        conditionCode: ConvertToAppleWeatherCode(colorfulData.skycon) || appleWeatherData.conditionCode,
    };
    Console.debug(`colorfulData: ${JSON.stringify(appleWeatherData, null, 2)}`);
    return appleWeatherData;
}

/**
 * @param {string} skycon 彩云天气原始数据
 * @return {string | null} Apple天气原始数据
 */
function ConvertToAppleWeatherCode(skycon) {
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
