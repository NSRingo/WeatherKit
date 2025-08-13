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
			break;
		case "application/x-mpegURL":
		case "application/x-mpegurl":
		case "application/vnd.apple.mpegurl":
		case "audio/mpegurl":
			break;
		case "text/xml":
		case "text/html":
		case "text/plist":
		case "application/xml":
		case "application/plist":
		case "application/x-plist":
			break;
		case "text/vtt":
		case "application/vtt":
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
			let rawBody = $app === "Quantumult X" ? new Uint8Array($response.bodyBytes ?? []) : ($response.body ?? new Uint8Array());
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
								if (url.searchParams.get("dataSets").includes("forecastNextHour")) {
									if (!body?.forecastNextHour) body = await InjectForecastNextHour(url, body, Settings);
									if (body?.forecastNextHour?.metadata?.providerName && !body?.forecastNextHour?.metadata?.providerLogo) body.forecastNextHour.metadata.providerLogo = providerNameToLogo(body?.forecastNextHour?.metadata?.providerName, "v2");
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
			Console.log("✅ ConvertAirQuality: Scale is NONE, not converting.");
			return body;
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
	}
	Console.log("✅ InjectForecastNextHour");
	return body;
}
