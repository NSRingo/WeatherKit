import { Console } from "@nsnanocat/util";

export default class AirQuality {
	static Name = "AirQuality";
	static Version = "2.6.0";
	static Author = "Virgil Clyne & Wordless Echo";

	/**
	 * 转换空气质量标准
	 * 将空气质量数据按照指定的标准进行转换，包括污染物数值转换和AQI指数计算
	 * @param {Object} airQuality - 空气质量数据对象
	 * @param {Array} airQuality.pollutants - 污染物数组
	 * @param {import('../types').Settings} Settings - 设置对象
	 * @returns {Object} 转换后的空气质量数据对象
	 */
	static ConvertScale(airQuality, Settings) {
		const scale = Settings?.AQI?.Local?.Scale || "WAQI_InstantCast";
		const convertUnits = Settings?.AQI?.Local?.ConvertUnits || false;
		Console.log(`☑️ ConvertScale, ${airQuality.scale} -> ${scale}, convertUnits: ${convertUnits}`);
		if (airQuality.scale === scale) {
			Console.log("⏭️ ConvertScale");
		} else {
			// 首先将污染物转换为指定标准的单位
			const pollutants = AirQuality.#Pollutants(airQuality.pollutants, scale);
			// 计算 AQI 与首要污染物
			const { AQI: index, pollutantType: primaryPollutant } = pollutants.reduce((previous, current) => (previous?.AQI > current?.AQI ? previous : current), {});
			airQuality.index = index;
			airQuality.scale = AirQuality.#Config.Scales[scale].scale;
			airQuality.primaryPollutant = primaryPollutant;
			airQuality.categoryIndex = AirQuality.CategoryIndex(index, scale);
			airQuality.isSignificant = airQuality.categoryIndex >= AirQuality.#Config.Scales[scale].significant;
			if (convertUnits)
				airQuality.pollutants = airQuality.pollutants.map(pollutant => {
					pollutant.amount = pollutant.convertedAmount;
					pollutant.units = pollutant.convertedUnits;
					return pollutant;
				});
			airQuality.metadata.providerName += `\nConverted using ${scale}`;
			//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
			Console.log("✅ ConvertScale");
		}
		return airQuality;
	}

