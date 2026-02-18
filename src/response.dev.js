import { $app, Console, done, Lodash as _, Storage } from "@nsnanocat/util";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
import * as flatbuffers from "flatbuffers";
import WeatherKit2 from "./class/WeatherKit2.mjs";
import parseWeatherKitURL from "./function/parseWeatherKitURL.mjs";
import providerNameToLogo from "./function/providerNameToLogo.mjs";
import ColorfulClouds from "./class/ColorfulClouds.mjs";
import QWeather from "./class/QWeather.mjs";
import WAQI from "./class/WAQI.mjs";
import Weather from "./class/Weather.mjs";
import AirQuality from "./class/AirQuality.mjs";
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
								const country = url.searchParams.get("country");

								const weatherTargets = new RegExp(Settings?.Weather?.Replace || "(?!)");
								const nextHourTargets = new RegExp(Settings?.NextHour?.Fill || "(?!)");

								if (weatherTargets.test(country)) {
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
								}

								if (nextHourTargets.test(country)) {
									if (url.searchParams.get("dataSets").includes("forecastNextHour")) {
										Console.debug(`body.forecastNextHour: ${JSON.stringify(body?.forecastNextHour, null, 2)}`);
										if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
											matchEnum.conditionType();
											matchEnum.forecastToken();
										}
										if (!body?.forecastNextHour) body.forecastNextHour = await InjectForecastNextHour(body.forecastNextHour, Settings, enviroments);
										if (body?.forecastNextHour?.metadata?.providerName && !body?.forecastNextHour?.metadata?.providerLogo) body.forecastNextHour.metadata.providerLogo = providerNameToLogo(body?.forecastNextHour?.metadata?.providerName, "v2");
									}
								}

								if (url.searchParams.get("dataSets").includes("airQuality")) {
									//Console.debug(`body.airQuality: ${JSON.stringify(body?.airQuality, null, 2)}`);
									if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
										matchEnum.airQuality();
									}

									const isPollutantEmpty = !Array.isArray(body?.airQuality?.pollutants) || body.airQuality.pollutants.length === 0;
									if (!isPollutantEmpty) {
										body.airQuality = AirQuality.FixQWeatherCO(body.airQuality);
									}

									// injectedPollutants
									const isCurrentFill = new RegExp(Settings?.AirQuality?.Current?.Fill || "(?!)").test(country);
									const needPollutants = isCurrentFill && isPollutantEmpty;
									const injectedPollutants = needPollutants ? await InjectPollutants(Settings, enviroments) : body.airQuality;

									// InjectIndex
									const replaceScales = getArrayFromSetting(Settings?.AirQuality?.Current?.Index?.Replace);
									const needInjectIndex = needPollutants || replaceScales.includes(AirQuality.GetNameFromScale(body.airQuality?.scale));
									const injectedIndex = needInjectIndex ? await InjectIndex(injectedPollutants, Settings, enviroments) : injectedPollutants;

									// injectedComparison
									const isComparisonFill = new RegExp(Settings?.AirQuality?.Comparison?.Fill || "(?!)").test(country);
									const weatherKitComparison = body?.airQuality?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
									const previousDayComparison = needInjectIndex && Settings?.AirQuality?.Comparison?.ReplaceWhenCurrentChange ? AirQuality.Config.CompareCategoryIndexes.UNKNOWN : weatherKitComparison;
									const needInjectComparison = isComparisonFill && previousDayComparison === AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
									const currentIndexProvider = needInjectIndex ? Settings?.AirQuality?.Current?.Index?.Provider : "WeatherKit";
									const injectedComparison = needInjectComparison ? await InjectComparison(injectedIndex, currentIndexProvider, Settings, Caches, enviroments) : { ...injectedIndex, previousDayComparison: weatherKitComparison };

									// metadata
									const weatherKitMetadata = body.airQuality?.metadata;
									const pollutantMetadata = injectedPollutants?.metadata;
									const indexMetadata = injectedIndex?.metadata;
									const comparisonMetadata = injectedComparison?.metadata;
									const providers = [
										...(weatherKitMetadata?.providerName && !weatherKitMetadata.temporarilyUnavailable ? [weatherKitMetadata.providerName] : []),
										...(needPollutants && pollutantMetadata?.providerName && !pollutantMetadata.temporarilyUnavailable ? [`污染物：${pollutantMetadata.providerName}`] : []),
										...(needInjectIndex && indexMetadata?.providerName && !indexMetadata.temporarilyUnavailable ? [`指数：${indexMetadata.providerName}`] : []),
										...(needInjectComparison && comparisonMetadata?.providerName && !comparisonMetadata.temporarilyUnavailable ? [`对比昨日：${comparisonMetadata.providerName}`] : []),
									];

									const firstValidProvider = weatherKitMetadata?.providerName || pollutantMetadata?.providerName || indexMetadata?.providerName || comparisonMetadata?.providerName;
									body.airQuality = {
										...body.airQuality,
										...(injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable ? injectedIndex : {}),
										metadata: {
											...(body.airQuality?.metadata ? body.airQuality.metadata : injectedPollutants?.metadata),
											providerName: providers.join("、"),
											...(firstValidProvider ? { providerLogo: providerNameToLogo(firstValidProvider, "v2") } : {}),
										},
										pollutants: ConvertPollutants(body.airQuality, injectedPollutants, needInjectIndex, injectedIndex, Settings),
										previousDayComparison: injectedComparison?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
									};
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
									Console.debug(`body.weatherAlerts: ${JSON.stringify(body?.weatherAlerts, null, 2)}`);
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

