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
										body.currentWeather = await InjectCurrentWeather(body.currentWeather, Settings, enviroments);
										if (body?.currentWeather?.metadata?.providerName && !body?.currentWeather?.metadata?.providerLogo) body.currentWeather.metadata.providerLogo = providerNameToLogo(body?.currentWeather?.metadata?.providerName, "v2");
									}
									if (url.searchParams.get("dataSets").includes("forecastDaily")) {
										body.forecastDaily = await InjectForecastDaily(body.forecastDaily, Settings, enviroments);
										if (body?.forecastDaily?.metadata?.providerName && !body?.forecastDaily?.metadata?.providerLogo) body.forecastDaily.metadata.providerLogo = providerNameToLogo(body?.forecastDaily?.metadata?.providerName, "v2");
									}
									if (url.searchParams.get("dataSets").includes("forecastHourly")) {
										body.forecastHourly = await InjectForecastHourly(body.forecastHourly, Settings, enviroments);
										if (body?.forecastHourly?.metadata?.providerName && !body?.forecastHourly?.metadata?.providerLogo) body.forecastHourly.metadata.providerLogo = providerNameToLogo(body?.forecastHourly?.metadata?.providerName, "v2");
									}
								}

								if (nextHourTargets.test(country)) {
									if (url.searchParams.get("dataSets").includes("forecastNextHour")) {
										if (!body?.forecastNextHour) body.forecastNextHour = await InjectForecastNextHour(body.forecastNextHour, Settings, enviroments);
										if (body?.forecastNextHour?.metadata?.providerName && !body?.forecastNextHour?.metadata?.providerLogo) body.forecastNextHour.metadata.providerLogo = providerNameToLogo(body?.forecastNextHour?.metadata?.providerName, "v2");
									}
								}

								if (url.searchParams.get("dataSets").includes("airQuality")) {
									const isPollutantEmpty = !Array.isArray(body?.airQuality?.pollutants) || body.airQuality.pollutants.length === 0;
									if (!isPollutantEmpty) {
										AirQuality.FixQWeatherCO(body.airQuality);
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
	Console.info("✅ InjectPollutants");
	switch (Settings?.AirQuality?.Current?.Pollutants?.Provider) {
		case "QWeather": {
			return await enviroments.qWeather.CurrentAirQuality();
		}
		case "ColorfulClouds":
		default: {
			return await enviroments.colorfulClouds.CurrentAirQuality();
		}
	}
}

function getStpConversionFactors(airQuality) {
	const { US } = AirQuality.Config.STP_ConversionFactors;
	switch (airQuality?.metadata?.providerName) {
		case "和风天气": {
			// TODO: Is US the only country to use ppb in QWeather?
			// const epaNowCast = AirQuality.Config.Scales.EPA_NowCast;
			// const currentScaleName = AirQuality.GetNameFromScale(airQuality.scale);
			// if (currentScaleName === epaNowCast.weatherKitScale.name) {
			// 	return US;
			// } else {
			// 	return EU;
			// }

			return US;
		}
		// ColorfulClouds will not returns ppb
		// case "彩云天气":
		// BreeezoMeter is using 25 degree Celsius STP for EU also
		case "BreezoMeter":
		default: {
			return US;
		}
	}
}

function GetAirQualityFromPollutants(algorithm, forcePrimaryPollutant, allowOverRange, airQuality) {
	const { EU_EAQI, WAQI_InstantCast_US, WAQI_InstantCast_CN, WAQI_InstantCast_CN_25_DRAFT, UBA } = AirQuality.Config.Scales;
	const stpConversionFactors = getStpConversionFactors(airQuality);
	switch (algorithm) {
		case "EU_EAQI": {
			const pollutants = AirQuality.ConvertUnits(airQuality.pollutants, stpConversionFactors, EU_EAQI.pollutants);
			return AirQuality.PollutantsToEAQI(pollutants);
		}
		case "WAQI_InstantCast_US": {
			const pollutants = AirQuality.ConvertUnits(airQuality.pollutants, stpConversionFactors, WAQI_InstantCast_US.pollutants);
			return AirQuality.PollutantsToInstantCastUS(pollutants, allowOverRange);
		}
		case "WAQI_InstantCast_CN": {
			const pollutants = AirQuality.ConvertUnits(airQuality.pollutants, stpConversionFactors, WAQI_InstantCast_CN.pollutants);
			return AirQuality.PollutantsToInstantCastCN12(pollutants, forcePrimaryPollutant, allowOverRange);
		}
		case "WAQI_InstantCast_CN_25_DRAFT": {
			const pollutants = AirQuality.ConvertUnits(airQuality.pollutants, stpConversionFactors, WAQI_InstantCast_CN_25_DRAFT.pollutants);
			return AirQuality.PollutantsToInstantCastCN25(pollutants, forcePrimaryPollutant, allowOverRange);
		}
		case "UBA":
		default: {
			const pollutants = AirQuality.ConvertUnits(airQuality.pollutants, stpConversionFactors, UBA.pollutants);
			return AirQuality.PollutantsToUBA(pollutants);
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
			return await enviroments.qWeather.CurrentAirQuality();
		}
		case "ColorfulCloudsUS":
		case "ColorfulCloudsCN": {
			return await enviroments.colorfulClouds.CurrentAirQuality(Settings.AirQuality.Current.Index.Provider === "ColorfulCloudsUS");
		}
		case "iRingo":
		default: {
			return GetAirQualityFromPollutants(Settings.AirQuality?.iRingo?.Algorithm, Settings.AirQuality.Current.Index?.ForceCNPrimaryPollutants, Settings.AirQuality?.iRingo?.AllowOverRange, airQuality);
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
		switch (currentIndexProvider) {
			case "iRingo":
				return Settings?.AirQuality?.iRingo?.Algorithm === "WAQI_InstantCast_CN";
			case "QWeather":
			case "ColorfulCloudsCN": {
				return true;
			}
			case "WeatherKit": {
				return AirQuality.GetNameFromScale(currentScale) === AirQuality.Config.Scales.HJ6332012.weatherKitScale.name;
			}
			default: {
				return false;
			}
		}
	};
	/**
	 * EPA 454/B-18-007
	 * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI)]{@link https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf}
	 */
	const isEPA454_B18007 = currentIndexProvider => {
		switch (currentIndexProvider) {
			case "WAQI":
			case "ColorfulCloudsUS": {
				return true;
			}
			default: {
				return false;
			}
		}
	};
	const chooseAlogrithm = (currentIndexProvider, airQuality, Settings) => {
		switch (currentIndexProvider) {
			case "iRingo":
				return Settings?.AirQuality?.iRingo?.Algorithm;
			case "QWeather":
			case "ColorfulCloudsCN": {
				return "WAQI_InstantCast_CN";
			}
			case "WeatherKit": {
				const currentScale = AirQuality.GetNameFromScale(airQuality?.scale);
				const scales = AirQuality.Config.Scales;
				if (currentScale === scales.HJ6332012.weatherKitScale.name) {
					return "WAQI_InstantCast_CN";
				} else if (currentScale === scales.EPA_NowCast.weatherKitScale.name) {
					return "WAQI_InstantCast_US";
				} else {
					const supportedScales = [scales.EU_EAQI.weatherKitScale.name, scales.UBA.weatherKitScale.name];
					if (supportedScales.includes(currentScale)) {
						return currentScale;
					}

					return "";
				}
			}
			default: {
				return "";
			}
		}
	};

	const colorfulCloudsComparison = async (useUsa, useCurrent, currentCategoryIndex) => {
		Console.info("☑️ colorfulCloudsComparison", `useCurrent: ${useCurrent}`, `currentCategoryIndex: ${currentCategoryIndex}`);
		const yesterdayAirQuality = await enviroments.colorfulClouds.YesterdayAirQuality(useUsa);

		const getMetadata = (temporarilyUnavailable = false) => ({
			...yesterdayAirQuality.metadata,
			providerName: `指数：${yesterdayAirQuality.metadata.providerName}（${useUsa ? "美标，18年9月版" : "国标"}）`,
			temporarilyUnavailable,
		});

		Console.info("✅ colorfulCloudsComparison");
		if (!yesterdayAirQuality.metadata.temporarilyUnavailable) {
			if (useCurrent) {
				return {
					...yesterdayAirQuality,
					metadata: getMetadata(false),
					previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
				};
			} else {
				const colorfulCloudsCurrent = await enviroments.colorfulClouds.CurrentAirQuality(useUsa);
				if (!colorfulCloudsCurrent.metadata.temporarilyUnavailable) {
					return {
						...yesterdayAirQuality,
						metadata: getMetadata(false),
						previousDayComparison: AirQuality.CompareCategoryIndexes(colorfulCloudsCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
					};
				}
			}
		}

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
			providerName: `污染物：${yesterdayQWeather.metadata.providerName}，指数：${indexProvider}`,
			temporarilyUnavailable,
		});

		Console.info("✅ qweatherComparison");
		if (!yesterdayQWeather.metadata.temporarilyUnavailable) {
			const yesterdayAirQuality = pollutantsToAirQuality ? pollutantsToAirQuality(yesterdayQWeather) : { ...yesterdayQWeather, metadata: { ...yesterdayQWeather.metadata, providerName: `${yesterdayQWeather.metadata.providerName}（国标）` } };
			if (useCurrent) {
				return {
					...yesterdayQWeather,
					metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
					previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
				};
			} else {
				const qweatherCurrent = await enviroments.qWeather.CurrentAirQuality(locationInfo);
				if (!qweatherCurrent.metadata.temporarilyUnavailable) {
					return {
						...yesterdayQWeather,
						metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
						previousDayComparison: AirQuality.CompareCategoryIndexes(qweatherCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
					};
				}
			}
		}

		return {
			...yesterdayQWeather,
			metadata: getMetadata(yesterdayQWeather.metadata.providerName, true),
			previousDayComparison: UNKNOWN,
		};
	};

	Console.info("✅ InjectComparison");
	switch (Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider) {
		case "iRingo": {
			const algorithm = chooseAlogrithm(Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider, airQuality, Settings);

			if (algorithm !== "") {
				switch (Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider) {
					case "QWeather": {
						return await qweatherComparison(true, airQuality?.categoryIndex, airQuality => GetAirQualityFromPollutants(algorithm, Settings.AirQuality?.Current?.Index?.ForceCNPrimaryPollutants, Settings.AirQuality?.iRingo?.AllowOverRange, airQuality));
					}
				}
			}

			Console.error("InjectComparison", "Unsupported scale of current air quality");
			return { metadata: { providerName: "iRingo", temporarilyUnavailable: true }, previousDayComparison: UNKNOWN };
		}
		case "QWeather": {
			return await qweatherComparison(isHJ6332012(currentIndexProvider, airQuality?.scale, Settings), airQuality?.categoryIndex);
		}
		case "ColorfulCloudsCN": {
			// Use injected AQI or ColorfulClouds AQI depends on data source
			return colorfulCloudsComparison(false, isHJ6332012(currentIndexProvider, airQuality?.scale, Settings), airQuality?.categoryIndex);
		}
		case "ColorfulCloudsUS":
		default: {
			return colorfulCloudsComparison(true, isEPA454_B18007(currentIndexProvider), airQuality?.categoryIndex);
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

	const getScaleForPollutants = scaleForPollutants => {
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
				return { ...ugm3Scale, ...scaleForPollutants };
			case "EU_ppb":
				return { ...euPpbScale, ...scaleForPollutants };
			case "US_ppb":
				return { ...usPpbScale, ...scaleForPollutants };
			case "Force_ugm3":
				return ugm3Scale;
			case "Force_EU_ppb":
				return euPpbScale;
			case "Force_US_ppb":
				return usPpbScale;
			case "Scale":
			default:
				return scaleForPollutants;
		}
	};

	const replaceUnits = getArrayFromSetting(Settings?.AirQuality?.Current?.Pollutants?.Units?.Replace);
	const isIndexInjected = needInjectIndex && injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable;
	const scaleName = AirQuality.GetNameFromScale(isIndexInjected ? injectedIndex?.scale : airQuality?.scale);

	const pollutants = injectedPollutants?.metadata && !injectedPollutants.metadata.temporarilyUnavailable ? injectedPollutants.pollutants : airQuality?.pollutants;
	Console.info("✅ ConvertPollutants");
	if (replaceUnits.includes(scaleName)) {
		if (isIndexInjected && Settings?.AirQuality?.Current?.Index?.Provider === "iRingo" && unitsMode === "Scale") {
			Console.info("ConvertPollutants", `Use pollutants from iRingo`);
			return injectedIndex.pollutants;
		} else {
			const scale = getScale(scaleName);
			if (!scale) {
				Console.warn("ConvertPollutants", `Unsupported scale name: ${scaleName}`);
				return pollutants;
			}

			return AirQuality.ConvertUnits(pollutants, getStpConversionFactors(airQuality), getScaleForPollutants(scale.pollutants));
		}
	} else {
		return pollutants;
	}
}

/**
 * 获取历史空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 获取后的历史空气质量数据
 */
async function HistoricalAirQuality(airQuality, Settings, enviroments) {
	Console.info("☑️ HistoricalAirQuality");
	let historicalAirQuality;
	// 自动选项与空气质量数据源相同
	if (Settings?.AQI?.ComparisonProvider === "Auto") Settings.AQI.ComparisonProvider = Settings.AQI.Provider;
	switch (Settings?.AQI?.ComparisonProvider || Settings?.AQI?.Provider) {
		case "WeatherKit":
			historicalAirQuality = {};
			break;
		case "QWeather": {
			if (!airQuality?.metadata?.locationID) {
				const metadata = await enviroments.qWeather.GeoAPI();
				if (!airQuality?.metadata?.attributionUrl) airQuality.metadata.attributionUrl = metadata.attributionUrl;
				airQuality.metadata.locationID = metadata?.locationID;
			}
			historicalAirQuality = await enviroments.qWeather.HistoricalAir(airQuality?.metadata?.locationID);
			break;
		}
		case "ColorfulClouds": {
			historicalAirQuality = (await enviroments.colorfulClouds.Hourly(1, ((Date.now() - 864e5) / 1000) | 0)).airQuality;
			// 因为彩云天气提供双标准 AQI，所以这里要保持与当前地区数据相同的标准，以处理 Settings?.AQI?.Local?.Scale === "NONE" 的回退情况
			//historicalAirQuality.scale = airQuality.scale;
			break;
		}
		case "WAQI": {
			// todo
			historicalAirQuality = {};
			break;
		}
	}
	// ConvertAirQuality 现在是必要操作
	historicalAirQuality = AirQuality.ConvertScale(historicalAirQuality, Settings);
	Console.info("✅ HistoricalAirQuality");
	return historicalAirQuality;
}

/**
 * 比较空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 比较后的空气质量数据
 */
async function CompareAirQuality(airQuality, Settings, enviroments) {
	Console.info("☑️ CompareAirQuality", `airQuality.scale: ${airQuality?.scale}`);
	// 获取历史空气质量数据（昨日）
	const historicalAirQuality = await HistoricalAirQuality(airQuality, Settings, enviroments);
	// 比较两日数据并确定变化趋势
	airQuality.previousDayComparison = AirQuality.ComparisonTrend(airQuality?.index, historicalAirQuality?.index);
	Console.info("✅ CompareAirQuality");
	return airQuality;
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
			newForecastDaily = await enviroments.colorfulClouds.Daily(dailysteps, begin);
			break;
		}
	}
	if (newForecastDaily?.metadata) {
		forecastDaily.metadata = { ...forecastDaily?.metadata, ...newForecastDaily.metadata };
		Weather.mergeForecast(forecastDaily?.days, newForecastDaily?.days);
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
			newForecastHourly = await enviroments.colorfulClouds.ForecastHourly(hourlysteps, begin);
			break;
		}
	}
	if (newForecastHourly?.metadata) {
		forecastHourly.metadata = { ...forecastHourly?.metadata, ...newForecastHourly.metadata };
		forecastHourly.hours = Weather.mergeForecast(forecastHourly?.hours, newForecastHourly?.hours);
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
	}
	Console.info("✅ InjectForecastNextHour");
	return forecastNextHour;
}