	static CategoryIndex(aqi = Number(), scale = "WAQI_InstantCast") {
		switch (typeof aqi) {
			case "number":
				break;
			case "string":
				aqi = Number.parseInt(aqi, 10);
				break;
		}
		Console.log("☑️ CategoryIndex", `aqi: ${aqi}`);
		let categoryIndex;
		for (const [key, value] of Object.entries(AirQuality.#Config.Scales[scale].categoryIndex)) {
			categoryIndex = Number.parseInt(key, 10);
			if (aqi >= value[0] && aqi <= value[1]) break;
		}
		Console.log("✅ CategoryIndex", `categoryIndex: ${categoryIndex}`);
		return categoryIndex;
	}

	static ComparisonTrend(todayAQI, yesterdayAQI) {
		Console.log("☑️ ComparisonTrend", `todayAQI: ${todayAQI}`, `yesterdayAQI: ${yesterdayAQI}`);
		let trend = "UNKNOWN";
		if (isNaN(todayAQI - yesterdayAQI)) trend = "UNKNOWN";
		else
			switch (todayAQI - yesterdayAQI) {
				case 10:
				case 9:
				case 8:
				case 7:
				case 6:
				case 5:
				case 4:
					trend = "WORSE";
					break;
				case 3:
				case 2:
				case 1:
				case 0:
				case -1:
				case -2:
				case -3:
					trend = "SAME";
					break;
				case -4:
				case -5:
				case -6:
				case -7:
				case -8:
				case -9:
				case -10:
					trend = "BETTER";
					break;
				case null:
					trend = "UNKNOWN";
					break;
				default:
					switch (Boolean(todayAQI - yesterdayAQI)) {
						case true:
							trend = "UNKNOWN1";
							break;
						case false:
							trend = "UNKNOWN5";
							break;
					}
					break;
			}
		Console.log("✅ ComparisonTrend", `trend: ${trend}`);
		return trend;
	}

	static ConvertUnits(pollutants = []) {
		Console.log("☑️ ConvertUnits");
		pollutants = pollutants.map(pollutant => {
			switch (pollutant.units) {
				case "PARTS_PER_MILLION":
					pollutant.amount = AirQuality.#ConvertUnit(pollutant.amount, pollutant.units, "PARTS_PER_BILLION"); // Will not convert to Xg/m3
					pollutant.units = "PARTS_PER_BILLION";
					break;
				case "MILLIGRAMS_PER_CUBIC_METER":
					pollutant.amount = AirQuality.#ConvertUnit(pollutant.amount, pollutant.units, "MICROGRAMS_PER_CUBIC_METER"); // Will not convert to Xg/m3
					pollutant.units = "MICROGRAMS_PER_CUBIC_METER";
					break;
				default:
					break;
			}
			return pollutant;
		});
		//Console.debug(`pollutants: ${JSON.stringify(pollutants, null, 2)}`);
		Console.log("✅ ConvertUnits");
		return pollutants;
	}

	/**
	 * 修复特定供应商的污染物单位
	 * 主要修复和风天气/QWeather提供商的CO单位问题
	 * @param {Object} airQuality - 空气质量数据对象
	 * @param {Array} airQuality.pollutants - 污染物数组
	 * @param {Object} airQuality.metadata - 空气质量元数据
	 * @param {string} airQuality.metadata.providerName - 数据提供商名称
	 */
	static FixUnits(airQuality) {
		Console.log("☑️ FixUnits");
		switch (airQuality?.metadata?.providerName) {
			case "和风天气":
			case "QWeather":
				airQuality.pollutants = airQuality?.pollutants?.map(pollutant => {
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
			default:
				break;
		}
		Console.log("✅ FixUnits");
		return airQuality;
	}

	static #Config = {
		Scales: {
			HJ_633: {
				/**
				 * China AQI standard.
				 * [环境空气质量指数（AQI）技术规定（试行）]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/W020120410332725219541.pdf}
				 * @type aqiStandard
				 */
				scale: "HJ6332012",
				categoryIndex: {
					"-1": [Number.MIN_VALUE, -1], // INVALID
					1: [0, 50], // GOOD
					2: [51, 100], // MODERATE
					3: [101, 150], // UNHEALTHY_FOR_SENSITIVE
					4: [151, 200], // UNHEALTHY
					5: [201, 300], // VERY_UNHEALTHY
					6: [301, 500], // HAZARDOUS
					7: [500, Number.MAX_VALUE], // OVER_RANGE
				},
				significant: 3,
				pollutants: {
					SO2_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 50], // GOOD
							2: [51, 150], // MODERATE
							3: [151, 475], // UNHEALTHY_FOR_SENSITIVE
							4: [476, 800], // UNHEALTHY
							5: [801, 1600], // VERY_UNHEALTHY
							6: [1601, 2100], // HAZARDOUS
							7: [2101, 2602], // OVER_RANGE
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 150], // GOOD
							2: [151, 500], // MODERATE
							3: [501, 650], // UNHEALTHY_FOR_SENSITIVE
							4: [651, 800], // UNHEALTHY
							// 二氧化硫（SO2）1小时平均浓度高于800 ug/m3的，不再进行其空气质量分指数计算，二氧化硫（SO2）空气质量分指数按24小时平均浓度计算的分指数报告。
						},
					},
					NO2_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 40], // GOOD
							2: [41, 80], // MODERATE
							3: [81, 180], // UNHEALTHY_FOR_SENSITIVE
							4: [181, 280], // UNHEALTHY
							5: [281, 565], // VERY_UNHEALTHY
							6: [566, 750], // HAZARDOUS
							7: [751, 940], // OVER_RANGE
						},
					},
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 100], // GOOD
							2: [101, 200], // MODERATE
							3: [201, 700], // UNHEALTHY_FOR_SENSITIVE
							4: [701, 1200], // UNHEALTHY
							5: [1201, 2340], // VERY_UNHEALTHY
							6: [2341, 3090], // HAZARDOUS
							7: [3091, 3840], // OVER_RANGE
						},
					},
					PM10_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 50], // GOOD
							2: [51, 150], // MODERATE
							3: [151, 250], // UNHEALTHY_FOR_SENSITIVE
							4: [251, 350], // UNHEALTHY
							5: [351, 420], // VERY_UNHEALTHY
							6: [421, 500], // HAZARDOUS
							7: [501, 600], // OVER_RANGE
						},
					},
					CO_24H: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 2], // GOOD
							2: [3, 4], // MODERATE
							3: [5, 14], // UNHEALTHY_FOR_SENSITIVE
							4: [15, 24], // UNHEALTHY
							5: [25, 36], // VERY_UNHEALTHY
							6: [37, 48], // HAZARDOUS
							7: [49, 60], // OVER_RANGE
						},
					},
					CO: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 5], // GOOD
							2: [6, 10], // MODERATE
							3: [11, 35], // UNHEALTHY_FOR_SENSITIVE
							4: [36, 60], // UNHEALTHY
							5: [61, 90], // VERY_UNHEALTHY
							6: [91, 120], // HAZARDOUS
							7: [121, 150], // OVER_RANGE
						},
					},
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 160], // GOOD
							2: [161, 200], // MODERATE
							3: [201, 300], // UNHEALTHY_FOR_SENSITIVE
							4: [301, 400], // UNHEALTHY
							5: [401, 800], // VERY_UNHEALTHY
							6: [801, 1000], // HAZARDOUS
							7: [1001, 1200], // OVER_RANGE
						},
					},
					OZONE_8H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 100], // GOOD
							2: [101, 160], // MODERATE
							3: [161, 215], // UNHEALTHY_FOR_SENSITIVE
							4: [216, 265], // UNHEALTHY
							5: [266, 800], // VERY_UNHEALTHY
							// 臭氧（O3）8小时平均浓度值高于800 ug/m3的，不再进行其空气质量分指数计算，臭氧（O3）空气质量分指数按1小时平均浓度计算的分指数报告。
						},
					},
					PM2_5_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 35], // GOOD
							2: [36, 75], // MODERATE
							3: [76, 115], // UNHEALTHY_FOR_SENSITIVE
							4: [116, 150], // UNHEALTHY
							5: [151, 250], // VERY_UNHEALTHY
							6: [251, 350], // HAZARDOUS
							7: [351, 500], // OVER_RANGE
						},
					},
				},
			},
			EPA_NowCast: {
				/**
				 * US AQI standard, not equal to NowCast.
				 * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI) (EPA 454/B-24-002, May 2024)]{@link https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf}
				 * @type aqiStandard
				 */
				scale: "EPA_NowCast",
				categoryIndex: {
					"-1": [Number.MIN_VALUE, -1], // INVALID
					1: [0, 50], // GOOD
					2: [51, 100], // MODERATE
					3: [101, 150], // UNHEALTHY_FOR_SENSITIVE
					4: [151, 200], // UNHEALTHY
					5: [201, 300], // VERY_UNHEALTHY
					6: [301, 500], // HAZARDOUS
					7: [500, Number.MAX_VALUE], // OVER_RANGE
				},
				significant: 3,
				pollutants: {
					OZONE_8H: {
						units: "PARTS_PER_MILLION",
						ppxToXGM3: 1.97, // 48 g/mol
						ranges: {
							1: [0, 0.054], // GOOD
							2: [0.055, 0.07], // MODERATE
							3: [0.071, 0.085], // UNHEALTHY_FOR_SENSITIVE
							4: [0.086, 0.105], // UNHEALTHY
							5: [0.106, 0.2], // VERY_UNHEALTHY
							// 8-hour O3 values do not define higher AQI values (≥ 301).
							// AQI values of 301 or higher are calculated with 1-hour O3 concentrations.
						},
					},
					OZONE: {
						units: "PARTS_PER_MILLION",
						ppxToXGM3: 1.97, // 48 g/mol
						ranges: {
							// Areas are generally required to report the AQI based on 8-hour O3 values. However,
							// there are a small number of areas where an AQI based on 1-hour O3 values would be more precautionary.
							// In these cases, in addition to calculating the 8-hour O3 index value,
							// the 1-hour O3 value may be calculated, and the maximum of the two values reported.
							3: [0.125, 0.164], // UNHEALTHY_FOR_SENSITIVE
							4: [0.165, 0.204], // UNHEALTHY
							5: [0.205, 0.404], // VERY_UNHEALTHY
							6: [0.405, 0.604], // HAZARDOUS
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0.0, 9.0], // GOOD
							2: [9.1, 35.4], // MODERATE
							3: [35.5, 55.4], // UNHEALTHY_FOR_SENSITIVE
							4: [55.5, 125.4], // UNHEALTHY
							5: [125.5, 225.4], // VERY_UNHEALTHY
							6: [225.5, 325.4], // HAZARDOUS
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 54], // GOOD
							2: [55, 154], // MODERATE
							3: [155, 254], // UNHEALTHY_FOR_SENSITIVE
							4: [255, 354], // UNHEALTHY
							5: [355, 424], // VERY_UNHEALTHY
							6: [425, 604], // HAZARDOUS
						},
					},
					CO_8H: {
						units: "PARTS_PER_MILLION",
						ppxToXGM3: 1.14, // 28 g/mol
						ranges: {
							1: [0.0, 4.4], // GOOD
							2: [4.5, 9.4], // MODERATE
							3: [9.5, 12.4], // UNHEALTHY_FOR_SENSITIVE
							4: [12.5, 15.4], // UNHEALTHY
							5: [15.5, 30.4], // VERY_UNHEALTHY
							6: [30.5, 50.4], // HAZARDOUS
						},
					},
					CO: {
						units: "PARTS_PER_MILLION",
						ppxToXGM3: 1.14, // 28 g/mol
						ranges: {
							1: [0.0, 4.4], // GOOD
							2: [4.5, 9.4], // MODERATE
							3: [9.5, 12.4], // UNHEALTHY_FOR_SENSITIVE
							4: [12.5, 15.4], // UNHEALTHY
							5: [15.5, 30.4], // VERY_UNHEALTHY
							6: [30.5, 50.4], // HAZARDOUS
						},
					},
					SO2: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: 2.62, // 64 g/mol
						ranges: {
							1: [0, 35], // GOOD
							2: [36, 75], // MODERATE
							3: [76, 185], // UNHEALTHY_FOR_SENSITIVE
							4: [186, 304], // UNHEALTHY
							// 1-hour SO2 values do not define higher AQI values (≥ 200).
							// AQI values of 200 or greater are calculated with 24-hour SO2 concentrations.
						},
					},
					SO2_24H: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: -1,
						ranges: {
							5: [305, 604], // VERY_UNHEALTHY
							6: [605, 1004], // HAZARDOUS
						},
					},
					// NOT FOR CALCULATION
					//
					// EPA strengthened the primary standard for SO2 in 2010.
					// Because there was not enough health information to inform changing the upper end of the AQI for SO2,
					// the upper end continues to use the 24-hour average SO2 concentration.
					// The lower end of the AQI uses the daily max 1-hour SO2 concentration.
					//
					// If you have a daily max 1-hour SO2 concentration below 305 ppb,
					// then use the breakpoints in Table 6 to calculate the AQI value.
					//
					// If you have a 24-hour average SO2 concentration greater than or equal to 305 ppb,
					// then use the breakpoints in Table 6 to calculate the AQI value.
					// If you have a 24-hour value in this range,
					// it will always result in a higher AQI value than a 1-hour value would.
					//
					// On rare occasions, you could have a day where the daily max 1-hour concentration is at or above 305 ppb
					// but when you try to use the 24-hour average to calculate the AQI value,
					// you find that the 24-hour concentration is not above 305 ppb.
					// If this happens, use 200 for the lower and upper AQI breakpoints (ILo and IHi) in Equation 1
					// to calculate the AQI value based on the daily max 1-hour value.
					// This effectively fixes the AQI value at 200 exactly,
					// which ensures that you get the highest possible AQI value associated with your 1-hour concentration
					// on such days.
					SO2_MAX_1H: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: -1,
						ranges: {
							5: [305, 604], // VERY_UNHEALTHY
							6: [605, Number.MAX_VALUE], // HAZARDOUS
						},
					},
					NO2: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: 1.88, // 46 g/mol
						ranges: {
							1: [0, 53], // GOOD
							2: [54, 100], // MODERATE
							3: [101, 360], // UNHEALTHY_FOR_SENSITIVE
							4: [361, 649], // UNHEALTHY
							5: [650, 1249], // VERY_UNHEALTHY
							6: [1250, 2049], // HAZARDOUS
						},
					},
				},
			},
			WAQI_InstantCast: {
				/**
				 * WAQI InstantCast.
				 * [A Beginner's Guide to Air Quality Instant-Cast and Now-Cast.]{@link https://aqicn.org/faq/2015-03-15/air-quality-nowcast-a-beginners-guide/}
				 * [Ozone AQI Scale update]{@link https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/}
				 * @type aqiStandard
				 */
				scale: "EPA_NowCast",
				categoryIndex: {
					"-1": [Number.MIN_VALUE, -1], // INVALID
					1: [0, 50], // GOOD
					2: [51, 100], // MODERATE
					3: [101, 150], // UNHEALTHY_FOR_SENSITIVE
					4: [151, 200], // UNHEALTHY
					5: [201, 300], // VERY_UNHEALTHY
					6: [301, 500], // HAZARDOUS
					7: [500, Number.MAX_VALUE], // OVER_RANGE
				},
				significant: 3,
				pollutants: {
					OZONE: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: 1.97,
						ranges: {
							1: [0, 61.5], // GOOD
							2: [62.5, 100.5], // MODERATE
							3: [101.5, 151.5], // UNHEALTHY_FOR_SENSITIVE
							4: [152.5, 204], // UNHEALTHY
							5: [205, 404], // VERY_UNHEALTHY
							6: [405, 605], // HAZARDOUS
						},
					},
					SO2: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: 2.62,
						ranges: {
							1: [0, 35], // GOOD
							2: [36, 75], // MODERATE
							3: [76, 185], // UNHEALTHY_FOR_SENSITIVE
							4: [186, 304], // UNHEALTHY
						},
					},
					SO2_MAX_1H: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: -1,
						ranges: {
							5: [305, 604], // VERY_UNHEALTHY
							6: [605, Number.MAX_VALUE], // HAZARDOUS
						},
					},
					NO2: {
						units: "PARTS_PER_BILLION",
						ppxToXGM3: 1.88,
						ranges: {
							1: [0, 53], // GOOD
							2: [54, 100], // MODERATE
							3: [101, 360], // UNHEALTHY_FOR_SENSITIVE
							4: [361, 649], // UNHEALTHY
							5: [650, 1249], // VERY_UNHEALTHY
							6: [1250, 2049], // HAZARDOUS
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0.0, 9.0], // GOOD
							2: [9.1, 35.4], // MODERATE
							3: [35.5, 55.4], // UNHEALTHY_FOR_SENSITIVE
							4: [55.5, 125.4], // UNHEALTHY
							5: [125.5, 225.4], // VERY_UNHEALTHY
							6: [225.5, 325.4], // HAZARDOUS
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ppxToXGM3: -1,
						ranges: {
							1: [0, 54], // GOOD
							2: [55, 154], // MODERATE
							3: [155, 254], // UNHEALTHY_FOR_SENSITIVE
							4: [255, 354], // UNHEALTHY
							5: [355, 424], // VERY_UNHEALTHY
							6: [425, 604], // HAZARDOUS
						},
					},
					CO: {
						units: "PARTS_PER_MILLION",
						ppxToXGM3: 1.14,
						ranges: {
							1: [0.0, 4.4], // GOOD
							2: [4.5, 9.4], // MODERATE
							3: [9.5, 12.4], // UNHEALTHY_FOR_SENSITIVE
							4: [12.5, 15.4], // UNHEALTHY
							5: [15.5, 30.4], // VERY_UNHEALTHY
							6: [30.5, 50.4], // HAZARDOUS
						},
					},
				},
			},
		},
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

	static #Pollutants(pollutants = [], scale = "WAQI_InstantCast") {
		Console.log("☑️ Pollutants", `scale: ${scale}`);
		pollutants = pollutants.map(pollutant => {
			// Convert unit based on standard
			const PollutantStandard = AirQuality.#Config.Scales[scale].pollutants[pollutant.pollutantType];
			pollutant.convertedAmount = AirQuality.#ConvertUnit(pollutant.amount, pollutant.units, PollutantStandard.units, PollutantStandard.ppxToXGM3);
			pollutant.convertedUnits = PollutantStandard.units;
			pollutant = { ...PollutantStandard, ...pollutant };
			// Calculate AQI for each pollutant
			let categoryIndexKey;
			for (const [key, value] of Object.entries(pollutant.ranges)) {
				categoryIndexKey = Number.parseInt(key, 10);
				if (pollutant.convertedAmount >= value[0] && pollutant.convertedAmount <= value[1]) break;
			}
			pollutant.range = pollutant.ranges[categoryIndexKey];
			pollutant.categoryIndex = Number.parseInt(categoryIndexKey, 10);
			pollutant.category = AirQuality.#Config.Scales[scale].categoryIndex[categoryIndexKey];
			pollutant.AQI = Math.round(((pollutant.category[1] - pollutant.category[0]) * (pollutant.convertedAmount - pollutant.range[0])) / (pollutant.range[1] - pollutant.range[0]) + pollutant.category[0]);
			return pollutant;
		});
		//Console.debug(`pollutants: ${JSON.stringify(pollutants, null, 2)}`);
		Console.log("✅ Pollutants");
		return pollutants;
	}

	static #ConvertUnit(amount, unitFrom, unitTo, ppxToXGM3Value = -1) {
		Console.log("☑️ ConvertUnit");
		Console.debug(`amount: ${amount}`, `ppxToXGM3Value: ${ppxToXGM3Value}`, `unitFrom: ${unitFrom}`, `unitTo: ${unitTo}`);
		if (amount < 0) amount = -1;
		else
			switch (unitFrom) {
				case "PARTS_PER_MILLION":
					switch (unitTo) {
						case "PARTS_PER_MILLION":
							break;
						case "PARTS_PER_BILLION":
							amount = amount * 1000;
							break;
						case "MILLIGRAMS_PER_CUBIC_METER":
							amount = amount * ppxToXGM3Value;
							break;
						case "MICROGRAMS_PER_CUBIC_METER": {
							const inPpb = AirQuality.#ConvertUnit(amount, unitFrom, "PARTS_PER_BILLION", ppxToXGM3Value);
							amount = inPpb * ppxToXGM3Value;
							break;
						}
						default:
							amount = -1;
							break;
					}
					break;
				case "PARTS_PER_BILLION":
					switch (unitTo) {
						case "PARTS_PER_BILLION":
							break;
						case "PARTS_PER_MILLION":
							amount = amount * 0.001;
							break;
						case "MILLIGRAMS_PER_CUBIC_METER": {
							const inPpm = AirQuality.#ConvertUnit(amount, unitFrom, "PARTS_PER_MILLION", ppxToXGM3Value);
							amount = inPpm * ppxToXGM3Value;
							break;
						}
						case "MICROGRAMS_PER_CUBIC_METER":
							amount = amount * ppxToXGM3Value;
							break;
						default:
							amount = -1;
							break;
					}
					break;
				case "MILLIGRAMS_PER_CUBIC_METER":
					switch (unitTo) {
						case "MILLIGRAMS_PER_CUBIC_METER":
							break;
						case "MICROGRAMS_PER_CUBIC_METER":
							amount = amount * 1000;
							break;
						case "PARTS_PER_MILLION":
							amount = amount / ppxToXGM3Value;
							break;
						case "PARTS_PER_BILLION": {
							const inUgM3 = AirQuality.#ConvertUnit(amount, unitFrom, "MICROGRAMS_PER_CUBIC_METER", ppxToXGM3Value);
							amount = inUgM3 / ppxToXGM3Value;
							break;
						}
						default:
							amount = -1;
							break;
					}
					break;
				case "MICROGRAMS_PER_CUBIC_METER":
					switch (unitTo) {
						case "MICROGRAMS_PER_CUBIC_METER":
							break;
						case "MILLIGRAMS_PER_CUBIC_METER":
							amount = amount * 0.001;
							break;
						case "PARTS_PER_MILLION": {
							const inMgM3 = AirQuality.#ConvertUnit(amount, unitFrom, "MILLIGRAMS_PER_CUBIC_METER", ppxToXGM3Value);
							amount = inMgM3 / ppxToXGM3Value;
							break;
						}
						case "PARTS_PER_BILLION":
							amount = amount / ppxToXGM3Value;
							break;
						default:
							amount = -1;
							break;
					}
					break;
				default:
					amount = -1;
					break;
			}
		//Console.log("✅ ConvertUnit", `amount: ${amount}`);
		return amount;
	}
}