// BoxJS returns string if only one selected
function getArrayFromSetting(setting) {
	if (!setting) {
		return [];
	} else if (Array.isArray(setting)) {
		return setting;
	} else {
		return [setting];
	}
}

async function InjectPollutants(Settings, enviroments) {
	Console.info("☑️ InjectPollutants");
	switch (Settings?.AirQuality?.Current?.Pollutants?.Provider) {
		case "QWeather": {
			const qweatherAirQuality = await enviroments.qWeather.CurrentAirQuality();
			const currentAirQuality = {
				...qweatherAirQuality,
				metadata: {
					...qweatherAirQuality.metadata,
					providerName: "和风天气",
				},
			};

			Console.info("✅ InjectPollutants");
			return currentAirQuality;
		}
		case "ColorfulClouds":
		default: {
			const colorfulCloudsAirQuality = await enviroments.colorfulClouds.CurrentAirQuality();
			const currentAirQuality = {
				...colorfulCloudsAirQuality,
				metadata: {
					...colorfulCloudsAirQuality.metadata,
					providerName: "彩云天气",
				},
			};

			Console.info("✅ InjectPollutants");
			return currentAirQuality;
		}
	}
}

function getStpConversionFactors(airQuality) {
	Console.info("☑️ getStpConversionFactors");

	const { US } = AirQuality.Config.STP_ConversionFactors;
	switch (airQuality?.metadata?.providerName) {
		// case "和风天气": {
		// 	// TODO: Is US the only country to use ppb in QWeather?
		// 	const epaNowCast = AirQuality.Config.Scales.EPA_NowCast;
		// 	const currentScaleName = AirQuality.GetNameFromScale(airQuality.scale);
		// 	if (currentScaleName === epaNowCast.weatherKitScale.name) {
		// 		Console.info("✅ getStpConversionFactors", `STP conversion factors for ${airQuality?.metadata?.providerName}: US`);
		// 		return US;
		// 	} else {
		// 		Console.info("✅ getStpConversionFactors", `STP conversion factors for ${airQuality?.metadata?.providerName}: EU`);
		// 		return EU;
		// 	}
		// }
		// ColorfulClouds will not returns ppb
		// case "彩云天气":
		// BreeezoMeter is using 25 degree Celsius STP for EU also
		case "和风天气":
		case "BreezoMeter":
		default: {
			Console.info("✅ getStpConversionFactors", `STP conversion factors for ${airQuality?.metadata?.providerName}: US`);
			return US;
		}
	}
}

