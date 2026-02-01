import { Console } from "@nsnanocat/util";

export default class AirQuality {
	static Name = "AirQuality";
	static Version = "2.8.5";
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
		// 源标准，针对彩云天气双标准 AQI 的情况默认用国标
		const sourceScale = airQuality?.scale?.split(".")?.[0]; // 源标准
		// 目标标准，NONE 时使用源标准，否则使用 Settings
		let targetScale = Settings?.AQI?.Local?.Scale || "EPA_NowCast"; // 目标标准
		const convertUnits = Settings?.AQI?.Local?.ConvertUnits || false; // 是否转换单位
		Console.info(`☑️ ConvertScale`, `${sourceScale} -> ${targetScale}`, `convertUnits: ${convertUnits}`);
		switch (`${sourceScale}|${targetScale}`) {
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: intentional fallthrough for NONE case
			case "HJ6332012|NONE":
				Console.debug("HJ6332012|NONE");
				targetScale = sourceScale;
			case "HJ6332012|HJ6332012":
			case "EPA_NowCast|HJ6332012": {
				Console.debug("HJ6332012|HJ6332012");
				// 处理彩云天气双标准 AQI
				if (typeof airQuality.index === "object") {
					airQuality.scale = AirQuality.Config.Scales[targetScale]?.scale;
					airQuality.index = airQuality?.index?.[airQuality.scale];
					airQuality.categoryIndex = AirQuality.CategoryIndex(airQuality?.index, airQuality.scale);
				}
				// 就算标准相同，也要重新计算显著性
				airQuality.isSignificant = airQuality?.categoryIndex >= AirQuality.Config.Scales[targetScale].significant;
				break;
			}
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: intentional fallthrough for NONE case
			case "EPA_NowCast|NONE":
				Console.debug("EPA_NowCast|NONE");
				targetScale = sourceScale;
			case `${sourceScale}|EPA_NowCast`:
			case `${sourceScale}|WAQI_InstantCast`: {
				Console.debug(`${sourceScale}|${targetScale}`);
				// 处理彩云天气双标准 AQI
				if (typeof airQuality.index === "object") {
					airQuality.scale = AirQuality.Config.Scales[targetScale]?.scale;
					airQuality.index = airQuality?.index?.[airQuality.scale];
					airQuality.categoryIndex = AirQuality.CategoryIndex(airQuality?.index, airQuality.scale);
				}
				// [空气质量] 需要修改的标准 (ReplaceScales) 包含的标准才进行转换
				if (Settings?.AQI?.Local?.ReplaceScales.includes(sourceScale)) {
					// 彩云天气历史数据不含污染物数据，只有历史 AQI，所以要先检查有没有污染物数据
					if (airQuality.pollutants) {
						// 首先将污染物转换为指定标准的单位，"HJ6332012"标准下，此步骤缺失污染物数据无法进行！
						const pollutants = AirQuality.#Pollutants(airQuality.pollutants, targetScale);
						// 重新计算 AQI 与首要污染物
						const { AQI: index, pollutantType: primaryPollutant } = pollutants.reduce((previous, current) => (previous?.AQI > current?.AQI ? previous : current), {});
						if (Settings?.AQI?.Local?.Scale !== "NONE") airQuality.index = index;
						if (Settings?.AQI?.Local?.Scale !== "NONE") airQuality.scale = AirQuality.Config.Scales[targetScale].scale;
						airQuality.primaryPollutant = primaryPollutant || "NOT_AVAILABLE";
						if (Settings?.AQI?.Local?.Scale !== "NONE") airQuality.categoryIndex = AirQuality.CategoryIndex(index, targetScale);
						if (Settings?.AQI?.Local?.Scale !== "NONE") airQuality.metadata.providerName += `\nConverted using ${targetScale}`;
					}
				}
				// 就算不进行替换，也要重新计算显著性
				airQuality.isSignificant = airQuality?.categoryIndex >= AirQuality.Config.Scales[targetScale].significant;
				break;
			}
		}
		//Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
		// 如果需要转换单位
		if (convertUnits)
			airQuality.pollutants = airQuality?.pollutants?.map(pollutant => {
				pollutant.amount = pollutant.convertedAmount;
				pollutant.units = pollutant.convertedUnits;
				return pollutant;
			});
		Console.info("✅ ConvertScale");
		return airQuality;
	}

	static CategoryIndex(index, scale) {
		Console.info("☑️ CategoryIndex", `index: ${index}`);
		const { categoryIndex } = scale.categories.ranges.find(({ range }) => {
			const [min, max] = range;
			return index >= min && index <= max;
		});
		Console.info("✅ CategoryIndex", `categoryIndex: ${categoryIndex}`);
		return categoryIndex;
	}

	static CompareCategoryIndex(todayCategoryIndex, yesterdayCategoryIndex) {
		Console.info("☑️ CompareCategoryIndex", `todayCategoryIndex: ${todayCategoryIndex}`, `yesterdayCategoryIndex: ${yesterdayCategoryIndex}`);

		const diff = Number(todayCategoryIndex) - Number(yesterdayCategoryIndex);

		if (Number.isNaN(diff)) {
			Console.warn("⚠️ CompareCategoryIndex", `Invalid categoryIndex`);
			return "UNKNOWN";
		} else {
			Console.info("✅ CompareCategoryIndex");
			if (diff === 0) {
				return "SAME";
			} else if (diff > 0) {
				return "WORSE";
			} else {
				return "BETTER";
			}
		}
	}

	static ConvertUnits(pollutants = []) {
		Console.info("☑️ ConvertUnits");
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
		Console.info("✅ ConvertUnits");
		return pollutants;
	}

	/**
	 * 修复和风天气一氧化碳（CO）数据过小的问题。
	 * 和风天气的CO数据单位实际上为mg/m3，将数值乘1000转为WeatherKit的µg/m3单位。
	 */
	static FixQWeatherCO(airQuality) {
		Console.info("☑️ FixQWeatherCO");
		if (!Array.isArray(airQuality?.pollutants)) {
			Console.warn("⚠️ FixQWeatherCO", "airQuality.pollutants is invalid");
			return [];
		}

		switch (airQuality?.metadata?.providerName) {
			case "和风天气":
			case "QWeather":
				Console.info("✅ FixQWeatherCO");
				return airQuality.pollutants.map((pollutant) => {
					const { pollutantType, amount } = pollutant;
					return {
						...pollutant,
						amount: pollutantType === "CO"
							? AirQuality.#ConvertUnit(amount, "MILLIGRAMS_PER_CUBIC_METER", "MICROGRAMS_PER_CUBIC_METER")
							: amount,
					};
				});
			default:
				Console.info("✅ FixQWeatherCO", `Provider ${airQuality?.metadata?.providerName} is not need to fix.`);
				return airQuality.pollutants;
		}
	}

	static #PollutantsToEuLikeAirQuality(pollutants, scale = this.Config.Scales.EU_EAQI) {
		Console.info("☑️ PollutantsToEuLikeAirQuality");
		const aqis = pollutants.map(pollutant => {
			const MIN_INDEX = 1;

			const { pollutantType, units } = pollutant;
			const scaleForPollutant = scale.pollutants[pollutantType];
			const requireConvertUnit = units !== scaleForPollutant.units;
			const amount = requireConvertUnit
				? AirQuality.#ConvertUnit(pollutant.amount, units, scaleForPollutant.units, AirQuality.Config.STP.EU[pollutantType] || -1)
				: pollutant.amount;

			if (requireConvertUnit) {
				Console.info(
					"✅ PollutantsToEuLikeAirQuality",
					`Convert ${pollutantType}: ${pollutant.amount} ${units} -> ${amount} ${scaleForPollutant.units}`
				);
			}

			if (amount < scaleForPollutant.ranges.min.amount) {
				Console.warn(
					"⚠️ PollutantsToEuLikeAirQuality",
					`Invalid amount of ${pollutantType}: ${amount} ${scaleForPollutant.units}, `
						+ `should >= ${scaleForPollutant.ranges.min.amount}`,
				);
				return { pollutantType, index: MIN_INDEX };
			}

			const { indexes } = scaleForPollutant.ranges.value.find(({ amounts }) => {
				const [minAmount, maxAmount] = amounts;
				return amount >= minAmount && amount < maxAmount;
			});

			// minIndex === maxIndex === categoryIndex in EU-like scales
			return { pollutantType, index: indexes[0] };
		});

		const primaryPollutant = aqis.reduce((previous, current) => (previous.index > current.index ? previous : current));

		Console.info("✅ PollutantsToEuLikeAirQuality");
		return {
			index: primaryPollutant.index,
			isSignificant: primaryPollutant.index >= scale.categories.significantIndex,
			// categoryIndex === index in EU-like scales
			categoryIndex: primaryPollutant.index,
			pollutants,
			primaryPollutant: primaryPollutant.pollutantType,
			scale: scale.weatherKitScale.name + "." + scale.weatherKitScale.version,
		};
	}

	static PollutantsToUba(pollutants) {
		Console.info("☑️ PollutantsToUba");
		return AirQuality.#PollutantsToEuLikeAirQuality(pollutants, this.Config.Scales.UBA);
	}

	static PollutantsToEaqi(pollutants) {
		Console.info("☑️ PollutantsToEaqi");
		return AirQuality.#PollutantsToEuLikeAirQuality(pollutants, this.Config.Scales.EU_EAQI);
	}

	static #PollutantsToUsLikeAirQuality(pollutants, scale = this.Config.Scales.WAQI_InstantCast_US) {
		Console.info("☑️ PollutantsToUsLikeAirQuality");
		const aqis = pollutants.map(pollutant => {
			const MIN_INDEX = 0;

			const { pollutantType, units } = pollutant;
			const scaleForPollutant = scale.pollutants[pollutantType];
			const requireConvertUnit = units !== scaleForPollutant.units;
			const amount = requireConvertUnit
				? AirQuality.#ConvertUnit(pollutant.amount, units, scaleForPollutant.units, AirQuality.Config.STP.US[pollutantType])
				: pollutant.amount;

			if (requireConvertUnit) {
				Console.info(
					"✅ PollutantsToUsLikeAirQuality",
					`Convert ${pollutantType}: ${pollutant.amount} ${units} -> ${amount} ${scaleForPollutant.units}`
				);
			}

			if (amount < scaleForPollutant.ranges.min.amount) {
				Console.warn(
					"⚠️ PollutantsToUsLikeAirQuality",
					`Invalid amount ${amount} for ${pollutantType}, should >= ${scaleForPollutant.ranges.min.amount}`,
				);
				return { pollutantType, index: MIN_INDEX };
			}

			// For scales with max index
			if (amount > scaleForPollutant.ranges.max.amount) {
				const maxRange = scaleForPollutant.ranges.max;
				const index = Math.round(
					maxRange.index / maxRange.amount * amount
					+ maxRange.index,
				);
				Console.warn(
					"⚠️ PollutantsToUsLikeAirQuality",
					`Over-range detected! ${pollutantType}: ${amount} ${scaleForPollutant.units}. `
						+ `Actual index: ${index}`,
				);
				Console.warn("⚠️ PollutantsToUsLikeAirQuality", "Take care of yourself!");
				return { pollutantType, index: maxRange.index };
			}

			const { indexes, amounts } = scaleForPollutant.ranges.value.find(({ amounts }) => {
				const [minAmount, maxAmount] = amounts;
				return amount >= minAmount && amount < maxAmount;
			});

			const [minIndex, maxIndex] = indexes;
			const [minAmount, maxAmount] = amounts;

			return {
				pollutantType,
				index: Math.round(
					(maxIndex - minIndex) / (maxAmount - minAmount) * (amount - minAmount)
					+ minIndex,
				),
			};
		});

		const primaryPollutant = aqis.reduce((previous, current) => (previous.index > current.index ? previous : current));
		const categoryIndex = AirQuality.CategoryIndex(primaryPollutant.index, scale);

		Console.info("✅ PollutantsToUsLikeAirQuality");
		return {
			index: primaryPollutant.index,
			isSignificant: categoryIndex >= scale.categories.significantIndex,
			categoryIndex,
			pollutants,
			primaryPollutant: primaryPollutant.pollutantType,
			scale: scale.weatherKitScale.name + "." + scale.weatherKitScale.version,
		};
	}

	static PollutantsToWaqiInstantCastUs(pollutants) {
		Console.info("☑️ PollutantsToWaqiInstantCastUs");
		return AirQuality.#PollutantsToUsLikeAirQuality(pollutants, this.Config.Scales.WAQI_InstantCast_US);
	}

	static PollutantsToWaqiInstantCastCn(pollutants) {
		Console.info("☑️ PollutantsToWaqiInstantCastCn");
		return AirQuality.#PollutantsToUsLikeAirQuality(pollutants, this.Config.Scales.WAQI_InstantCast_CN);
	}

	static Config = {
		Scales: {
			/**
			 * LQI (DE) - Der Luftqualitätsindex (LQI) des Umweltbundesamtes
			 * Germany Air Quality Index
			 * [Der Luftqualitätsindex - LQI | Umweltbundesamt]{@link https://www.umweltbundesamt.de/themen/luft/luftqualitaet/der-luftqualitaetsindex-lqi}
			 * [Überarbeitung des UBA LQI nach der Herausgabe der WHO AQG 2021]{@link https://www.umweltbundesamt.de/system/files/medien/11850/publikationen/08_2025_uug.pdf}
			 */
			UBA: {
				weatherKitScale: {
					name: "UBA",
					version: "2414",
				},
				categories: {
					significantIndex: 4, // schlecht
					ranges: [
						{ categoryIndex: 1, indexes: [1, 1] }, // sehr gut
						{ categoryIndex: 2, indexes: [2, 2] }, // gut
						{ categoryIndex: 3, indexes: [3, 3] }, // mäßig
						{ categoryIndex: 4, indexes: [4, 4] }, // schlecht
						{ categoryIndex: 5, indexes: [5, 5] }, // sehr schlecht
					],
				},
				pollutants: {
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 5, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 10] }, // sehr gut
								{ indexes: [2, 2], amounts: [11, 30] }, // gut
								{ indexes: [3, 3], amounts: [31, 60] }, // mäßig
								{ indexes: [4, 4], amounts: [61, 100] }, // schlecht
								{ indexes: [5, 5], amounts: [101, Number.MAX_VALUE] }, // sehr schlecht
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 5, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 9] }, // sehr gut
								{ indexes: [2, 2], amounts: [10, 27] }, // gut
								{ indexes: [3, 3], amounts: [28, 54] }, // mäßig
								{ indexes: [4, 4], amounts: [55, 90] }, // schlecht
								{ indexes: [5, 5], amounts: [91, Number.MAX_VALUE] }, // sehr schlecht
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 5, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 5] }, // sehr gut
								{ indexes: [2, 2], amounts: [6, 15] }, // gut
								{ indexes: [3, 3], amounts: [16, 30] }, // mäßig
								{ indexes: [4, 4], amounts: [31, 50] }, // schlecht
								{ indexes: [5, 5], amounts: [51, Number.MAX_VALUE] }, // sehr schlecht
							],
						},
					},
					O3: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 5, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 24] }, // sehr gut
								{ indexes: [2, 2], amounts: [25, 72] }, // gut
								{ indexes: [3, 3], amounts: [73, 144] }, // mäßig
								{ indexes: [4, 4], amounts: [145, 240] }, // schlecht
								{ indexes: [5, 5], amounts: [241, Number.MAX_VALUE] }, // sehr schlecht
							],
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 5, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 10] }, // sehr gut
								{ indexes: [2, 2], amounts: [11, 30] }, // gut
								{ indexes: [3, 3], amounts: [31, 60] }, // mäßig
								{ indexes: [4, 4], amounts: [61, 100] }, // schlecht
								{ indexes: [5, 5], amounts: [101, Number.MAX_VALUE] }, // sehr schlecht
							],
						},
					},
				},
			},
			/**
			 * EAQI (EU) - European Air Quality Index
			 * [ETC HE Report 2024/17: EEA´s revision of the European air quality index bands]{@link https://www.eionet.europa.eu/etcs/etc-he/products/etc-he-products/etc-he-reports/etc-he-report-2024-17-eeas-revision-of-the-european-air-quality-index-bands}
			 */
			EU_EAQI: {
				weatherKitScale: {
					name: "EU.EAQI",
					version: "2414",
				},
				categories: {
					significantIndex: 4, // Poor
					ranges: [
						{ categoryIndex: 1, indexes: [1, 1] }, // Good
						{ categoryIndex: 2, indexes: [2, 2] }, // Fair
						{ categoryIndex: 3, indexes: [3, 3] }, // Moderate
						{ categoryIndex: 4, indexes: [4, 4] }, // Poor
						{ categoryIndex: 5, indexes: [5, 5] }, // Very Poor
						{ categoryIndex: 6, indexes: [6, 6] }, // Extremely Poor
					],
				},
				pollutants: {
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 6, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 5] }, // Good
								{ indexes: [2, 2], amounts: [6, 15] }, // Fair
								{ indexes: [3, 3], amounts: [16, 50] }, // Moderate
								{ indexes: [4, 4], amounts: [51, 90] }, // Poor
								{ indexes: [5, 5], amounts: [91, 140] }, // Very Poor
								{ indexes: [6, 6], amounts: [141, Number.MAX_VALUE] }, // Extremely Poor
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 6, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 15] }, // Good
								{ indexes: [2, 2], amounts: [16, 45] }, // Fair
								{ indexes: [3, 3], amounts: [46, 120] }, // Moderate
								{ indexes: [4, 4], amounts: [121, 195] }, // Poor
								{ indexes: [5, 5], amounts: [196, 270] }, // Very Poor
								{ indexes: [6, 6], amounts: [271, Number.MAX_VALUE] }, // Extremely Poor
							],
						},
					},
					O3: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 6, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 60] }, // Good
								{ indexes: [2, 2], amounts: [61, 100] }, // Fair
								{ indexes: [3, 3], amounts: [101, 120] }, // Moderate
								{ indexes: [4, 4], amounts: [121, 160] }, // Poor
								{ indexes: [5, 5], amounts: [161, 180] }, // Very Poor
								{ indexes: [6, 6], amounts: [181, Number.MAX_VALUE] }, // Extremely Poor
							],
						},
					},
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 6, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 10] }, // Good
								{ indexes: [2, 2], amounts: [11, 25] }, // Fair
								{ indexes: [3, 3], amounts: [26, 60] }, // Moderate
								{ indexes: [4, 4], amounts: [61, 100] }, // Poor
								{ indexes: [5, 5], amounts: [101, 150] }, // Very Poor
								{ indexes: [6, 6], amounts: [151, Number.MAX_VALUE] }, // Extremely Poor
							],
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 1, amount: 0 },
							max: { index: 6, amount: Number.MAX_VALUE },
							value: [
								{ indexes: [1, 1], amounts: [0, 20] }, // Good
								{ indexes: [2, 2], amounts: [21, 40] }, // Fair
								{ indexes: [3, 3], amounts: [41, 125] }, // Moderate
								{ indexes: [4, 4], amounts: [126, 190] }, // Poor
								{ indexes: [5, 5], amounts: [191, 275] }, // Very Poor
								{ indexes: [6, 6], amounts: [276, Number.MAX_VALUE] }, // Extremely Poor
							],
						},
					},
				},
			},
			/**
			 * China AQI standard.
			 * [环境空气质量指数（AQI）技术规定（试行）]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/t20120302_224166.shtml}
			 */
			HJ6332012: {
				weatherKitScale: {
					name: "HJ6332012",
					version: "2414",
				},
				categories: {
					significantIndex: 3, // 轻度污染
					ranges: [
						{ categoryIndex: 1, indexes: [0, 50] }, // 优
						{ categoryIndex: 2, indexes: [51, 100] }, // 良
						{ categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
						{ categoryIndex: 4, indexes: [151, 200] }, // 中度污染
						{ categoryIndex: 5, indexes: [201, 300] }, // 重度污染
						{ categoryIndex: 6, indexes: [301, 500] }, // 严重污染
					],
				},
				pollutants: {
					SO2_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 2602 },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 150] },
								{ indexes: [101, 150], amounts: [151, 475] },
								{ indexes: [151, 200], amounts: [476, 800] },
								{ indexes: [201, 300], amounts: [801, 1600] },
								{ indexes: [301, 400], amounts: [1601, 2100] },
								{ indexes: [401, 500], amounts: [2101, 2602] },
							],
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 200, amount: 800 },
							value: [
								{ indexes: [0, 50], amounts: [0, 150] },
								{ indexes: [51, 100], amounts: [151, 500] },
								{ indexes: [101, 150], amounts: [501, 650] },
								{ indexes: [151, 200], amounts: [651, 800] },
								// 二氧化硫（SO2）1小时平均浓度高于800 ug/m3的，不再进行其空气质量分指数计算，二氧化硫（SO2）空气质量分指数按24小时平均浓度计算的分指数报告。
							],
						},
					},
					NO2_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 940 },
							value: [
								{ indexes: [0, 50], amounts: [0, 40] },
								{ indexes: [51, 100], amounts: [41, 80] },
								{ indexes: [101, 150], amounts: [81, 180] },
								{ indexes: [151, 200], amounts: [181, 280] },
								{ indexes: [201, 300], amounts: [281, 565] },
								{ indexes: [301, 400], amounts: [566, 750] },
								{ indexes: [401, 500], amounts: [751, 940] },
							],
						},
					},
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 3840 },
							value: [
								{ indexes: [0, 50], amounts: [0, 100] },
								{ indexes: [51, 100], amounts: [101, 200] },
								{ indexes: [101, 150], amounts: [201, 700] },
								{ indexes: [151, 200], amounts: [701, 1200] },
								{ indexes: [201, 300], amounts: [1201, 2340] },
								{ indexes: [301, 400], amounts: [2341, 3090] },
								{ indexes: [401, 500], amounts: [3091, 3840] },
							],
						},
					},
					PM10_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 600 },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 150] },
								{ indexes: [101, 150], amounts: [151, 250] },
								{ indexes: [151, 200], amounts: [251, 350] },
								{ indexes: [201, 300], amounts: [351, 420] },
								{ indexes: [301, 400], amounts: [421, 500] },
								{ indexes: [401, 500], amounts: [501, 600] },
							],
						},
					},
					CO_24H: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 60 },
							value: [
								{ indexes: [0, 50], amounts: [0, 2] },
								{ indexes: [51, 100], amounts: [3, 4] },
								{ indexes: [101, 150], amounts: [5, 14] },
								{ indexes: [151, 200], amounts: [15, 24] },
								{ indexes: [201, 300], amounts: [25, 36] },
								{ indexes: [301, 400], amounts: [37, 48] },
								{ indexes: [401, 500], amounts: [49, 60] },
							],
						},
					},
					CO: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 150 },
							value: [
								{ indexes: [0, 50], amounts: [0, 5] },
								{ indexes: [51, 100], amounts: [6, 10] },
								{ indexes: [101, 150], amounts: [11, 35] },
								{ indexes: [151, 200], amounts: [36, 60] },
								{ indexes: [201, 300], amounts: [61, 90] },
								{ indexes: [301, 400], amounts: [91, 120] },
								{ indexes: [401, 500], amounts: [121, 150] },
							],
						},
					},
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 1200 },
							value: [
								{ index: [0, 50], amount: [0, 160] },
								{ index: [51, 100], amount: [161, 200] },
								{ index: [101, 150], amount: [201, 300] },
								{ index: [151, 200], amount: [301, 400] },
								{ index: [201, 300], amount: [401, 800] },
								{ index: [301, 400], amount: [801, 1000] },
								{ index: [401, 500], amount: [1001, 1200] },
							],
						},
					},
					OZONE_8H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 300, amount: 800 },
							value: [
								{ index: [0, 50], amount: [0, 100] },
								{ index: [51, 100], amount: [101, 160] },
								{ index: [101, 150], amount: [161, 215] },
								{ index: [151, 200], amount: [216, 265] },
								{ index: [201, 300], amount: [266, 800] },
								// 臭氧（O3）8小时平均浓度值高于800 ug/m3的，不再进行其空气质量分指数计算，臭氧（O3）空气质量分指数按1小时平均浓度计算的分指数报告。
							],
						},
					},
					PM2_5_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 500 },
							value: [
								{ index: [0, 50], amount: [0, 35] },
								{ index: [51, 100], amount: [36, 75] },
								{ index: [101, 150], amount: [76, 115] },
								{ index: [151, 200], amount: [116, 150] },
								{ index: [201, 300], amount: [151, 250] },
								{ index: [301, 400], amount: [251, 350] },
								{ index: [401, 500], amount: [351, 500] },
							],
						},
					},
				},
			},
			/**
			 * US AQI standard, not equal to NowCast.
			 * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI) (EPA 454/B-24-002, May 2024)]{@link https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf}
			 */
			EPA_NowCast: {
				weatherKitScale: {
					name: "EPA_NowCast",
					version: "2414",
				},
				categories: {
					significantIndex: 3, // Unhealthy for Sensitive Groups
					ranges: [
						{ categoryIndex: 1, indexes: [0, 50] }, // Good
						{ categoryIndex: 2, indexes: [51, 100] }, // Moderate
						{ categoryIndex: 3, indexes: [101, 150] }, // Unhealthy for Sensitive Groups
						{ categoryIndex: 4, indexes: [151, 200] }, // Unhealthy
						{ categoryIndex: 5, indexes: [201, 300] }, // Very Unhealthy
						{ categoryIndex: 6, indexes: [301, Number.MAX_SAFE_INTEGER] }, // Hazardous
					],
				},
				pollutants: {
					OZONE_8H: {
						units: "PARTS_PER_MILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 300, amount: 0.2 },
							value: [
								{ index: [0, 50], value: [0, 0.054] }, // Good
								{ index: [51, 100], value: [0.055, 0.07] }, // Moderate
								{ index: [101, 150], value: [0.071, 0.085] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [0.086, 0.105] }, // Unhealthy
								{ index: [201, 300], value: [0.106, 0.2] }, // Very Unhealthy
								// Note 2:
								// 8-hour O3 values do not define higher AQI values (≥ 301).
								// AQI values of 301 or higher are calculated with 1-hour O3 concentrations.
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [0.201, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					OZONE: {
						units: "PARTS_PER_MILLION",
						ranges: {
							min: { index: 101, amount: 0.125 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								// Note 1:
								// Areas are generally required to report the AQI based on 8-hour O3 values. However,
								// there are a small number of areas where an AQI based on 1-hour O3 values would be more precautionary.
								// In these cases, in addition to calculating the 8-hour O3 index value,
								// the 1-hour O3 value may be calculated, and the maximum of the two values reported.
								{ index: [101, 150], value: [0.125, 0.164] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [0.165, 0.204] }, // Unhealthy
								{ index: [201, 300], value: [0.205, 0.404] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [0.405, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					PM2_5_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0.0, 9.0] }, // Good
								{ index: [51, 100], value: [9.1, 35.4] }, // Moderate
								{ index: [101, 150], value: [35.5, 55.4] }, // Unhealthy for Sensitive Groups
								// Note 3 of PM2.5 can be found in EPA 454/B-18-007:
								// If a different SHL for PM2.5 is promulgated, these numbers will change accordingly.
								//
								// It is believed that they forgot to remove this note
								{ index: [151, 200], value: [55.5, 125.4] }, // Unhealthy
								{ index: [201, 300], value: [125.5, 225.4] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [225.5, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					PM10_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 54] }, // Good
								{ index: [51, 100], value: [55, 154] }, // Moderate
								{ index: [101, 150], value: [155, 254] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [255, 354] }, // Unhealthy
								{ index: [201, 300], value: [355, 424] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [425, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					CO_8H: {
						units: "PARTS_PER_MILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0.0, 4.4] }, // Good
								{ index: [51, 100], value: [4.5, 9.4] }, // Moderate
								{ index: [101, 150], value: [9.5, 12.4] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [12.5, 15.4] }, // Unhealthy
								{ index: [201, 300], value: [15.5, 30.4] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [30.5, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					SO2: {
						units: "PARTS_PER_BILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 35] }, // Good
								{ index: [51, 100], value: [36, 75] }, // Moderate
								{ index: [101, 150], value: [76, 185] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [186, 304] }, // Unhealthy
								// Note 3 of SO2:
								// 1-hour SO2 values do not define higher AQI values (≥ 200).
								// AQI values of 200 or greater are calculated with 24-hour SO2 concentrations.
								//
								// It is believed that they forgot to remove this note
								{ index: [201, 300], value: [305, 604] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [605, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					NO2: {
						units: "PARTS_PER_BILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 53] }, // Good
								{ index: [51, 100], value: [54, 100] }, // Moderate
								{ index: [101, 150], value: [101, 360] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [361, 649] }, // Unhealthy
								{ index: [201, 300], value: [650, 1249] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [1250, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
				},
			},
			/**
			 * WAQI InstantCast in EPA_NowCast. Basically is a method to calculate indexes based on 1-hour pollutants.
			 * [A Beginner's Guide to Air Quality Instant-Cast and Now-Cast.]{@link https://aqicn.org/faq/2015-03-15/air-quality-nowcast-a-beginners-guide/}
			 * [Ozone AQI Scale update]{@link https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/}
			 */
			WAQI_InstantCast_US: {
				weatherKitScale: {
					name: "EPA_NowCast",
					version: "2414",
				},
				categories: {
					significantIndex: 3, // Unhealthy for Sensitive Groups
					ranges: [
						{ categoryIndex: 1, indexes: [0, 50] }, // Good
						{ categoryIndex: 2, indexes: [51, 100] }, // Moderate
						{ categoryIndex: 3, indexes: [101, 150] }, // Unhealthy for Sensitive Groups
						{ categoryIndex: 4, indexes: [151, 200] }, // Unhealthy
						{ categoryIndex: 5, indexes: [201, 300] }, // Very Unhealthy
						{ categoryIndex: 6, indexes: [301, Number.MAX_SAFE_INTEGER] }, // Hazardous
					],
				},
				// Eventually we will convert it to ppb
				pollutants: {
					// [Ozone AQI Scale update](https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/)
					OZONE: {
						units: "PARTS_PER_BILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 61.5] }, // Good
								{ index: [51, 100], value: [62.5, 100.5] }, // Moderate
								{ index: [101, 150], value: [101.5, 151.5] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [152.5, 204] }, // Unhealthy
								{ index: [201, 300], value: [205, 404] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [405, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					SO2: {
						units: "PARTS_PER_BILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 35] }, // Good
								{ index: [51, 100], value: [36, 75] }, // Moderate
								{ index: [101, 150], value: [76, 185] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [186, 304] }, // Unhealthy
								{ index: [201, 300], value: [305, 604] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [605, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					NO2: {
						units: "PARTS_PER_BILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 53] }, // Good
								{ index: [51, 100], value: [54, 100] }, // Moderate
								{ index: [101, 150], value: [101, 360] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [361, 649] }, // Unhealthy
								{ index: [201, 300], value: [650, 1249] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [1250, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0.0, 9.0] }, // Good
								{ index: [51, 100], value: [9.1, 35.4] }, // Moderate
								{ index: [101, 150], value: [35.5, 55.4] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [55.5, 125.4] }, // Unhealthy
								{ index: [201, 300], value: [125.5, 225.4] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [225.5, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0, 54] }, // Good
								{ index: [51, 100], value: [55, 154] }, // Moderate
								{ index: [101, 150], value: [155, 254] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [255, 354] }, // Unhealthy
								{ index: [201, 300], value: [355, 424] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [425, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
					CO: {
						units: "PARTS_PER_BILLION",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: Number.MAX_SAFE_INTEGER, amount: Number.MAX_VALUE },
							value: [
								{ index: [0, 50], value: [0.0, 4400] }, // Good
								{ index: [51, 100], value: [4401, 9400] }, // Moderate
								{ index: [101, 150], value: [9401, 12400] }, // Unhealthy for Sensitive Groups
								{ index: [151, 200], value: [12401, 15400] }, // Unhealthy
								{ index: [201, 300], value: [15401, 30400] }, // Very Unhealthy
								{ index: [301, Number.MAX_SAFE_INTEGER], value: [30401, Number.MAX_VALUE] }, // Hazardous
							],
						},
					},
				},
			},
			/**
			 * WAQI InstantCast in HJ6332012. Basically is a method to calculate indexes based on 1-hour pollutants.
			 */
			WAQI_InstantCast_CN: {
				weatherKitScale: {
					name: "HJ6332012",
					version: "2414",
				},
				categories: {
					significantIndex: 3, // 轻度污染
					ranges: [
						{ categoryIndex: 1, indexes: [0, 50] }, // 优
						{ categoryIndex: 2, indexes: [51, 100] }, // 良
						{ categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
						{ categoryIndex: 4, indexes: [151, 200] }, // 中度污染
						{ categoryIndex: 5, indexes: [201, 300] }, // 重度污染
						{ categoryIndex: 6, indexes: [301, 500] }, // 严重污染
					],
				},
				pollutants: {
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 2602 },
							value: [
								{ index: [0, 50], value: [0, 150] },
								{ index: [51, 100], value: [151, 500] },
								{ index: [101, 150], value: [501, 650] },
								{ index: [151, 200], value: [651, 800] },
								{ index: [201, 300], value: [801, 1600] },
								{ index: [301, 400], value: [1601, 2100] },
								{ index: [401, 500], value: [2101, 2602] },
							],
						},
					},
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 3840 },
							value: [
								{ index: [0, 50], value: [0, 100] },
								{ index: [51, 100], value: [101, 200] },
								{ index: [101, 150], value: [201, 700] },
								{ index: [151, 200], value: [701, 1200] },
								{ index: [201, 300], value: [1201, 2340] },
								{ index: [301, 400], value: [2341, 3090] },
								{ index: [401, 500], value: [3091, 3840] },
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 600 },
							value: [
								{ index: [0, 50], value: [0, 50] },
								{ index: [51, 100], value: [51, 150] },
								{ index: [101, 150], value: [151, 250] },
								{ index: [151, 200], value: [251, 350] },
								{ index: [201, 300], value: [351, 420] },
								{ index: [301, 400], value: [421, 500] },
								{ index: [401, 500], value: [501, 600] },
							],
						},
					},
					CO: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 150 },
							value: [
								{ index: [0, 50], value: [0, 5] },
								{ index: [51, 100], value: [6, 10] },
								{ index: [101, 150], value: [11, 35] },
								{ index: [151, 200], value: [36, 60] },
								{ index: [201, 300], value: [61, 90] },
								{ index: [301, 400], value: [91, 120] },
								{ index: [401, 500], value: [121, 150] },
							],
						},
					},
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 1200 },
							value: [
								{ index: [0, 50], value: [0, 160] },
								{ index: [51, 100], value: [161, 200] },
								{ index: [101, 150], value: [201, 300] },
								{ index: [151, 200], value: [301, 400] },
								{ index: [201, 300], value: [401, 800] },
								{ index: [301, 400], value: [801, 1000] },
								{ index: [401, 500], value: [1001, 1200] },
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						ranges: {
							min: { index: 0, amount: 0 },
							max: { index: 500, amount: 500 },
							value: [
								{ index: [0, 50], value: [0, 35] },
								{ index: [51, 100], value: [36, 75] },
								{ index: [101, 150], value: [76, 115] },
								{ index: [151, 200], value: [116, 150] },
								{ index: [201, 300], value: [151, 250] },
								{ index: [301, 400], value: [251, 350] },
								{ index: [401, 500], value: [351, 500] },
							],
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
		Units: {
			MICROGRAMS_PER_CUBIC_METER: "μg/m3",
			"μg/m3": "MICROGRAMS_PER_CUBIC_METER",
			MILLIGRAMS_PER_CUBIC_METER: "mg/m3",
			"mg/m3": "MILLIGRAMS_PER_CUBIC_METER",
			ppb: "PARTS_PER_BILLION",
			PARTS_PER_BILLION: "ppb",
			ppm: "PARTS_PER_MILLION",
			PARTS_PER_MILLION: "ppm",
		},
		/**
		 * Standard Conditions for Temperature and Pressure
		 * [Ozone AQI: Using concentrations in milligrams or ppb?]{@link https://aqicn.org/faq/2015-09-06/ozone-aqi-using-concentrations-in-milligrams-or-ppb/}
		 * [Understanding Units of Measurement - Terrie K. Boguski, P.E. (CHSR)]{@link https://cfpub.epa.gov/ncer_abstracts/index.cfm/fuseaction/display.files/fileid/14285}
		 * 
		 * (amount * 12.187 * molecularWeight) / (temperatureInCelsius + 273.15)
		 * 
		 * - 12.187 is the inverse of gas constant.
		 * - 273.15 is the 0 celsius in kelvin.
		 * - temperatureInCelsius is 25 in US, 20 in EU.
		 */
		STP: {
			US: {
				OZONE: 1.962, // 48 g/mol
				SO2: 2.616, // 64 g/mol
				NO2: 1.8802, // 46 g/mol
				CO: 1.1445, // 28 g/mol
			},
			EU: {
				OZONE: 1.9954, // 48 g/mol
				SO2: 2.6606, // 64 g/mol
				NO2: 1.9123, // 46 g/mol
				CO: 1.164, // 28 g/mol
			},
		},
	};

	static #Pollutants(pollutants = [], scale = "WAQI_InstantCast") {
		Console.info("☑️ Pollutants", `scale: ${scale}`);
		pollutants = pollutants.map(pollutant => {
			// Convert unit based on standard
			const PollutantStandard = AirQuality.Config.Scales[scale].pollutants[pollutant.pollutantType];
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
			pollutant.category = AirQuality.Config.Scales[scale].categoryIndex[categoryIndexKey];
			pollutant.AQI = Math.round(((pollutant.category[1] - pollutant.category[0]) * (pollutant.convertedAmount - pollutant.range[0])) / (pollutant.range[1] - pollutant.range[0]) + pollutant.category[0]);
			return pollutant;
		});
		//Console.debug(`pollutants: ${JSON.stringify(pollutants, null, 2)}`);
		Console.info("✅ Pollutants");
		return pollutants;
	}

	static #ConvertUnit(amount, unitFrom, unitTo, ppxToXGM3Value = -1) {
		Console.info("☑️ ConvertUnit");
		Console.debug(`form: ${amount} ${AirQuality.Config.Units[unitFrom]}`);
		Console.debug(`ppxToXGM3Value: ${ppxToXGM3Value}`);
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
		Console.debug(`to: ${amount} ${AirQuality.Config.Units[unitTo]}`);
		Console.info("✅ ConvertUnit");
		return amount;
	}
}
