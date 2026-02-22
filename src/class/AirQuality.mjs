import { Console } from "@nsnanocat/util";
import SimplePrecisionMath from "./SimplePrecisionMath.mjs";

export default class AirQuality {
	static Name = "AirQuality";
	static Version = "3.1.0";
	static Author = "Virgil Clyne & Wordless Echo";

	// Code by Claude
	static #CeilByPrecision(a, b) {
		// 获取 b 的小数位数
		const decimals = (b.toString().split(".")[1] || "").length;

		// 根据小数位数计算倍数
		const multiplier = 10 ** decimals;

		// 向上取整
		return Math.ceil(a * multiplier) / multiplier;
	}

	/**
	 * 根据 AQI 数值定位其所属的分类等级（categoryIndex）。
	 *
	 * 作用：
	 * - 在给定的 categories.ranges 中查找 index 落入的区间；
	 * - 返回该区间对应的 categoryIndex，供主污染物判断与展示层分级使用。
	 *
	 * @param {number} index
	 * 待判定的 AQI 指数值。
	 *
	 * @param {{
	 *   ranges?: Array<{ categoryIndex: number, indexes: [number, number] }>
	 * }} categories
	 * 分类配置对象。
	 * - ranges[*].indexes 为 [min, max] 区间；
	 * - 使用 #CeilByPrecision 处理小数精度后再进行区间比较。
	 *
	 * @returns {number}
	 * 命中的 categoryIndex；若 categories 无效或未命中区间，返回 -1。
	 */

	static CategoryIndex(index, categories) {
		Console.info("☑️ CategoryIndex", `index: ${index}`);

		const failedCategoryIndex = -1;

		if (!categories?.ranges || !Array.isArray(categories.ranges) || categories.ranges.length === 0) {
			Console.debug(`categories: ${JSON.stringify(categories)}`);
			Console.error("GetPrimaryPollutant", "categories无效");
			return failedCategoryIndex;
		}

		const range = categories.ranges.find(({ indexes }) => {
			const [min, max] = indexes;
			return AirQuality.#CeilByPrecision(index, min) >= min && AirQuality.#CeilByPrecision(index, max) <= max;
		});
		if (!range) {
			Console.error("CategoryIndex", `找不到index: ${index}对应的category`);
			return failedCategoryIndex;
		}

		const { categoryIndex } = range;
		Console.info("✅ CategoryIndex", `categoryIndex: ${categoryIndex}`);
		return categoryIndex;
	}

	static CompareCategoryIndexes(todayCategoryIndex, yesterdayCategoryIndex) {
		Console.info("☑️ CompareCategoryIndexes", `todayCategoryIndex: ${todayCategoryIndex}`, `yesterdayCategoryIndex: ${yesterdayCategoryIndex}`);

		const { UNKNOWN, SAME, WORSE, BETTER } = AirQuality.Config.CompareCategoryIndexes;
		const diff = Number(todayCategoryIndex) - Number(yesterdayCategoryIndex);

		if (Number.isNaN(diff)) {
			Console.error("CompareCategoryIndexes", "categoryIndex无效");
			return UNKNOWN;
		} else {
			if (diff === 0) {
				Console.info("✅ CompareCategoryIndexes");
				return SAME;
			} else if (diff > 0) {
				Console.info("✅ CompareCategoryIndexes");
				return WORSE;
			} else {
				Console.info("✅ CompareCategoryIndexes");
				return BETTER;
			}
		}
	}

	static ConvertUnits(pollutants, stpConversionFactors, pollutantScales) {
		Console.info("☑️ ConvertUnits");

		const friendlyUnits = AirQuality.Config.Units.Friendly;

		const convertedPollutants = pollutants.map(pollutant => {
			const { pollutantType } = pollutant;
			const pollutantScale = pollutantScales[pollutantType];

			if (!pollutantScale) {
				Console.info("ConvertUnits", `No scale for ${pollutantType}, skip`);
				return pollutant;
			}

			Console.info("ConvertUnits", `Converting ${pollutantType}`);
			const amount = AirQuality.ConvertUnit(pollutant.amount, pollutant.units, pollutantScale.units, stpConversionFactors?.[pollutantType] || -1, pollutantScale?.stpConversionFactor || -1);
			if (amount < 0) {
				Console.error(
					"ConvertUnits",
					`无法转换${pollutantType}的单位`,
					`${pollutant.amount} ${friendlyUnits[pollutant.units] ?? pollutant.units} (STP conversion factor: ${stpConversionFactors?.[pollutantType] || -1}) -> ${amount} ${friendlyUnits[pollutantScale.units] ?? pollutantScale.units} (STP conversion factor: ${pollutantScale?.stpConversionFactor || -1})`,
				);
				return pollutant;
			}

			Console.info("ConvertUnits", `Converted ${pollutantType}: ${amount} ${friendlyUnits[pollutantScale.units] ?? pollutantScale.units}`);
			return { ...pollutant, amount, units: pollutantScale.units };
		});
		Console.info("✅ ConvertUnits");
		return convertedPollutants;
	}

	/**
	 * 修复和风天气一氧化碳（CO）数据过小的问题。
	 * 和风天气的CO数据单位实际上为mg/m3，将数值乘1000转为WeatherKit的µg/m3单位。
	 */
	static FixQWeatherCO(airQuality) {
		Console.info("☑️ FixQWeatherCO");

		if (!Array.isArray(airQuality?.pollutants)) {
			Console.error("FixQWeatherCO", "无效的airQuality.pollutants");
			return airQuality;
		}

		switch (airQuality?.metadata?.providerName) {
			case "和风天气":
			case "QWeather": {
				const fixedAirQuality = {
					...airQuality,
					pollutants: airQuality.pollutants.map(pollutant => {
						const { pollutantType, amount } = pollutant;
						const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
						return {
							...pollutant,
							amount: pollutantType === "CO" ? AirQuality.ConvertUnit(amount, mgm3, ugm3) : amount,
						};
					}),
				};

				Console.info("✅ FixQWeatherCO");
				return fixedAirQuality;
			}
			default: {
				Console.info("✅ FixQWeatherCO", `Provider ${airQuality?.metadata?.providerName} is no need to fix.`);
				return airQuality;
			}
		}
	}

	static #GetStpConversionFactors(airQuality) {
		Console.info("☑️ GetStpConversionFactors");

		const { US } = AirQuality.Config.STP_ConversionFactors;
		switch (airQuality?.metadata?.providerName) {
			case "和风天气":
			case "BreezoMeter":
			default: {
				Console.info("✅ GetStpConversionFactors", `STP conversion factors for ${airQuality?.metadata?.providerName}: US`);
				return US;
			}
		}
	}

	static Pollutants2AQI(airQuality, Settings, options = {}) {
		Console.info("☑️ Pollutants2AQI");
		const algorithm = options?.algorithm ?? Settings?.AirQuality?.Calculate?.Algorithm;
		const forcePrimaryPollutant = options?.forcePrimaryPollutant ?? Settings?.AirQuality?.Current?.Index?.ForceCNPrimaryPollutants;
		const allowOverRange = options?.allowOverRange ?? Settings?.AirQuality?.Calculate?.AllowOverRange;

		const { pollutants } = airQuality;
		const stpConversionFactors = AirQuality.#GetStpConversionFactors(airQuality);
		const scale = AirQuality.Config.Scales[algorithm] ?? AirQuality.Config.Scales.UBA;

		switch (algorithm) {
			case "None": {
				return airQuality;
			}
			case "EU_EAQI": {
				// PollutantsToEAQI
				Console.info("☑️ PollutantsToEAQI");
				airQuality = AirQuality.#PollutantsToAirQuality(pollutants, scale, { stpConversionFactors, allowOverRange: false });
				Console.info("✅ PollutantsToEAQI");
				break;
			}
			case "WAQI_InstantCast_US": {
				// PollutantsToInstantCastUS
				Console.info("☑️ PollutantsToInstantCastUS", `allowOverRange: ${allowOverRange}`);
				airQuality = AirQuality.#PollutantsToAirQuality(pollutants, scale, { stpConversionFactors, allowOverRange });
				Console.info("✅ PollutantsToInstantCastUS");
				break;
			}
			case "WAQI_InstantCast_CN":
			case "WAQI_InstantCast_CN_25_DRAFT": {
				// PollutantsToInstantCastCN12 / PollutantsToInstantCastCN25 / #PollutantsToInstantCastCN
				Console.info("☑️ PollutantsToInstantCastCN", `allowOverRange: ${allowOverRange}`, `forcePrimaryPollutant: ${forcePrimaryPollutant}`);
				airQuality = AirQuality.#PollutantsToAirQuality(pollutants, scale, { stpConversionFactors, allowOverRange });

				const isNotAvailable = !forcePrimaryPollutant && airQuality.index <= 50;
				if (isNotAvailable) {
					Console.info("PollutantsToInstantCastCN", `Max index of pollutants ${airQuality.primaryPollutant} = ${airQuality.index} is <= 50, primaryPollutant will be set to NOT_AVAILABLE.`);
				}

				airQuality = {
					...airQuality,
					primaryPollutant: isNotAvailable ? "NOT_AVAILABLE" : airQuality.primaryPollutant,
				};
				Console.info("✅ PollutantsToInstantCastCN");
				break;
			}
			case "UBA":
			default: {
				// PollutantsToUBA
				Console.info("☑️ PollutantsToUBA");
				airQuality = AirQuality.#PollutantsToAirQuality(pollutants, scale, { stpConversionFactors, allowOverRange: true });
				airQuality = {
					...airQuality,
					index: airQuality.categoryIndex,
				};
				Console.info("✅ PollutantsToUBA");
				break;
			}
		}

		Console.info("✅ Pollutants2AQI");
		return airQuality;
	}

	static ConvertPollutants(airQuality, injectedPollutants, needInjectIndex, injectedIndex, Settings) {
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

		const replaceUnits = Settings?.AirQuality?.Current?.Pollutants?.Units?.Replace ?? [];
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

				return AirQuality.ConvertUnits(pollutants, AirQuality.#GetStpConversionFactors(airQuality), getPollutantScales(scale.pollutants));
			}
		} else {
			return pollutants;
		}
	}

	static ToWeatherKitScale = ({ name, version }) => `${name}.${version}`;
	static GetNameFromScale(scale) {
		Console.info("☑️ GetNameFromScale", `scale: ${scale}`);

		const lastDotIndex = scale?.lastIndexOf(".");
		if (!scale || lastDotIndex === -1) {
			Console.error("GetNameFromScale", `无法找到${scale}的版本号`);
			return scale;
		}

		const scaleName = scale.substring(0, lastDotIndex);
		Console.info("✅ GetNameFromScale", `scaleName: ${scaleName}`);
		return scaleName;
	}

	/**
	 * 将污染物浓度映射为对应标准下的污染物指数（index）。
	 *
	 * 作用：
	 * 1) 按 pollutantScales 定义，逐个污染物查找浓度区间；
	 * 2) 使用线性插值计算该污染物的 index；
	 * 3) 返回用于后续主污染物判定的一组 { pollutantType, index }。
	 *
	 * @param {Array<{pollutantType: string, amount: number, units: string}>} pollutants
	 * 污染物列表。
	 * - amount 的单位由 units 字段表示（如 µg/m³、mg/m³、ppb、ppm）。
	 * - 进入该方法前应已与 pollutantScales 的目标单位对齐。
	 *
	 * @param {Record<string, {
	 *   units: string,
	 *   ranges: {
	 *     min: { indexes: [number, number], amounts: [number, number] },
	 *     max: { indexes: [number, number], amounts: [number, number] },
	 *     value: Array<{ indexes: [number, number], amounts: [number, number] }>
	 *   }
	 * }>} pollutantScales
	 * 指标标准定义，包含每种污染物的单位及分段阈值。
	 *
	 * @returns {Array<{pollutantType: string, index: number}>}
	 * 每种标准污染物对应的 index 列表。
	 * - 若标准所需污染物缺失，返回该污染物 index=-1；
	 * - 若浓度低于最小有效阈值，返回 min.indexes[0]；
	 * - 若浓度超上限，使用 max 区间进行外推并记录告警。
	 */

	static #PollutantsToIndexes(pollutants, pollutantScales) {
		const { add, subtract, multiply, divide } = SimplePrecisionMath;
		const friendlyUnits = AirQuality.Config.Units.Friendly;

		return Object.entries(pollutantScales).map(([pollutantType, pollutantScale]) => {
			const pollutant = pollutants.find(pollutant => pollutant.pollutantType === pollutantType);

			if (!pollutant) {
				Console.warn("PollutantsToIndexes", `没有找到标准所需的污染物${pollutantType}，结果可能不准确`);
				return { pollutantType, index: -1 };
			}

			const { amount } = pollutant;
			Console.debug(`${pollutantType}: ${amount} ${friendlyUnits[pollutant.units] ?? pollutant.units}`);

			const minValidAmount = pollutantScale.ranges.min.amounts[0];
			if (amount < minValidAmount) {
				Console.error("PollutantsToIndexes", `${pollutantType}的含量无效：${amount} ${friendlyUnits[pollutantScale.units]}需要 >= ${minValidAmount}`);
				return pollutantScale.ranges.min.indexes[0];
			}

			const isOverRange = amount > pollutantScale.ranges.max.amounts[1];
			if (isOverRange) {
				Console.warn("PollutantsToIndexes", `检测到爆表指数！${pollutantType}：${amount} ${friendlyUnits[pollutantScale.units]}`);
				Console.warn("PollutantsToIndexes", "注意身体！");
			}

			// Use range before infinity for calculation if over range
			const { indexes, amounts } = isOverRange
				? pollutantScale.ranges.max
				: pollutantScale.ranges.value.find(({ amounts }) => {
						const [minAmount, maxAmount] = amounts;
						return AirQuality.#CeilByPrecision(amount, minAmount) >= minAmount && AirQuality.#CeilByPrecision(amount, maxAmount) <= maxAmount;
					});
			Console.debug(`indexes: ${JSON.stringify(indexes)}`, `amounts: ${JSON.stringify(amounts)}`);

			const [minIndex, maxIndex] = indexes;
			const [minAmount, maxAmount] = amounts;
			// (((maxIndex - minIndex) / (maxAmount - minAmount)) * (amount - minAmount)) + (amount > maxAmount ? maxIndex : minIndex)
			const index = add(
				// ((maxIndex - minIndex) / (maxAmount - minAmount)) * (amount - minAmount)
				multiply(
					// (maxIndex - minIndex) / (maxAmount - minAmount)
					divide(subtract(maxIndex, minIndex), subtract(maxAmount, minAmount)),
					// (amount - minAmount)
					subtract(amount, minAmount),
				),
				// Use max index as base if over range
				amount > maxAmount ? maxIndex : minIndex,
			);
			return { pollutantType, index };
		});
	}

	static GetPrimaryPollutant(indexes, categories) {
		Console.info("☑️ GetPrimaryPollutant");
		const failedPollutant = { pollutantType: "NOT_AVAILABLE", index: -1, categoryIndex: -1 };

		if (!Array.isArray(indexes) || indexes.length === 0) {
			Console.debug(`indexes: ${JSON.stringify(indexes)}`);
			Console.error("GetPrimaryPollutant", "indexes无效");
			return failedPollutant;
		}

		const indexesWithCategory = indexes
			.filter(({ index }) => Number.isFinite(index))
			.map(pollutant => ({
				...pollutant,
				categoryIndex: AirQuality.CategoryIndex(pollutant.index, categories),
			}))
			.sort((a, b) => b.index - a.index);

		if (indexesWithCategory.length === 0) {
			Console.debug(`indexes: ${JSON.stringify(indexes)}`, `indexesWithCategory: ${JSON.stringify(indexesWithCategory)}`);
			Console.error("GetPrimaryPollutant", "找不到有效的index");
			return failedPollutant;
		}

		const maxCategoryIndex = indexesWithCategory.reduce((max, { categoryIndex }) => (categoryIndex > max ? categoryIndex : max), Number.NEGATIVE_INFINITY);
		const primaryPollutants = indexesWithCategory.filter(({ categoryIndex }) => categoryIndex === maxCategoryIndex);

		if (primaryPollutants.length > 1) {
			Console.warn("GetPrimaryPollutant", `检测到多个同级别的污染物，maxCategoryIndex：${maxCategoryIndex}`);
			primaryPollutants.map(({ pollutantType, index }) => Console.warn("GetPrimaryPollutants", `${pollutantType}：${index}`));
		}

		const primaryPollutant = primaryPollutants[0];
		Console.info("✅ GetPrimaryPollutant", `primaryPollutant: ${JSON.stringify(primaryPollutant)}`);
		return primaryPollutant;
	}

	/**
	 * 将污染物浓度转换为统一 airQuality 结构。
	 *
	 * 作用：
	 * 1) 按 scale 定义将污染物转换到目标单位（可选）；
	 * 2) 计算各污染物指数并确定主污染物；
	 * 3) 产出 WeatherKit 风格 airQuality，并按需执行 index 上限裁剪。
	 *
	 * @param {Array<{pollutantType: string, amount: number, units: string}>} pollutants
	 * 原始污染物数组。
	 * - amount 的物理单位由每个元素的 units 字段决定（如 µg/m³、mg/m³、ppb、ppm）。
	 *
	 * @param {{
	 *   weatherKitScale: {name: string, version: string, maxIndex?: number},
	 *   pollutants: Record<string, {units: string, stpConversionFactor?: number, ranges: any}>,
	 *   categories: {significantIndex: number, ranges: Array<{categoryIndex: number, indexes: number[]}>}
	 * }} scale
	 * AQI 标准配置。
	 * - scale.pollutants[*].units 为目标单位。
	 * - scale.weatherKitScale.maxIndex 为可选 index 上限。
	 *
	 * @param {{
	 *   stpConversionFactors?: Record<string, number>,
	 *   allowOverRange?: boolean
	 * }} [options]
	 * 计算选项。
	 * - stpConversionFactors：单位换算因子表（无量纲）。提供时会先执行单位转换。
	 * - allowOverRange：是否允许 index 超出 maxIndex；默认 true。
	 *
	 * @returns {{
	 *   index: number,
	 *   isSignificant: boolean,
	 *   categoryIndex: number,
	 *   pollutants: Array<{pollutantType: string, amount: number, units: string}>,
	 *   metadata: {providerName: string, temporarilyUnavailable: boolean},
	 *   primaryPollutant: string,
	 *   scale: string
	 * } | {metadata: {providerName: string, temporarilyUnavailable: boolean}}}
	 * 返回标准化 airQuality；当输入无效时返回 temporarilyUnavailable 结果。
	 */
	static #PollutantsToAirQuality(pollutants, scale, options = {}) {
		Console.info("☑️ PollutantsToAirQuality");
		const stpConversionFactors = options?.stpConversionFactors;
		const allowOverRange = options?.allowOverRange ?? true;

		if (!Array.isArray(pollutants) || pollutants.length === 0) {
			Console.debug(`pollutants: ${JSON.stringify(pollutants)}`);
			Console.error("PollutantsToAirQuality", "pollutants无效");
			return { metadata: { providerName: "iRingo", temporarilyUnavailable: true } };
		}

		const convertedPollutants = stpConversionFactors ? AirQuality.ConvertUnits(pollutants, stpConversionFactors, scale.pollutants) : pollutants;

		const indexes = AirQuality.#PollutantsToIndexes(convertedPollutants, scale.pollutants);
		Console.debug("PollutantsToAirQuality", `indexes: ${JSON.stringify(indexes)}`);

		const primaryPollutant = AirQuality.GetPrimaryPollutant(indexes, scale.categories);
		const maxIndex = scale?.weatherKitScale?.maxIndex;
		const index = allowOverRange || !Number.isFinite(maxIndex) ? Math.round(primaryPollutant.index) : Math.min(Math.round(primaryPollutant.index), maxIndex);
		Console.info("✅ PollutantsToAirQuality");
		return {
			index,
			isSignificant: primaryPollutant.categoryIndex >= scale.categories.significantIndex,
			categoryIndex: primaryPollutant.categoryIndex,
			pollutants: convertedPollutants,
			metadata: { providerName: "iRingo", temporarilyUnavailable: false },
			primaryPollutant: primaryPollutant.pollutantType,
			scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
		};
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
				// Indexes below for calculation only, not for display
				categories: {
					significantIndex: 4, // schlecht
					ranges: [
						{ categoryIndex: 1, indexes: [0, 0.99] }, // sehr gut
						{ categoryIndex: 2, indexes: [1, 1.99] }, // gut
						{ categoryIndex: 3, indexes: [2, 2.99] }, // mäßig
						{ categoryIndex: 4, indexes: [3, 3.99] }, // schlecht
						{ categoryIndex: 5, indexes: [4, Number.POSITIVE_INFINITY] }, // sehr schlecht
					],
				},
				pollutants: {
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 0.99], amounts: [0, 10] },
							max: { indexes: [3, 3.99], amounts: [61, 100] },
							value: [
								{ indexes: [0, 0.99], amounts: [0, 10] }, // sehr gut
								{ indexes: [1, 1.99], amounts: [11, 30] }, // gut
								{ indexes: [2, 2.99], amounts: [31, 60] }, // mäßig
								{ indexes: [3, 3.99], amounts: [61, 100] }, // schlecht
								{ indexes: [4, Number.POSITIVE_INFINITY], amounts: [101, Number.POSITIVE_INFINITY] }, // sehr schlecht
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 0.99], amounts: [0, 9] },
							max: { indexes: [3, 3.99], amounts: [55, 90] },
							value: [
								{ indexes: [0, 0.99], amounts: [0, 9] }, // sehr gut
								{ indexes: [1, 1.99], amounts: [10, 27] }, // gut
								{ indexes: [2, 2.99], amounts: [28, 54] }, // mäßig
								{ indexes: [3, 3.99], amounts: [55, 90] }, // schlecht
								{ indexes: [4, Number.POSITIVE_INFINITY], amounts: [91, Number.POSITIVE_INFINITY] }, // sehr schlecht
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 0.99], amounts: [0, 5] },
							max: { indexes: [3, 3.99], amounts: [31, 50] },
							value: [
								{ indexes: [0, 0.99], amounts: [0, 5] }, // sehr gut
								{ indexes: [1, 1.99], amounts: [6, 15] }, // gut
								{ indexes: [2, 2.99], amounts: [16, 30] }, // mäßig
								{ indexes: [3, 3.99], amounts: [31, 50] }, // schlecht
								{ indexes: [4, Number.POSITIVE_INFINITY], amounts: [51, Number.POSITIVE_INFINITY] }, // sehr schlecht
							],
						},
					},
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 0.99], amounts: [0, 24] },
							max: { indexes: [3, 3.99], amounts: [145, 240] },
							value: [
								{ indexes: [0, 0.99], amounts: [0, 24] }, // sehr gut
								{ indexes: [1, 1.99], amounts: [25, 72] }, // gut
								{ indexes: [2, 2.99], amounts: [73, 144] }, // mäßig
								{ indexes: [3, 3.99], amounts: [145, 240] }, // schlecht
								{ indexes: [4, Number.POSITIVE_INFINITY], amounts: [241, Number.POSITIVE_INFINITY] }, // sehr schlecht
							],
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 0.99], amounts: [0, 10] },
							max: { indexes: [3, 3.99], amounts: [61, 100] },
							value: [
								{ indexes: [0, 0.99], amounts: [0, 10] }, // sehr gut
								{ indexes: [1, 1.99], amounts: [11, 30] }, // gut
								{ indexes: [2, 2.99], amounts: [31, 60] }, // mäßig
								{ indexes: [3, 3.99], amounts: [61, 100] }, // schlecht
								{ indexes: [4, Number.POSITIVE_INFINITY], amounts: [101, Number.POSITIVE_INFINITY] }, // sehr schlecht
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
					maxIndex: 60,
				},
				// Indexes below for calculation only, not for display
				categories: {
					significantIndex: 4, // Poor
					ranges: [
						{ categoryIndex: 1, indexes: [0, 9] }, // Good
						{ categoryIndex: 2, indexes: [10, 19] }, // Fair
						{ categoryIndex: 3, indexes: [20, 29] }, // Moderate
						{ categoryIndex: 4, indexes: [30, 39] }, // Poor
						{ categoryIndex: 5, indexes: [40, 49] }, // Very Poor
						{ categoryIndex: 6, indexes: [50, Number.POSITIVE_INFINITY] }, // Extremely Poor
					],
				},
				pollutants: {
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 9], amounts: [0, 5] },
							max: { indexes: [40, 49], amounts: [91, 140] },
							value: [
								{ indexes: [0, 9], amounts: [0, 5] }, // Good
								{ indexes: [10, 19], amounts: [6, 15] }, // Fair
								{ indexes: [20, 29], amounts: [16, 50] }, // Moderate
								{ indexes: [30, 39], amounts: [51, 90] }, // Poor
								{ indexes: [40, 49], amounts: [91, 140] }, // Very Poor
								{ indexes: [50, Number.POSITIVE_INFINITY], amounts: [141, Number.POSITIVE_INFINITY] }, // Extremely Poor
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 9], amounts: [0, 15] },
							max: { indexes: [40, 49], amounts: [196, 270] },
							value: [
								{ indexes: [0, 9], amounts: [0, 15] }, // Good
								{ indexes: [10, 19], amounts: [16, 45] }, // Fair
								{ indexes: [20, 29], amounts: [46, 120] }, // Moderate
								{ indexes: [30, 39], amounts: [121, 195] }, // Poor
								{ indexes: [40, 49], amounts: [196, 270] }, // Very Poor
								{ indexes: [50, Number.POSITIVE_INFINITY], amounts: [271, Number.POSITIVE_INFINITY] }, // Extremely Poor
							],
						},
					},
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 9], amounts: [0, 60] },
							max: { indexes: [40, 49], amounts: [161, 180] },
							value: [
								{ indexes: [0, 9], amounts: [0, 60] }, // Good
								{ indexes: [10, 19], amounts: [61, 100] }, // Fair
								{ indexes: [20, 29], amounts: [101, 120] }, // Moderate
								{ indexes: [30, 39], amounts: [121, 160] }, // Poor
								{ indexes: [40, 49], amounts: [161, 180] }, // Very Poor
								{ indexes: [50, Number.POSITIVE_INFINITY], amounts: [181, Number.POSITIVE_INFINITY] }, // Extremely Poor
							],
						},
					},
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 9], amounts: [0, 10] },
							max: { indexes: [40, 49], amounts: [101, 150] },
							value: [
								{ indexes: [0, 9], amounts: [0, 10] }, // Good
								{ indexes: [10, 19], amounts: [11, 25] }, // Fair
								{ indexes: [20, 29], amounts: [26, 60] }, // Moderate
								{ indexes: [30, 39], amounts: [61, 100] }, // Poor
								{ indexes: [40, 49], amounts: [101, 150] }, // Very Poor
								{ indexes: [50, Number.POSITIVE_INFINITY], amounts: [151, Number.POSITIVE_INFINITY] }, // Extremely Poor
							],
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 9], amounts: [0, 20] },
							max: { indexes: [40, 49], amounts: [191, 275] },
							value: [
								{ indexes: [0, 9], amounts: [0, 20] }, // Good
								{ indexes: [10, 19], amounts: [21, 40] }, // Fair
								{ indexes: [20, 29], amounts: [41, 125] }, // Moderate
								{ indexes: [30, 39], amounts: [126, 190] }, // Poor
								{ indexes: [40, 49], amounts: [191, 275] }, // Very Poor
								{ indexes: [50, Number.POSITIVE_INFINITY], amounts: [276, Number.MAX_VALUE] }, // Extremely Poor
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 50] },
							max: { indexes: [401, 500], amounts: [2101, 2620] },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 150] },
								{ indexes: [101, 150], amounts: [151, 475] },
								{ indexes: [151, 200], amounts: [476, 800] },
								{ indexes: [201, 300], amounts: [801, 1600] },
								{ indexes: [301, 400], amounts: [1601, 2100] },
								{ indexes: [401, 500], amounts: [2101, 2620] },
							],
						},
					},
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 150] },
							max: { indexes: [151, 200], amounts: [651, 800] },
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 40] },
							max: { indexes: [401, 500], amounts: [751, 940] },
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 100] },
							max: { indexes: [401, 500], amounts: [3091, 3840] },
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 50] },
							max: { indexes: [401, 500], amounts: [501, 600] },
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 2] },
							max: { indexes: [401, 500], amounts: [49, 60] },
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 5] },
							max: { indexes: [401, 500], amounts: [121, 150] },
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 160] },
							max: { indexes: [401, 500], amounts: [1001, 1200] },
							value: [
								{ indexes: [0, 50], amounts: [0, 160] },
								{ indexes: [51, 100], amounts: [161, 200] },
								{ indexes: [101, 150], amounts: [201, 300] },
								{ indexes: [151, 200], amounts: [301, 400] },
								{ indexes: [201, 300], amounts: [401, 800] },
								{ indexes: [301, 400], amounts: [801, 1000] },
								{ indexes: [401, 500], amounts: [1001, 1200] },
							],
						},
					},
					OZONE_8H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 100] },
							max: { indexes: [201, 300], amounts: [266, 800] },
							value: [
								{ indexes: [0, 50], amounts: [0, 100] },
								{ indexes: [51, 100], amounts: [101, 160] },
								{ indexes: [101, 150], amounts: [161, 215] },
								{ indexes: [151, 200], amounts: [216, 265] },
								{ indexes: [201, 300], amounts: [266, 800] },
								// 臭氧（O3）8小时平均浓度值高于800 ug/m3的，不再进行其空气质量分指数计算，臭氧（O3）空气质量分指数按1小时平均浓度计算的分指数报告。
							],
						},
					},
					PM2_5_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 35] },
							max: { indexes: [401, 500], amounts: [351, 500] },
							value: [
								{ indexes: [0, 50], amounts: [0, 35] },
								{ indexes: [51, 100], amounts: [36, 75] },
								{ indexes: [101, 150], amounts: [76, 115] },
								{ indexes: [151, 200], amounts: [116, 150] },
								{ indexes: [201, 300], amounts: [151, 250] },
								{ indexes: [301, 400], amounts: [251, 350] },
								{ indexes: [401, 500], amounts: [351, 500] },
							],
						},
					},
				},
			},
			/**
			 * China AQI standard (2025 draft).
			 * [关于公开征求《环境空气质量标准（征求意见稿）》等3项生态环境标准意见的通知]{@link https://www.mee.gov.cn/xxgk2018/xxgk/xxgk06/202512/t20251215_1137858.html}
			 */
			HJ6332025_DRAFT: {
				weatherKitScale: {
					name: "HJ6332012",
					version: "2414",
				},
				categories: {
					significantIndex: 3, // 轻度污染
					ranges: [
						{ categoryIndex: 1, indexes: [1, 50] }, // 优
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
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 50] },
							max: { indexes: [401, 500], amounts: [2101, 2620] },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 150] },
								{ indexes: [101, 150], amounts: [151, 475] },
								{ indexes: [151, 200], amounts: [476, 800] },
								{ indexes: [201, 300], amounts: [801, 1600] },
								{ indexes: [301, 400], amounts: [1601, 2100] },
								{ indexes: [401, 500], amounts: [2101, 2620] },
							],
						},
					},
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 150] },
							max: { indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
							value: [
								{ indexes: [0, 50], amounts: [0, 150] },
								{ indexes: [51, 100], amounts: [151, 500] },
								{ indexes: [101, 150], amounts: [501, 650] },
								{ indexes: [151, 200], amounts: [651, 800] },
								// SO2 1小时平均浓度值高于800 μg/m3的，IAQI按照200计。
								{ indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
							],
						},
					},
					NO2_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 40] },
							max: { indexes: [401, 500], amounts: [751, 940] },
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
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 100] },
							max: { indexes: [401, 500], amounts: [3091, 3840] },
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
					CO_24H: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 2] },
							max: { indexes: [401, 500], amounts: [49, 60] },
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
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					CO: {
						units: "MILLIGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 5] },
							max: { indexes: [401, 500], amounts: [121, 150] },
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
					OZONE_8H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 100] },
							max: { indexes: [300, 300], amounts: [801, Number.POSITIVE_INFINITY] },
							value: [
								{ indexes: [0, 50], amounts: [0, 100] },
								{ indexes: [51, 100], amounts: [101, 160] },
								{ indexes: [101, 150], amounts: [161, 215] },
								{ indexes: [151, 200], amounts: [216, 265] },
								{ indexes: [201, 300], amounts: [266, 800] },
								// O3 8小时平均浓度值高于800 μg/m3的，IAQI按照300计。
								{ indexes: [300, 300], amounts: [801, Number.POSITIVE_INFINITY] },
							],
						},
					},
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 160] },
							max: { indexes: [401, 500], amounts: [1001, 1200] },
							value: [
								{ indexes: [0, 50], amounts: [0, 160] },
								{ indexes: [51, 100], amounts: [161, 200] },
								{ indexes: [101, 150], amounts: [201, 300] },
								{ indexes: [151, 200], amounts: [301, 400] },
								{ indexes: [201, 300], amounts: [401, 800] },
								{ indexes: [301, 400], amounts: [801, 1000] },
								{ indexes: [401, 500], amounts: [1001, 1200] },
							],
						},
					},
					PM10_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 50] },
							max: { indexes: [401, 500], amounts: [501, 600] },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 120] },
								{ indexes: [101, 150], amounts: [121, 250] },
								{ indexes: [151, 200], amounts: [251, 350] },
								{ indexes: [201, 300], amounts: [351, 420] },
								{ indexes: [301, 400], amounts: [421, 500] },
								{ indexes: [401, 500], amounts: [501, 600] },
							],
						},
					},
					PM2_5_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 35] },
							max: { indexes: [401, 500], amounts: [351, 500] },
							value: [
								{ indexes: [0, 50], amounts: [0, 30] },
								{ indexes: [51, 100], amounts: [31, 60] },
								{ indexes: [101, 150], amounts: [61, 115] },
								{ indexes: [151, 200], amounts: [116, 150] },
								{ indexes: [201, 300], amounts: [151, 250] },
								{ indexes: [301, 400], amounts: [251, 350] },
								{ indexes: [401, 500], amounts: [351, 500] },
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
						{ categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // Hazardous
					],
				},
				pollutants: {
					OZONE_8H: {
						units: "PARTS_PER_MILLION",
						stpConversionFactor: 1.96189649169881,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 0.054] },
							max: { indexes: [201, 300], amounts: [0.106, 0.2] },
							value: [
								{ indexes: [0, 50], amounts: [0, 0.054] }, // Good
								{ indexes: [51, 100], amounts: [0.055, 0.07] }, // Moderate
								{ indexes: [101, 150], amounts: [0.071, 0.085] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [0.086, 0.105] }, // Unhealthy
								{ indexes: [201, 300], amounts: [0.106, 0.2] }, // Very Unhealthy
								// Note 2:
								// 8-hour O3 values do not define higher AQI values (≥ 301).
								// AQI values of 301 or higher are calculated with 1-hour O3 concentrations.
								{ indexes: [301, Number.POSITIVE_INFINITY], amounts: [0.201, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					OZONE: {
						units: "PARTS_PER_MILLION",
						stpConversionFactor: 1.96189649169881,
						ranges: {
							min: { indexes: [101, 150], amounts: [0.125, 0.164] },
							max: { indexes: [301, 500], amounts: [0.405, 0.604] },
							value: [
								// Note 1:
								// Areas are generally required to report the AQI based on 8-hour O3 values. However,
								// there are a small number of areas where an AQI based on 1-hour O3 values would be more precautionary.
								// In these cases, in addition to calculating the 8-hour O3 index value,
								// the 1-hour O3 value may be calculated, and the maximum of the two values reported.
								{ indexes: [101, 150], amounts: [0.125, 0.164] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [0.165, 0.204] }, // Unhealthy
								{ indexes: [201, 300], amounts: [0.205, 0.404] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [0.405, 0.604] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [0.605, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					PM2_5_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 9] },
							max: { indexes: [301, 500], amounts: [225.5, 325.4] },
							value: [
								{ indexes: [0, 50], amounts: [0, 9] }, // Good
								{ indexes: [51, 100], amounts: [9.1, 35.4] }, // Moderate
								{ indexes: [101, 150], amounts: [35.5, 55.4] }, // Unhealthy for Sensitive Groups
								// Note 3 of PM2.5 can be found in EPA 454/B-18-007:
								// If a different SHL for PM2.5 is promulgated, these numbers will change accordingly.
								//
								// It is believed that they forgot to remove this note
								{ indexes: [151, 200], amounts: [55.5, 125.4] }, // Unhealthy
								{ indexes: [201, 300], amounts: [125.5, 225.4] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [225.5, 325.4] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [325.5, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					PM10_24H: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 54] },
							max: { indexes: [301, 500], amounts: [425, 604] },
							value: [
								{ indexes: [0, 50], amounts: [0, 54] }, // Good
								{ indexes: [51, 100], amounts: [55, 154] }, // Moderate
								{ indexes: [101, 150], amounts: [155, 254] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [255, 354] }, // Unhealthy
								{ indexes: [201, 300], amounts: [355, 424] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [425, 604] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [605, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					CO_8H: {
						units: "PARTS_PER_MILLION",
						stpConversionFactor: 1.14491990608754,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 4.4] },
							max: { indexes: [301, 500], amounts: [30.5, 50.4] },
							value: [
								{ indexes: [0, 50], amounts: [0, 4.4] }, // Good
								{ indexes: [51, 100], amounts: [4.5, 9.4] }, // Moderate
								{ indexes: [101, 150], amounts: [9.5, 12.4] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [12.5, 15.4] }, // Unhealthy
								{ indexes: [201, 300], amounts: [15.5, 30.4] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [30.5, 50.4] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [50.5, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					SO2: {
						units: "PARTS_PER_BILLION",
						stpConversionFactor: 2.618396263625692,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 35] },
							max: { indexes: [301, 500], amounts: [605, 1004] },
							value: [
								{ indexes: [0, 50], amounts: [0, 35] }, // Good
								{ indexes: [51, 100], amounts: [36, 75] }, // Moderate
								{ indexes: [101, 150], amounts: [76, 185] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [186, 304] }, // Unhealthy
								// Note 3 of SO2:
								// 1-hour SO2 values do not define higher AQI values (≥ 200).
								// AQI values of 200 or greater are calculated with 24-hour SO2 concentrations.
								//
								// It is believed that they forgot to remove this note
								{ indexes: [201, 300], amounts: [305, 604] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [605, 1004] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [1005, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					NO2: {
						units: "PARTS_PER_BILLION",
						stpConversionFactor: 1.880472698306222,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 53] },
							max: { indexes: [301, 500], amounts: [1250, 2049] },
							value: [
								{ indexes: [0, 50], amounts: [0, 53] }, // Good
								{ indexes: [51, 100], amounts: [54, 100] }, // Moderate
								{ indexes: [101, 150], amounts: [101, 360] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [361, 649] }, // Unhealthy
								{ indexes: [201, 300], amounts: [650, 1249] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [1250, 2049] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [2050, Number.POSITIVE_INFINITY] }, // Hazardous
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
					maxIndex: 500,
				},
				categories: {
					significantIndex: 3, // Unhealthy for Sensitive Groups
					ranges: [
						{ categoryIndex: 1, indexes: [0, 50] }, // Good
						{ categoryIndex: 2, indexes: [51, 100] }, // Moderate
						{ categoryIndex: 3, indexes: [101, 150] }, // Unhealthy for Sensitive Groups
						{ categoryIndex: 4, indexes: [151, 200] }, // Unhealthy
						{ categoryIndex: 5, indexes: [201, 300] }, // Very Unhealthy
						{ categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // Hazardous
					],
				},
				// Eventually we will convert it to ppb
				pollutants: {
					// [Ozone AQI Scale update](https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/)
					OZONE: {
						units: "PARTS_PER_BILLION",
						stpConversionFactor: 1.96189649169881,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 62.5] },
							max: { indexes: [301, 500], amounts: [405.1, 605] },
							value: [
								{ indexes: [0, 50], amounts: [0, 62.5] }, // Good
								{ indexes: [51, 100], amounts: [62.6, 101.5] }, // Moderate
								{ indexes: [101, 150], amounts: [101.6, 152.5] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [152.6, 205] }, // Unhealthy
								{ indexes: [201, 300], amounts: [205.1, 405] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [405.1, 605] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [605.1, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 9] },
							max: { indexes: [301, 500], amounts: [225.5, 325.4] },
							value: [
								{ indexes: [0, 50], amounts: [0, 9] }, // Good
								{ indexes: [51, 100], amounts: [9.1, 35.4] }, // Moderate
								{ indexes: [101, 150], amounts: [35.5, 55.4] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [55.5, 125.4] }, // Unhealthy
								{ indexes: [201, 300], amounts: [125.5, 225.4] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [225.5, 325.4] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [325.5, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 54] },
							max: { indexes: [301, 500], amounts: [425, 604] },
							value: [
								{ indexes: [0, 50], amounts: [0, 54] }, // Good
								{ indexes: [51, 100], amounts: [55, 154] }, // Moderate
								{ indexes: [101, 150], amounts: [155, 254] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [255, 354] }, // Unhealthy
								{ indexes: [201, 300], amounts: [355, 424] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [425, 604] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [605, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					CO: {
						units: "PARTS_PER_BILLION",
						stpConversionFactor: 1.144511152104645,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 4400] },
							max: { indexes: [301, 500], amounts: [30401, 50400] },
							value: [
								{ indexes: [0, 50], amounts: [0, 4400] }, // Good
								{ indexes: [51, 100], amounts: [4401, 9400] }, // Moderate
								{ indexes: [101, 150], amounts: [9401, 12400] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [12401, 15400] }, // Unhealthy
								{ indexes: [201, 300], amounts: [15401, 30400] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [30401, 50400] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [50401, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					SO2: {
						units: "PARTS_PER_BILLION",
						stpConversionFactor: 2.618396263625692,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 35] },
							max: { indexes: [301, 500], amounts: [605, 1004] },
							value: [
								{ indexes: [0, 50], amounts: [0, 35] }, // Good
								{ indexes: [51, 100], amounts: [36, 75] }, // Moderate
								{ indexes: [101, 150], amounts: [76, 185] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [186, 304] }, // Unhealthy
								{ indexes: [201, 300], amounts: [305, 604] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [605, 1004] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [1005, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
					NO2: {
						units: "PARTS_PER_BILLION",
						stpConversionFactor: 1.880472698306222,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 53] },
							max: { indexes: [301, 500], amounts: [1250, 2049] },
							value: [
								{ indexes: [0, 50], amounts: [0, 53] }, // Good
								{ indexes: [51, 100], amounts: [54, 100] }, // Moderate
								{ indexes: [101, 150], amounts: [101, 360] }, // Unhealthy for Sensitive Groups
								{ indexes: [151, 200], amounts: [361, 649] }, // Unhealthy
								{ indexes: [201, 300], amounts: [650, 1249] }, // Very Unhealthy
								{ indexes: [301, 500], amounts: [1250, 2049] }, // Hazardous
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [2050, Number.POSITIVE_INFINITY] }, // Hazardous
							],
						},
					},
				},
			},
			/**
			 * WAQI InstantCast in HJ6332012.
			 * Use 24-hour SO2 when > 800, 24-hour PM10 and PM2.5 as 1-hour.
			 * 1-hour for others.
			 */
			WAQI_InstantCast_CN: {
				weatherKitScale: {
					name: "HJ6332012",
					version: "2414",
					maxIndex: 500,
				},
				categories: {
					significantIndex: 3, // 轻度污染
					ranges: [
						{ categoryIndex: 1, indexes: [0, 50] }, // 优
						{ categoryIndex: 2, indexes: [51, 100] }, // 良
						{ categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
						{ categoryIndex: 4, indexes: [151, 200] }, // 中度污染
						{ categoryIndex: 5, indexes: [201, 300] }, // 重度污染
						{ categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // 严重污染
					],
				},
				pollutants: {
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 150] },
							max: { indexes: [401, 500], amounts: [2101, 2620] },
							value: [
								{ indexes: [0, 50], amounts: [0, 150] },
								{ indexes: [51, 100], amounts: [151, 500] },
								{ indexes: [101, 150], amounts: [501, 650] },
								{ indexes: [151, 200], amounts: [651, 800] },
								{ indexes: [201, 300], amounts: [801, 1600] },
								{ indexes: [301, 400], amounts: [1601, 2100] },
								{ indexes: [401, 500], amounts: [2101, 2620] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [2602, Number.POSITIVE_INFINITY] },
							],
						},
					},
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 100] },
							max: { indexes: [401, 500], amounts: [3091, 3840] },
							value: [
								{ indexes: [0, 50], amounts: [0, 100] },
								{ indexes: [51, 100], amounts: [101, 200] },
								{ indexes: [101, 150], amounts: [201, 700] },
								{ indexes: [151, 200], amounts: [701, 1200] },
								{ indexes: [201, 300], amounts: [1201, 2340] },
								{ indexes: [301, 400], amounts: [2341, 3090] },
								{ indexes: [401, 500], amounts: [3091, 3840] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [3841, Number.POSITIVE_INFINITY] },
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 50] },
							max: { indexes: [401, 500], amounts: [501, 600] },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 150] },
								{ indexes: [101, 150], amounts: [151, 250] },
								{ indexes: [151, 200], amounts: [251, 350] },
								{ indexes: [201, 300], amounts: [351, 420] },
								{ indexes: [301, 400], amounts: [421, 500] },
								{ indexes: [401, 500], amounts: [501, 600] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [601, Number.POSITIVE_INFINITY] },
							],
						},
					},
					CO: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 5000] },
							max: { indexes: [401, 500], amounts: [120001, 150000] },
							value: [
								{ indexes: [0, 50], amounts: [0, 5000] },
								{ indexes: [51, 100], amounts: [5001, 10000] },
								{ indexes: [101, 150], amounts: [10001, 35000] },
								{ indexes: [151, 200], amounts: [35001, 60000] },
								{ indexes: [201, 300], amounts: [60001, 90000] },
								{ indexes: [301, 400], amounts: [90001, 120000] },
								{ indexes: [401, 500], amounts: [120001, 150000] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [150001, Number.POSITIVE_INFINITY] },
							],
						},
					},
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 160] },
							max: { indexes: [401, 500], amounts: [1001, 1200] },
							value: [
								{ indexes: [0, 50], amounts: [0, 160] },
								{ indexes: [51, 100], amounts: [161, 200] },
								{ indexes: [101, 150], amounts: [201, 300] },
								{ indexes: [151, 200], amounts: [301, 400] },
								{ indexes: [201, 300], amounts: [401, 800] },
								{ indexes: [301, 400], amounts: [801, 1000] },
								{ indexes: [401, 500], amounts: [1001, 1200] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [1201, Number.POSITIVE_INFINITY] },
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 35] },
							max: { indexes: [401, 500], amounts: [351, 500] },
							value: [
								{ indexes: [0, 50], amounts: [0, 35] },
								{ indexes: [51, 100], amounts: [36, 75] },
								{ indexes: [101, 150], amounts: [76, 115] },
								{ indexes: [151, 200], amounts: [116, 150] },
								{ indexes: [201, 300], amounts: [151, 250] },
								{ indexes: [301, 400], amounts: [251, 350] },
								{ indexes: [401, 500], amounts: [351, 500] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [501, Number.POSITIVE_INFINITY] },
							],
						},
					},
				},
			},
			WAQI_InstantCast_CN_25_DRAFT: {
				weatherKitScale: {
					name: "HJ6332012",
					version: "2414",
					maxIndex: 500,
				},
				categories: {
					significantIndex: 3, // 轻度污染
					ranges: [
						{ categoryIndex: 1, indexes: [1, 50] }, // 优
						{ categoryIndex: 2, indexes: [51, 100] }, // 良
						{ categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
						{ categoryIndex: 4, indexes: [151, 200] }, // 中度污染
						{ categoryIndex: 5, indexes: [201, 300] }, // 重度污染
						{ categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // 严重污染
					],
				},
				pollutants: {
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					SO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 150] },
							max: { indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
							value: [
								{ indexes: [0, 50], amounts: [0, 150] },
								{ indexes: [51, 100], amounts: [151, 500] },
								{ indexes: [101, 150], amounts: [501, 650] },
								{ indexes: [151, 200], amounts: [651, 800] },
								// SO2 1小时平均浓度值高于800 μg/m3的，IAQI按照200计。
								{ indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
							],
						},
					},
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					NO2: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 100] },
							max: { indexes: [401, 500], amounts: [3091, 3840] },
							value: [
								{ indexes: [0, 50], amounts: [0, 100] },
								{ indexes: [51, 100], amounts: [101, 200] },
								{ indexes: [101, 150], amounts: [201, 700] },
								{ indexes: [151, 200], amounts: [701, 1200] },
								{ indexes: [201, 300], amounts: [1201, 2340] },
								{ indexes: [301, 400], amounts: [2341, 3090] },
								{ indexes: [401, 500], amounts: [3091, 3840] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [3841, Number.POSITIVE_INFINITY] },
							],
						},
					},
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					CO: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 5000] },
							max: { indexes: [401, 500], amounts: [120001, 150000] },
							value: [
								{ indexes: [0, 50], amounts: [0, 5000] },
								{ indexes: [51, 100], amounts: [5001, 10000] },
								{ indexes: [101, 150], amounts: [10001, 35000] },
								{ indexes: [151, 200], amounts: [35001, 60000] },
								{ indexes: [201, 300], amounts: [60001, 90000] },
								{ indexes: [301, 400], amounts: [90001, 120000] },
								{ indexes: [401, 500], amounts: [120001, 150000] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [150001, Number.POSITIVE_INFINITY] },
							],
						},
					},
					// SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
					OZONE: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 160] },
							max: { indexes: [401, 500], amounts: [1001, 1200] },
							value: [
								{ indexes: [0, 50], amounts: [0, 160] },
								{ indexes: [51, 100], amounts: [161, 200] },
								{ indexes: [101, 150], amounts: [201, 300] },
								{ indexes: [151, 200], amounts: [301, 400] },
								{ indexes: [201, 300], amounts: [401, 800] },
								{ indexes: [301, 400], amounts: [801, 1000] },
								{ indexes: [401, 500], amounts: [1001, 1200] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [1201, Number.POSITIVE_INFINITY] },
							],
						},
					},
					PM10: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 50] },
							max: { indexes: [401, 500], amounts: [501, 600] },
							value: [
								{ indexes: [0, 50], amounts: [0, 50] },
								{ indexes: [51, 100], amounts: [51, 120] },
								{ indexes: [101, 150], amounts: [121, 250] },
								{ indexes: [151, 200], amounts: [251, 350] },
								{ indexes: [201, 300], amounts: [351, 420] },
								{ indexes: [301, 400], amounts: [421, 500] },
								{ indexes: [401, 500], amounts: [501, 600] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [601, Number.POSITIVE_INFINITY] },
							],
						},
					},
					PM2_5: {
						units: "MICROGRAMS_PER_CUBIC_METER",
						stpConversionFactor: -1,
						ranges: {
							min: { indexes: [0, 50], amounts: [0, 35] },
							max: { indexes: [401, 500], amounts: [351, 500] },
							value: [
								{ indexes: [0, 50], amounts: [0, 30] },
								{ indexes: [51, 100], amounts: [31, 60] },
								{ indexes: [101, 150], amounts: [61, 115] },
								{ indexes: [151, 200], amounts: [116, 150] },
								{ indexes: [201, 300], amounts: [151, 250] },
								{ indexes: [301, 400], amounts: [251, 350] },
								{ indexes: [401, 500], amounts: [351, 500] },
								{ indexes: [501, Number.POSITIVE_INFINITY], amounts: [501, Number.POSITIVE_INFINITY] },
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
		CompareCategoryIndexes: {
			BETTER: "BETTER",
			SAME: "SAME",
			UNKNOWN: "UNKNOWN",
			WORSE: "WORSE",
		},
		Units: {
			WeatherKit: {
				ugm3: "MICROGRAMS_PER_CUBIC_METER",
				mgm3: "MILLIGRAMS_PER_CUBIC_METER",
				ppb: "PARTS_PER_BILLION",
				ppm: "PARTS_PER_MILLION",
			},
			Friendly: {
				MICROGRAMS_PER_CUBIC_METER: "μg/m3",
				MILLIGRAMS_PER_CUBIC_METER: "mg/m3",
				PARTS_PER_BILLION: "ppb",
				PARTS_PER_MILLION: "ppm",
			},
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
		STP_ConversionFactors: {
			US: {
				OZONE: 1.96189649169881, // 47.997 g/mol
				SO2: 2.618396263625692, // 64.058 g/mol
				NO2: 1.880472698306222, // 46.005 g/mol
				CO: 1.14491990608754, // 28.01 g/mol
				C6H6: 3.192940861982224, // 78.114 g/mol
				NH3: 0.696148908267651, // 17.031 g/mol
				NO: 1.226507201073285, // 30.006 g/mol
			},
			EU: {
				OZONE: 1.995358823128092, // 47.997 g/mol
				SO2: 2.663055930411053, // 64.058 g/mol
				NO2: 1.912546256182842, // 46.005 g/mol
				CO: 1.164447791233157, // 28.01 g/mol
				C6H6: 3.247400027289784, // 78.114 g/mol
				NH3: 0.708022503837626, // 17.031 g/mol
				NO: 1.247426648473478, // 30.006 g/mol
			},
		},
	};

	static ConvertUnit(amount, from, to, fromStpConversionFactor = -1, toStpConversionFactor = -1) {
		Console.info("☑️ ConvertUnit");
		const friendlyUnits = AirQuality.Config.Units.Friendly;
		Console.info(`Convert ${amount} from ${friendlyUnits[from]} with ${fromStpConversionFactor} to ${friendlyUnits[to]} with ${toStpConversionFactor}`);
		if (amount < 0) {
			Console.error("ConvertUnit", `Amount ${amount} < 0`);
			return -1;
		}

		const numAmount = Number(amount.toFixed(15));

		const { ugm3, mgm3, ppb, ppm } = AirQuality.Config.Units.WeatherKit;
		const ppx = [ppb, ppm];
		const units = [...ppx, ugm3, mgm3];
		if (!units.includes(from) || !units.includes(to)) {
			Console.error("ConvertUnit", "不支持的单位", `from: ${from}`, `to: ${to}`);
			return -1;
		}

		const isPpxFrom = ppx.includes(from);
		const isPpxTo = ppx.includes(to);
		const isBothPpx = isPpxFrom && isPpxTo;
		if (isBothPpx && fromStpConversionFactor !== toStpConversionFactor) {
			if (fromStpConversionFactor <= 0 || toStpConversionFactor <= 0) {
				Console.error("ConvertUnit", "无效的STP conversion factor", `fromStpConversionFactor: ${fromStpConversionFactor}`, `toStpConversionFactor: ${toStpConversionFactor}`);
				return -1;
			}

			const intermediate = AirQuality.ConvertUnit(numAmount, from, ugm3, fromStpConversionFactor);
			return AirQuality.ConvertUnit(intermediate, ugm3, to, -1, toStpConversionFactor);
		}

		if (!isBothPpx && isPpxFrom && fromStpConversionFactor <= 0) {
			Console.error("ConvertUnit", `fromStpConversionFactor ${fromStpConversionFactor} <= 0`);
			return -1;
		}

		if (!isBothPpx && isPpxTo && toStpConversionFactor <= 0) {
			Console.error("ConvertUnit", `toStpConversionFactor ${toStpConversionFactor} <= 0`);
			return -1;
		}

		const { multiply, divide } = SimplePrecisionMath;
		switch (from) {
			case ppm:
				switch (to) {
					case ppm:
						Console.info("✅ ConvertUnit");
						return numAmount;
					case ppb:
						Console.info("✅ ConvertUnit");
						return multiply(numAmount, 1000);
					case mgm3:
						Console.info("✅ ConvertUnit");
						return multiply(numAmount, fromStpConversionFactor);
					case ugm3: {
						const inPpb = AirQuality.ConvertUnit(numAmount, from, ppb);
						Console.info("✅ ConvertUnit");
						return multiply(inPpb, fromStpConversionFactor);
					}
					default:
						return -1;
				}
			case ppb:
				switch (to) {
					case ppb:
						Console.info("✅ ConvertUnit");
						return numAmount;
					case ppm:
						Console.info("✅ ConvertUnit");
						return multiply(numAmount, 0.001);
					case mgm3: {
						const inPpm = AirQuality.ConvertUnit(numAmount, from, ppm);
						Console.info("✅ ConvertUnit");
						return multiply(inPpm, fromStpConversionFactor);
					}
					case ugm3:
						Console.info("✅ ConvertUnit");
						return multiply(numAmount, fromStpConversionFactor);
					default:
						return -1;
				}
			case mgm3:
				switch (to) {
					case mgm3:
						Console.info("✅ ConvertUnit");
						return numAmount;
					case ugm3:
						Console.info("✅ ConvertUnit");
						return multiply(numAmount, 1000);
					case ppm:
						Console.info("✅ ConvertUnit");
						return divide(numAmount, toStpConversionFactor);
					case ppb: {
						const inUgM3 = AirQuality.ConvertUnit(numAmount, from, ugm3);
						Console.info("✅ ConvertUnit");
						return divide(inUgM3, toStpConversionFactor);
					}
					default:
						return -1;
				}
			case ugm3:
				switch (to) {
					case ugm3:
						Console.info("✅ ConvertUnit");
						return numAmount;
					case mgm3:
						Console.info("✅ ConvertUnit");
						return multiply(numAmount, 0.001);
					case ppm: {
						const inMgM3 = AirQuality.ConvertUnit(numAmount, from, mgm3);
						Console.info("✅ ConvertUnit");
						return divide(inMgM3, toStpConversionFactor);
					}
					case ppb:
						Console.info("✅ ConvertUnit");
						return divide(numAmount, toStpConversionFactor);
					default:
						return -1;
				}
			default:
				return -1;
		}
	}
}
