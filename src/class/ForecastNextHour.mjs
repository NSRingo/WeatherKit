import { Console } from "@nsnanocat/util";

export default class ForecastNextHour {
	Name = "ForecastNextHour";
	Version = "v1.5.0";
	Author = "iRingo";

	static #Configs = {
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
		WeatherCondition: {
			晴朗: "CLEAR",
			雨夹雪: "SLEET",
			小雨: "DRIZZLE",
			下雨: "RAIN",
			中雨: "RAIN",
			大雨: "HEAVY_RAIN",
			小雪: "FLURRIES",
			下雪: "SNOW",
			中雪: "SNOW",
			大雪: "HEAVY_SNOW",
			冰雹: "HAIL",
		},
		PrecipitationType: {
			晴朗: "CLEAR",
			雨夹雪: "SLEET",
			rain: "RAIN",
			雨: "RAIN",
			snow: "SNOW",
			雪: "SNOW",
			冰雹: "HAIL",
		},
		Precipitation: {
			Level: {
				INVALID: -1,
				NO: 0,
				LIGHT: 1,
				MODERATE: 2,
				HEAVY: 3,
				STORM: 4,
			},
			Range: {
				/**
				 * [降水强度 | 彩云天气 API]{@link https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/precip.html}
				 */
				radar: {
					NO: [0, 0.031],
					LIGHT: [0.031, 0.25],
					MODERATE: [0.25, 0.35],
					HEAVY: [0.35, 0.48],
					STORM: [0.48, Number.MAX_VALUE],
				},
				mmph: {
					NO: [0, 0.08],
					LIGHT: [0.08, 3.44],
					MODERATE: [3.44, 11.33],
					HEAVY: [11.33, 51.3],
					STORM: [51.3, Number.MAX_VALUE],
				},
			},
		},
	};

	static WeatherCondition(sentence) {
		Console.info("☑️ WeatherCondition", `sentence: ${sentence}`);
		let weatherCondition = "CLEAR";
		Object.keys(ForecastNextHour.#Configs.WeatherCondition).forEach(key => {
			if (sentence.includes(key)) weatherCondition = ForecastNextHour.#Configs.WeatherCondition[key];
		});
		Console.info(`✅ WeatherCondition: ${weatherCondition}`);
		return weatherCondition;
	}

	static PrecipitationType(sentence) {
		Console.info("☑️ PrecipitationType", `sentence: ${sentence}`);
		let precipitationType = "CLEAR";
		Object.keys(ForecastNextHour.#Configs.PrecipitationType).forEach(key => {
			if (sentence.includes(key)) precipitationType = ForecastNextHour.#Configs.PrecipitationType[key];
		});
		Console.info(`✅ PrecipitationType: ${precipitationType}`);
		return precipitationType;
	}

	static Minute(minutes = [], description = "", units = "mmph") {
		Console.info("☑️ Minute");
		const precipitationType = ForecastNextHour.PrecipitationType(description);
		// refer: https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/precip.html

		minutes = minutes.map((minute, i) => {
			// 根据precipitationIntensity来猜测生成perceivedPrecipitationIntensity
			minute.perceivedPrecipitationIntensity = ForecastNextHour.#ConvertPrecipitationIntensity(minute.precipitationIntensity, units);
			// 然后根据perceivedPrecipitationIntensity和precipitationChance来猜测生成condition和summaryCondition
			if (minute.perceivedPrecipitationIntensity > 2) {
				// 大雨，强烈感知
				switch (precipitationType) {
					case "RAIN":
						minute.condition = "HEAVY_RAIN";
						break;
					case "SNOW":
						minute.condition = "HEAVY_SNOW";
						break;
					default:
						minute.condition = precipitationType;
						break;
				}
				minute.summaryCondition = precipitationType;
				minute.clear = false;
			} else if (minute.perceivedPrecipitationIntensity > 1) {
				// 中雨，明显感知
				switch (precipitationType) {
					case "RAIN":
						minute.condition = "RAIN";
						break;
					case "SNOW":
						minute.condition = "SNOW";
						break;
					default:
						minute.condition = precipitationType;
						break;
				}
				minute.summaryCondition = precipitationType;
				minute.clear = false;
			} else if (minute.perceivedPrecipitationIntensity > 0.1) {
				// ✅ perceivedPrecipitationIntensity 小于 0.1, 苹果天气显示为无降水
				// 小雨，可以感知到
				switch (precipitationType) {
					case "RAIN":
						minute.condition = "DRIZZLE";
						break;
					case "SNOW":
						minute.condition = "FLURRIES";
						break;
					default:
						minute.condition = precipitationType;
						break;
				}
				minute.summaryCondition = precipitationType;
				minute.clear = false;
			} else if (minute.perceivedPrecipitationIntensity > 0) {
				// 可能降水
				switch (precipitationType) {
					case "RAIN":
						minute.condition = "POSSIBLE_DRIZZLE";
						break;
					case "SNOW":
						minute.condition = "POSSIBLE_FLURRIES";
						break;
					default:
						minute.condition = `POSSIBLE_${precipitationType}`;
						break;
				}
				minute.summaryCondition = precipitationType;
				minute.clear = false;
			} else {
				minute.condition = "CLEAR";
				minute.summaryCondition = "CLEAR";
				minute.clear = true;
			}
			Console.debug(`minutes[${i}]`, JSON.stringify(minute, null, 2));
			return minute;
		});

		Console.info("✅ Minute");
		return minutes;
	}

	static Summary(minutes = []) {
		Console.info("☑️ Summary");
		const Summaries = [];
		const Summary = {
			condition: "CLEAR",
			precipitationChance: 0,
			startTime: 0,
			precipitationIntensity: 0,
			beginCondition: "",
			endCondition: "",
			clear: true,
		};
		const Length = Math.min(71, minutes.length);
		for (let i = 0; i < Length; i++) {
			const minute = minutes[i];
			const previousMinute = minutes[i - 1];
			switch (i) {
				case 0: // 第一个
					Summary.startTime = minute.startTime;
					Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
					Summary.precipitationChance = minute.precipitationChance;
					Summary.precipitationIntensity = minute.precipitationIntensity;
					Summary.beginCondition = minute.condition;
					Summary.endCondition = "";
					Summary.clear = minute.clear;
					break;
				case Length - 1: // 最后一个
					Summary.endCondition = minute.condition;
					Summary.endTime = 0; // ⚠️空值必须写零！
					Summary.clear = minute.clear;
					//Console.debug(`Summaries[${i}]`, JSON.stringify({ ...minute, ...Summary }, null, 2));
					Summaries.push({ ...Summary });
					break;
				default: // 中间
					if (minute.summaryCondition !== previousMinute.summaryCondition) {
						// 结束当前summary
						Summary.endTime = minute.startTime;
						Summary.endCondition = previousMinute.condition;
						//Console.debug(`Summaries[${i}]`, JSON.stringify({ ...previousMinute, ...Summary }, null, 2));
						Summaries.push({ ...Summary });

						// 开始新的summary
						Summary.startTime = minute.startTime;
						Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
						Summary.beginCondition = minute.condition;
						Summary.endCondition = ""; // 重置
						Summary.clear = minute.clear;
						Summary.precipitationChance = minute.precipitationChance;
						Summary.precipitationIntensity = minute.precipitationIntensity;
					} else {
						// 条件相同，更新最大值
						Summary.precipitationChance = Math.max(Summary.precipitationChance, minute.precipitationChance);
						Summary.precipitationIntensity = Math.max(Summary.precipitationIntensity, minute.precipitationIntensity);
					}
					break;
			}
		}
		Console.debug(`Summaries: ${JSON.stringify(Summaries, null, 2)}`);
		Console.info("✅ Summary");
		return Summaries;
	}

	static Condition(minutes = [], summaries = []) {
		Console.info("☑️ Condition");
		const Conditions = [];
		// 先通过 summaries 定基调
		switch (summaries.map(summary => summary.clear).join("|")) {
			case "true": {
				// 全程 CLEAR, 无降水, 是 CLEAR
				const CLEAR = summaries[0]; // CLEAR 时期
				// CLEAR 期间显示为 CLEAR
				Conditions.push({
					beginCondition: CLEAR.beginCondition,
					endCondition: CLEAR.endCondition,
					forecastToken: "CLEAR",
					parameters: [],
					startTime: CLEAR.startTime,
					endTime: 0, // CLEAR 期间
				});
				break;
			}
			case "false": {
				// 全程 RAIN, 有降水, 是 CONSTANT
				const CONSTANT = summaries[0]; // CONSTANT 时期
				// CONSTANT 期间显示为 CONSTANT
				Conditions.push({
					beginCondition: CONSTANT.beginCondition,
					endCondition: CONSTANT.endCondition,
					forecastToken: "CONSTANT",
					parameters: [],
					startTime: CONSTANT.startTime, // CONSTANT 期间
					endTime: 0, // CONSTANT 期间
				});
				break;
			}
			case "true|false": {
				// 先 CLEAR 后降水, 是 START
				const CLEAR = summaries[0]; // START 时期
				const START = summaries[1]; // CONSTANT 时期
				// CLEAR 期间显示为 START
				Conditions.push({
					beginCondition: START.beginCondition,
					endCondition: START.endCondition,
					forecastToken: "START",
					parameters: [{ date: START.startTime, type: "FIRST_AT" }], // 降水开始时
					startTime: CLEAR.startTime, // CLEAR 期间
					endTime: CLEAR.endTime, // CLEAR 期间
				});
				// START 期间显示为 CONSTANT
				Conditions.push({
					beginCondition: START.beginCondition,
					endCondition: START.beginCondition,
					forecastToken: "CONSTANT",
					parameters: [],
					startTime: START.startTime, // START 期间
					endTime: 0, // START 期间
				});
				break;
			}
			case "false|true": {
				// 先降水后 CLEAR, 是 STOP
				const STOP = summaries[0]; // STOP 时期
				const CLEAR = summaries[1]; // CLEAR 时期
				// STOP 期间显示为 STOP
				Conditions.push({
					beginCondition: STOP.beginCondition,
					endCondition: STOP.endCondition,
					forecastToken: "STOP",
					parameters: [{ date: STOP.endTime, type: "FIRST_AT" }], // 降水结束时
					startTime: STOP.startTime, // STOP 期间
					endTime: STOP.endTime, // STOP 期间
				});
				// CLEAR 期间显示为 CLEAR
				Conditions.push({
					beginCondition: CLEAR.beginCondition,
					endCondition: CLEAR.beginCondition,
					forecastToken: "CLEAR",
					parameters: [],
					startTime: CLEAR.startTime, // CLEAR 期间
					endTime: 0, // CLEAR 期间
				});
				break;
			}
			case "false|true|false": {
				// 先降水后 CLEAR, 再降水, 是 STOP_START
				const STOP = summaries[0]; // STOP 时期
				const CLEAR = summaries[1]; // START 时期
				const START = summaries[2]; // START 时期
				// STOP 期间显示为 STOP_START
				Conditions.push({
					beginCondition: STOP.beginCondition, // 第一次降水降水开始时
					endCondition: START.endCondition, // 第一次降水降水结束时
					forecastToken: "STOP_START",
					parameters: [
						{ date: STOP.endTime, type: "FIRST_AT" }, // 第一次降水结束时
						{ date: START.startTime, type: "SECOND_AT" }, // 第二次降水开始时
					],
					startTime: STOP.startTime, // STOP 期间
					endTime: STOP.endTime, // STOP 期间
				});
				// CLEAR 期间显示为 START
				Conditions.push({
					beginCondition: START.beginCondition,
					endCondition: START.beginCondition,
					forecastToken: "START",
					parameters: [{ date: START.startTime, type: "FIRST_AT" }],
					startTime: CLEAR.startTime, // CLEAR 期间
					endTime: CLEAR.endTime, // CLEAR 期间
				});
				// START 期间显示为 CONSTANT
				Conditions.push({
					beginCondition: START.beginCondition,
					endCondition: START.beginCondition,
					forecastToken: "CONSTANT",
					parameters: [],
					startTime: START.startTime, // START 期间
					endTime: 0, // START 期间
				});
				break;
			}
			case "true|false|true": {
				// 先 CLEAR 后降水, 再 CLEAR, 是 START_STOP
				const CLEAR1 = summaries[0]; // START_STOP 时期
				const STOP = summaries[1]; // STOP 时期
				const CLEAR2 = summaries[2]; // CLEAR 时期
				// CLEAR1 期间显示为 START_STOP
				Conditions.push({
					beginCondition: STOP.beginCondition, // STOP 的开始天气
					endCondition: STOP.endCondition, // STOP 的结束天气
					forecastToken: "START_STOP",
					parameters: [
						{ date: STOP.startTime, type: "FIRST_AT" },
						{ date: STOP.endTime, type: "SECOND_AT" },
					],
					startTime: CLEAR1.startTime, // CLEAR1 期间
					endTime: CLEAR1.endTime, // CLEAR1 期间
				});
				// STOP 期间显示为 STOP
				Conditions.push({
					beginCondition: STOP.beginCondition, // STOP 的开始天气
					endCondition: STOP.endCondition, // STOP 的结束天气
					forecastToken: "STOP",
					parameters: [{ date: STOP.endTime, type: "FIRST_AT" }],
					startTime: STOP.startTime, // STOP 期间
					endTime: STOP.endTime, // STOP 期间
				});
				// CLEAR2 期间显示为 CLEAR
				Conditions.push({
					beginCondition: CLEAR2.endCondition, // CLEAR2 时期
					endCondition: CLEAR2.endCondition, // CLEAR2 时期
					forecastToken: "CLEAR",
					parameters: [],
					startTime: CLEAR2.startTime, // CLEAR2 期间
					endTime: 0, // CLEAR2 期间
				});
				break;
			}
			case "false|true|false|true": {
				// 先降水后 CLEAR, 再降水再 CLEAR, 是 STOP_START + START_STOP
				const STOP1 = summaries[0]; // STOP 时期 1
				const CLEAR1 = summaries[1]; // CLEAR 时期 1
				const STOP2 = summaries[2]; // STOP 时期 2
				const CLEAR2 = summaries[3]; // CLEAR 时期 2
				// STOP1 期间显示为 STOP_START
				Conditions.push({
					beginCondition: STOP1.beginCondition, // STOP1 的开始天气
					endCondition: STOP2.beginCondition, // STOP2 的开始天气
					forecastToken: "STOP_START",
					parameters: [
						{ date: STOP1.endTime, type: "FIRST_AT" }, // STOP1 结束
						{ date: STOP2.startTime, type: "SECOND_AT" }, // STOP2 开始
					],
					startTime: STOP1.startTime, // STOP1 期间
					endTime: STOP1.endTime, // STOP1 期间
				});
				// CLEAR1 期间显示为 START_STOP
				Conditions.push({
					beginCondition: STOP2.beginCondition, // STOP 时期 2
					endCondition: STOP2.endCondition, // STOP 时期 2
					forecastToken: "START_STOP",
					parameters: [
						{ date: STOP2.startTime, type: "FIRST_AT" }, // STOP2 开始
						{ date: STOP2.endTime, type: "SECOND_AT" }, // STOP2 结束
					],
					startTime: CLEAR1.startTime, // CLEAR1 期间
					endTime: CLEAR1.endTime, // CLEAR1 期间
				});
				// STOP2 期间显示为 STOP
				Conditions.push({
					beginCondition: STOP2.beginCondition, // STOP 时期
					endCondition: STOP2.endCondition, // STOP 时期
					forecastToken: "STOP",
					parameters: [{ date: STOP2.endTime, type: "FIRST_AT" }],
					startTime: STOP2.startTime, // STOP2 期间
					endTime: STOP2.endTime, // STOP2 期间
				});
				// CLEAR2 期间显示为 CLEAR
				Conditions.push({
					beginCondition: CLEAR2.beginCondition, // CLEAR 时期
					endCondition: CLEAR2.beginCondition, // CLEAR 时期
					forecastToken: "CLEAR",
					parameters: [],
					startTime: CLEAR2.startTime, // CLEAR2 期间
					endTime: 0, // CLEAR2 期间
				});
				break;
			}
			case "true|false|true|false": {
				// 先 CLEAR 后降水, 再 CLEAR 再降水, 是 START_STOP + STOP_START
				const CLEAR1 = summaries[0]; // CLEAR1 时期
				const START1 = summaries[1]; // START1 时期
				const CLEAR2 = summaries[2]; // CLEAR2 时期
				const START2 = summaries[3]; // START2 时期
				// CLEAR1 期间显示为 START_STOP
				Conditions.push({
					beginCondition: START1.beginCondition, // START1 的开始天气
					endCondition: START1.endCondition, // START1 的结束天气
					forecastToken: "START_STOP",
					parameters: [
						{ date: START1.startTime, type: "FIRST_AT" }, // CLEAR1 结束
						{ date: START1.endTime, type: "SECOND_AT" }, // CLEAR2 开始
					],
					startTime: CLEAR1.startTime, // CLEAR1 期间
					endTime: CLEAR1.endTime, // CLEAR1 期间
				});
				// START1 期间显示为 STOP_START
				Conditions.push({
					beginCondition: START1.endCondition, // START1 的结束天气
					endCondition: START2.beginCondition, // START2 的开始天气
					forecastToken: "STOP_START",
					parameters: [
						{ date: START1.endTime, type: "FIRST_AT" }, // START1 结束
						{ date: START2.startTime, type: "SECOND_AT" }, // START2 开始
					],
					startTime: START1.startTime, // START1 期间
					endTime: START1.endTime, // START1 期间
				});
				// CLEAR2 期间显示为 START
				Conditions.push({
					beginCondition: START2.beginCondition, // START2 的开始天气
					endCondition: START2.beginCondition, // START2 的开始天气
					forecastToken: "START",
					parameters: [{ date: START2.startTime, type: "FIRST_AT" }],
					startTime: CLEAR2.startTime, // CLEAR2 期间
					endTime: CLEAR2.endTime, // CLEAR2 期间
				});
				// START2 期间显示为 CONSTANT
				Conditions.push({
					beginCondition: START2.beginCondition, // START2 时期
					endCondition: START2.beginCondition, // START2 时期
					forecastToken: "CONSTANT",
					parameters: [],
					startTime: START2.startTime, // START2 期间
					endTime: 0, // START2 期间
				});
				break;
			}
		}
		// 先通过 summaries 找锚点和区间
		summaries.forEach((summary, i) => {
			// 先截取符合的区间
			let condition = minutes.filter(minute => minute.timestamp >= summary.startTime && minute.timestamp <= summary.endTime);
		});
		Console.debug(`Conditions: ${JSON.stringify(Conditions, null, 2)}`);
		Console.info("✅ Condition");
		return Conditions;
	}

	static #ConvertPrecipitationIntensity(precipitationIntensity, units = "mmph") {
		//Console.info("☑️ ConvertPrecipitationIntensity");
		//Console.debug(`precipitationIntensity: ${precipitationIntensity}`, `units: ${units}`);
		const Range = ForecastNextHour.#Configs.Precipitation.Range[units];
		let perceivedPrecipitationIntensity = 0;

		if (precipitationIntensity === 0) {
			// 无降水
			perceivedPrecipitationIntensity = 0;
		} else if (precipitationIntensity > Range.NO[0] && precipitationIntensity <= Range.NO[1]) {
			// 轻微降水，可能感知不到
			perceivedPrecipitationIntensity = 0; // 轻微降水通常感知不到
		} else if (precipitationIntensity > Range.LIGHT[0] && precipitationIntensity <= Range.LIGHT[1]) {
			// 小雨，可以感知到
			// 根据强度计算感知强度，在0-1之间
			perceivedPrecipitationIntensity = Math.min(1, (precipitationIntensity - Range.LIGHT[0]) / (Range.LIGHT[1] - Range.LIGHT[0]));
		} else if (precipitationIntensity > Range.MODERATE[0] && precipitationIntensity <= Range.MODERATE[1]) {
			// 中雨，明显感知
			// 根据强度计算感知强度，在1-2之间
			perceivedPrecipitationIntensity = 1 + Math.min(1, (precipitationIntensity - Range.MODERATE[0]) / (Range.MODERATE[1] - Range.MODERATE[0]));
		} else if (precipitationIntensity > Range.HEAVY[0]) {
			// 大雨，强烈感知
			// 根据强度计算感知强度，在2-3之间
			perceivedPrecipitationIntensity = 2 + Math.min(1, (precipitationIntensity - Range.HEAVY[0]) / (Range.HEAVY[1] - Range.HEAVY[0]));
		}
		//Console.debug(`perceivedPrecipitationIntensity: ${perceivedPrecipitationIntensity}`);
		//Console.info(`✅ ConvertPrecipitationIntensity`);
		return perceivedPrecipitationIntensity;
	}
}