function GetAirQualityFromPollutants(algorithm, forcePrimaryPollutant, allowOverRange, airQuality) {
	Console.info("☑️ GetAirQualityFromPollutants");

	const { pollutants } = airQuality;
	const stpConversionFactors = getStpConversionFactors(airQuality);
	switch (algorithm) {
		case "EU_EAQI": {
			const newAirQuality = AirQuality.PollutantsToEAQI(pollutants, stpConversionFactors);
			Console.info("✅ GetAirQualityFromPollutants");
			return newAirQuality;
		}
		case "WAQI_InstantCast_US": {
			const newAirQuality = AirQuality.PollutantsToInstantCastUS(pollutants, stpConversionFactors, allowOverRange);
			Console.info("✅ GetAirQualityFromPollutants");
			return newAirQuality;
		}
		case "WAQI_InstantCast_CN": {
			const newAirQuality = AirQuality.PollutantsToInstantCastCN12(pollutants, stpConversionFactors, allowOverRange, forcePrimaryPollutant);
			Console.info("✅ GetAirQualityFromPollutants");
			return newAirQuality;
		}
		case "WAQI_InstantCast_CN_25_DRAFT": {
			const newAirQuality = AirQuality.PollutantsToInstantCastCN25(pollutants, stpConversionFactors, allowOverRange, forcePrimaryPollutant);
			Console.info("✅ GetAirQualityFromPollutants");
			return newAirQuality;
		}
		case "UBA":
		default: {
			const newAirQuality = AirQuality.PollutantsToUBA(pollutants, stpConversionFactors);
			Console.info("✅ GetAirQualityFromPollutants");
			return newAirQuality;
		}
	}
}

/**
 * 注入空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的空气质量数据
 */
async function InjectIndex(airQuality, Settings, enviroments) {
	Console.info("☑️ InjectIndex");

	switch (Settings?.AirQuality?.Current?.Index?.Provider) {
		case "QWeather": {
			const currentAirQuality = await enviroments.qWeather.CurrentAirQuality(Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
			Console.info("✅ InjectIndex");
			return currentAirQuality;
		}
		case "ColorfulCloudsUS":
		case "ColorfulCloudsCN": {
			const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality(Settings.AirQuality.Current.Index.Provider === "ColorfulCloudsUS", Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
			Console.info("✅ InjectIndex");
			return currentAirQuality;
		}
		case "Calculate":
		default: {
			const currentAirQuality = GetAirQualityFromPollutants(Settings.AirQuality?.Calculate?.Algorithm, Settings.AirQuality.Current.Index?.ForceCNPrimaryPollutants, Settings.AirQuality?.Calculate?.AllowOverRange, airQuality);
			Console.info("✅ InjectIndex");
			return currentAirQuality;
		}
		// TODO
		case "WAQI": {
			if (Settings?.API?.WAQI?.Token) {
				return await enviroments.waqi.AQI2();
			} else {
				const Nearest = await enviroments.waqi.Nearest();
				const Token = await enviroments.waqi.Token(Nearest?.metadata?.stationId);
				//Caches.WAQI.set(stationId, Token);
				const aqi = await enviroments.waqi.AQI(Nearest?.metadata?.stationId, Token);

				return {
					metadata: { ...Nearest?.metadata, ...aqi?.metadata },
					...Nearest,
					...aqi,
				};
			}
		}
	}
}

async function InjectComparison(airQuality, currentIndexProvider, Settings, Caches, enviroments) {
	Console.info("☑️ InjectComparison");

	const { UNKNOWN } = AirQuality.Config.CompareCategoryIndexes;

	/**
	 * HJ 633—2012
	 * [环境空气质量指数（AQI）技术规定（试行）_中华人民共和国生态环境部]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/t20120302_224166.shtml}
	 */
	const isHJ6332012 = (currentIndexProvider, currentScale, Settings) => {
		Console.info("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);

		switch (currentIndexProvider) {
			case "Calculate": {
				Console.debug(`Settings?.AirQuality?.Calculate?.Algorithm: ${Settings?.AirQuality?.Calculate?.Algorithm}`);
				const result = Settings?.AirQuality?.Calculate?.Algorithm === "WAQI_InstantCast_CN";
				Console.info("✅ isHJ6332012", result);
				return result;
			}
			case "QWeather":
			case "ColorfulCloudsCN": {
				Console.info("✅ isHJ6332012", true);
				return true;
			}
			case "WeatherKit": {
				const result = AirQuality.GetNameFromScale(currentScale) === AirQuality.Config.Scales.HJ6332012.weatherKitScale.name;
				Console.info("✅ isHJ6332012", result);
				return result;
			}
			default: {
				Console.info("✅ isHJ6332012", false);
				return false;
			}
		}
	};
	/**
	 * EPA 454/B-18-007
	 * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI)]{@link https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf}
	 */
	const isEPA454_B18007 = currentIndexProvider => {
		Console.info("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);

		switch (currentIndexProvider) {
			case "WAQI":
			case "ColorfulCloudsUS": {
				Console.info("✅ isHJ6332012", true);
				return true;
			}
			default: {
				Console.info("✅ isHJ6332012", false);
				return false;
			}
		}
	};
	const chooseAlogrithm = (currentIndexProvider, airQuality, Settings) => {
		Console.info("☑️ chooseAlogrithm", `currentIndexProvider: ${currentIndexProvider}`);

		switch (currentIndexProvider) {
			case "Calculate": {
				const algorithm = Settings?.AirQuality?.Calculate?.Algorithm;
				Console.info("✅ chooseAlogrithm", `algorithm: ${algorithm}`);
				return algorithm;
			}
			case "QWeather":
			case "ColorfulCloudsCN": {
				Console.info("✅ chooseAlogrithm", `algorithm: WAQI_InstantCast_CN`);
				return "WAQI_InstantCast_CN";
			}
			case "WeatherKit": {
				const currentScale = AirQuality.GetNameFromScale(airQuality?.scale);
				const scales = AirQuality.Config.Scales;

				if (currentScale === scales.HJ6332012.weatherKitScale.name) {
					Console.info("✅ chooseAlogrithm", `algorithm: WAQI_InstantCast_CN`);
					return "WAQI_InstantCast_CN";
				} else if (currentScale === scales.EPA_NowCast.weatherKitScale.name) {
					Console.info("✅ chooseAlogrithm", `algorithm: WAQI_InstantCast_US`);
					return "WAQI_InstantCast_US";
				} else {
					const supportedScales = [scales.EU_EAQI.weatherKitScale.name, scales.UBA.weatherKitScale.name];
					if (supportedScales.includes(currentScale)) {
						Console.info("✅ chooseAlogrithm", `algorithm: ${currentScale}`);
						return currentScale;
					}

					Console.error("chooseAlogrithm", "没有找到合适的内置算法");
					return "";
				}
			}
			default: {
				Console.error("chooseAlogrithm", "未知的currentIndexProvider");
				return "";
			}
		}
	};

	const colorfulCloudsComparison = async (useUsa, useCurrent, currentCategoryIndex) => {
		Console.info("☑️ colorfulCloudsComparison", `useCurrent: ${useCurrent}`, `currentCategoryIndex: ${currentCategoryIndex}`);
		const yesterdayAirQuality = await enviroments.colorfulClouds.YesterdayAirQuality(useUsa);

		const getMetadata = (temporarilyUnavailable = false) => ({
			...yesterdayAirQuality.metadata,
			providerName: `指数：${yesterdayAirQuality.metadata.providerName}`,
			temporarilyUnavailable,
		});

		if (!yesterdayAirQuality.metadata.temporarilyUnavailable) {
			if (useCurrent) {
				const comparisonAirQuality = {
					...yesterdayAirQuality,
					metadata: getMetadata(false),
					previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
				};
				Console.info("✅ colorfulCloudsComparison");
				return comparisonAirQuality;
			} else {
				const colorfulCloudsCurrent = await enviroments.colorfulClouds.CurrentAirQuality(useUsa);
				if (!colorfulCloudsCurrent.metadata.temporarilyUnavailable) {
					Console.debug(`colorfulCloudsCurrent?.index: ${colorfulCloudsCurrent?.index}`);
					const comparisonAirQuality = {
						...yesterdayAirQuality,
						metadata: getMetadata(false),
						previousDayComparison: AirQuality.CompareCategoryIndexes(colorfulCloudsCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
					};
					Console.info("✅ colorfulCloudsComparison");
					return comparisonAirQuality;
				}
			}
		}

		Console.error("colorfulCloudsComparison", `无法从彩云天气获取${yesterdayAirQuality.metadata.temporarilyUnavailable ? "昨日" : "今日"}的空气质量数据`);
		return {
			...yesterdayAirQuality,
			metadata: getMetadata(true),
			previousDayComparison: UNKNOWN,
		};
	};
	const qweatherComparison = async (useCurrent, currentCategoryIndex, pollutantsToAirQuality) => {
		Console.info("☑️ qweatherComparison", `useCurrent: ${useCurrent}`, `currentCategoryIndex: ${currentCategoryIndex}`);
		const setQWeatherCache = qweatherCache => {
			Caches.qweather = qweatherCache;
			Storage.setItem("@iRingo.WeatherKit.Caches", { ...Caches, qweather: qweatherCache });
		};

		const locationsGrid = await QWeather.GetLocationsGrid(Caches?.qweather, setQWeatherCache);
		const { latitude, longitude } = enviroments.qWeather;
		const locationInfo = QWeather.GetLocationInfo(locationsGrid, latitude, longitude);

		const yesterdayQWeather = await enviroments.qWeather.YesterdayAirQuality(locationInfo);

		const getMetadata = (indexProvider, temporarilyUnavailable = false) => ({
			...yesterdayQWeather.metadata,
			providerName: `污染物：和风天气，指数：${indexProvider}`,
			temporarilyUnavailable,
		});

		if (!yesterdayQWeather.metadata.temporarilyUnavailable) {
			const yesterdayAirQuality = pollutantsToAirQuality ? pollutantsToAirQuality(yesterdayQWeather) : { ...yesterdayQWeather, metadata: { ...yesterdayQWeather.metadata, providerName: `${yesterdayQWeather.metadata.providerName}（国标）` } };
			if (useCurrent) {
				const comparisonAirQuality = {
					...yesterdayQWeather,
					metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
					previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
				};
				Console.info("✅ qweatherComparison");
				return comparisonAirQuality;
			} else {
				const qweatherCurrent = await enviroments.qWeather.CurrentAirQuality(locationInfo);
				if (!qweatherCurrent.metadata.temporarilyUnavailable) {
					Console.debug(`qweatherCurrent?.index: ${qweatherCurrent?.index}`);

					const comparisonAirQuality = {
						...yesterdayQWeather,
						metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
						previousDayComparison: AirQuality.CompareCategoryIndexes(qweatherCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
					};
					Console.info("✅ qweatherComparison");
					return comparisonAirQuality;
				}
			}
		}

		Console.error("qweatherComparison", `无法从和风天气获取${yesterdayQWeather.metadata.temporarilyUnavailable ? "昨日" : "今日"}空气质量数据`);
		return {
			...yesterdayQWeather,
			metadata: getMetadata(yesterdayQWeather.metadata.providerName, true),
			previousDayComparison: UNKNOWN,
		};
	};

	switch (Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider) {
		case "Calculate": {
			const algorithm = chooseAlogrithm(Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider, airQuality, Settings);
			const PollutantsProvider = Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider;
			Console.debug(`Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider: ${PollutantsProvider}`);

			if (algorithm !== "") {
				switch (PollutantsProvider) {
					case "QWeather":
					default: {
						const pollutantsToAirQuality = airQuality => GetAirQualityFromPollutants(algorithm, Settings.AirQuality?.Current?.Index?.ForceCNPrimaryPollutants, Settings.AirQuality?.Calculate?.AllowOverRange, airQuality);
						const comparisonAirQuality = await qweatherComparison(true, airQuality?.categoryIndex, pollutantsToAirQuality);
						Console.info("✅ InjectComparison");
						return comparisonAirQuality;
					}
				}
			}

			Console.error("InjectComparison", "不支持今日空气质量的标准");
			return { metadata: { providerName: "iRingo", temporarilyUnavailable: true }, previousDayComparison: UNKNOWN };
		}
		case "QWeather": {
			const comparisonAirQuality = await qweatherComparison(isHJ6332012(currentIndexProvider, airQuality?.scale, Settings), airQuality?.categoryIndex);
			Console.info("✅ InjectComparison");
			return comparisonAirQuality;
		}
		case "ColorfulCloudsCN": {
			// Use injected AQI or ColorfulClouds AQI depends on data source
			const comparisonAirQuality = colorfulCloudsComparison(false, isHJ6332012(currentIndexProvider, airQuality?.scale, Settings), airQuality?.categoryIndex);
			Console.info("✅ InjectComparison");
			return comparisonAirQuality;
		}
		case "ColorfulCloudsUS":
		default: {
			const comparisonAirQuality = colorfulCloudsComparison(true, isEPA454_B18007(currentIndexProvider), airQuality?.categoryIndex);
			Console.info("✅ InjectComparison");
			return comparisonAirQuality;
		}
	}
}

function ConvertPollutants(airQuality, injectedPollutants, needInjectIndex, injectedIndex, Settings) {
	const unitsMode = Settings?.AirQuality?.Current?.Pollutants?.Units?.Mode || "Scale";
	Console.info("☑️ ConvertPollutants", `mode: ${unitsMode}`);

	const getScale = scaleName => {
		const scales = AirQuality.Config.Scales;
		switch (scaleName) {
			case scales.HJ6332012.weatherKitScale.name:
				return scales.WAQI_InstantCast_CN;
			case scales.EPA_NowCast.weatherKitScale.name:
				return scales.WAQI_InstantCast_US;
			case scales.EU_EAQI.weatherKitScale.name:
				return scales.EU_EAQI;
			default:
				return scales[scaleName];
		}
	};

	const getPollutantScales = pollutantScales => {
		const { ugm3, ppb } = AirQuality.Config.Units.WeatherKit;
		const { US, EU } = AirQuality.Config.STP_ConversionFactors;
		const ugm3Scale = {
			OZONE: { units: ugm3, stpConversionFactor: -1 },
			NO2: { units: ugm3, stpConversionFactor: -1 },
			SO2: { units: ugm3, stpConversionFactor: -1 },
			CO: { units: ugm3, stpConversionFactor: -1 },
			C6H6: { units: ugm3, stpConversionFactor: -1 },
			NH3: { units: ugm3, stpConversionFactor: -1 },
			NO: { units: ugm3, stpConversionFactor: -1 },
		};
		const usPpbScale = {
			OZONE: { units: ppb, stpConversionFactor: US.OZONE },
			NO2: { units: ppb, stpConversionFactor: US.NO2 },
			SO2: { units: ppb, stpConversionFactor: US.SO2 },
			CO: { units: ppb, stpConversionFactor: US.CO },
			C6H6: { units: ppb, stpConversionFactor: US.C6H6 },
			NH3: { units: ppb, stpConversionFactor: US.NH3 },
			NO: { units: ppb, stpConversionFactor: US.NO },
		};
		const euPpbScale = {
			OZONE: { units: ppb, stpConversionFactor: EU.OZONE },
			NO2: { units: ppb, stpConversionFactor: EU.NO2 },
			SO2: { units: ppb, stpConversionFactor: EU.SO2 },
			CO: { units: ppb, stpConversionFactor: EU.CO },
			C6H6: { units: ppb, stpConversionFactor: EU.C6H6 },
			NH3: { units: ppb, stpConversionFactor: EU.NH3 },
			NO: { units: ppb, stpConversionFactor: EU.NO },
		};

		switch (unitsMode) {
			case "ugm3":
				return { ...ugm3Scale, ...pollutantScales };
			case "EU_ppb":
				return { ...euPpbScale, ...pollutantScales };
			case "US_ppb":
				return { ...usPpbScale, ...pollutantScales };
			case "Force_ugm3":
				return ugm3Scale;
			case "Force_EU_ppb":
				return euPpbScale;
			case "Force_US_ppb":
				return usPpbScale;
			case "Scale":
			default:
				return pollutantScales;
		}
	};

	const replaceUnits = getArrayFromSetting(Settings?.AirQuality?.Current?.Pollutants?.Units?.Replace);
	const isIndexInjected = needInjectIndex && injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable;
	const scaleName = AirQuality.GetNameFromScale(isIndexInjected ? injectedIndex?.scale : airQuality?.scale);

	const pollutants = injectedPollutants?.metadata && !injectedPollutants.metadata.temporarilyUnavailable ? injectedPollutants.pollutants : airQuality?.pollutants;
	Console.info("✅ ConvertPollutants");
	if (replaceUnits.includes(scaleName)) {
		if (isIndexInjected && Settings?.AirQuality?.Current?.Index?.Provider === "Calculate" && unitsMode === "Scale") {
			Console.info("ConvertPollutants", `Use pollutants from iRingo`);
			return injectedIndex.pollutants;
		} else {
			const scale = getScale(scaleName);
			if (!scale) {
				Console.error("ConvertPollutants", `Unsupported scale name: ${scaleName}`);
				return pollutants;
			}

			return AirQuality.ConvertUnits(pollutants, getStpConversionFactors(airQuality), getPollutantScales(scale.pollutants));
		}
	} else {
		return pollutants;
	}
}

/**
 * 注入当前天气数据
 * @param {any} currentWeather - 当前天气数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的当前天气数据
 */
async function InjectCurrentWeather(currentWeather, Settings, enviroments) {
	Console.info("☑️ InjectCurrentWeather");
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
			newCurrentWeather = await enviroments.colorfulClouds.CurrentWeather();
			break;
		}
	}
	if (newCurrentWeather?.metadata) {
		newCurrentWeather.metadata = { ...currentWeather?.metadata, ...newCurrentWeather.metadata };
		currentWeather = { ...currentWeather, ...newCurrentWeather };
		//Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
	}
	Console.info("✅ InjectCurrentWeather");
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
	Console.info("☑️ InjectForecastDaily");
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
			//Console.debug(`dailysteps: ${dailysteps}, begin: ${begin}`);
			newForecastDaily = await enviroments.colorfulClouds.Daily(dailysteps, begin);
			break;
		}
	}
	if (newForecastDaily?.metadata) {
		forecastDaily.metadata = { ...forecastDaily?.metadata, ...newForecastDaily.metadata };
		Weather.mergeForecast(forecastDaily?.days, newForecastDaily?.days);
		//Console.debug(`forecastDaily: ${JSON.stringify(forecastDaily, null, 2)}`);
	}
	Console.info("✅ InjectForecastDaily");
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
	Console.info("☑️ InjectForecastHourly");
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
			//Console.debug(`hourlysteps: ${hourlysteps}, begin: ${begin}`);
			newForecastHourly = await enviroments.colorfulClouds.ForecastHourly(hourlysteps, begin);
			break;
		}
	}
	if (newForecastHourly?.metadata) {
		forecastHourly.metadata = { ...forecastHourly?.metadata, ...newForecastHourly.metadata };
		forecastHourly.hours = Weather.mergeForecast(forecastHourly?.hours, newForecastHourly?.hours);
		//Console.debug(`forecastHourly: ${JSON.stringify(forecastHourly, null, 2)}`);
	}
	Console.info("✅ InjectForecastHourly");
	return forecastHourly;
}

/**
 * 注入下一小时天气预报数据
 * @param {any} forecastNextHour - 下一小时预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的下一小时预报数据
 */
async function InjectForecastNextHour(forecastNextHour, Settings, enviroments) {
	Console.info("☑️ InjectForecastNextHour");
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
		Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
	}
	Console.info("✅ InjectForecastNextHour");
	return forecastNextHour;
}
