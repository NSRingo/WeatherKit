import { Console } from "@nsnanocat/util";

export default class ForecastNextHour {
	Name = "ForecastNextHour";
	Version = "v1.4.4";
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
				/* 新标准不好用
				"mmph": {
					"NO": [0, 0.0606],
					"LIGHT": [0.0606, 0.8989],
					"MODERATE": [0.8989, 2.87],
					"HEAVY": [2.87, 12.8638],
					"STORM": [12.8638, Number.MAX_VALUE],
				},
				*/
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
			if (minute.perceivedPrecipitationIntensity === 0) {
				// 无降水
				minute.condition = "CLEAR";
				minute.summaryCondition = "CLEAR";
				if (minute.precipitationIntensity >= 0.1 || minute.precipitationChance >= 35) {
					// 小雨，可以感知到
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
				}
			} else if (minute.perceivedPrecipitationIntensity <= 1) {
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
			} else if (minute.perceivedPrecipitationIntensity <= 2) {
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
			} else {
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
		};
		const Length = Math.min(71, minutes.length);
		for (let i = 0; i < Length; i++) {
			const minute = minutes[i];
			const previousMinute = minutes[i - 1];
			switch (i) {
				case 0:
					Summary.startTime = minute.startTime;
					Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
					Summary.precipitationChance = minute.precipitationChance;
					Summary.precipitationIntensity = minute.precipitationIntensity;
					break;
				default:
					if (minute.summaryCondition !== previousMinute.summaryCondition) {
						// 结束当前summary
						Summary.endTime = minute.startTime;
						Console.debug(`Summaries[${i}]`, JSON.stringify({ ...minute, ...Summary }, null, 2));
						Summaries.push({ ...Summary });

						// 开始新的summary
						Summary.startTime = minute.startTime;
						Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
						Summary.precipitationChance = minute.precipitationChance;
						Summary.precipitationIntensity = minute.precipitationIntensity;
					} else {
						// 条件相同，更新最大值
						Summary.precipitationChance = Math.max(Summary.precipitationChance, minute.precipitationChance);
						Summary.precipitationIntensity = Math.max(Summary.precipitationIntensity, minute.precipitationIntensity);
					}
					break;
				case Length - 1:
					Summary.endTime = 0; // ⚠️空值必须写零！
					Console.debug(`Summaries[${i}]`, JSON.stringify({ ...minute, ...Summary }, null, 2));
					Summaries.push({ ...Summary });
					break;
			}
		}
		Console.info("✅ Summary");
		return Summaries;
	}

	static Condition(minutes = []) {
		Console.info("☑️ Condition");
		const Conditions = [];
		const Condition = {
			beginCondition: "CLEAR",
			endCondition: "CLEAR",
			forecastToken: "CLEAR",
			parameters: [],
			startTime: 0,
		};
		// 问题2: 苹果的实际数据显示condition的生成逻辑更复杂，需要考虑降水强度的连续性和阈值变化
		const Length = Math.min(71, minutes.length);
		for (let i = 0; i < Length; i++) {
			const minute = minutes[i];
			const previousMinute = minutes[i - 1];
			//Console.debug(`⚠️ ${i}, before, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
			switch (i) {
				case 0:
					//Console.debug(`⚠️ ${i}, before, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
					Condition.beginCondition = minute.condition;
					Condition.endCondition = minute.condition;
					Condition.startTime = minute.startTime;
					switch (minute.summaryCondition) {
						case "CLEAR": //✅
							Condition.forecastToken = "CLEAR";
							break;
						default: //✅
							Condition.forecastToken = "CONSTANT";
							break;
					}
					Condition.parameters = [];
					//Console.debug(`⚠️ ${i}, after, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
					break;
				default:
					switch (minute?.summaryCondition) {
						case previousMinute?.summaryCondition: // ✅与前次相同
							switch (minute?.condition) {
								case previousMinute?.condition: // ✅与前次相同
									break;
								default: // ✅与前次不同
									switch (Condition.forecastToken) {
										case "CONSTANT":
											Condition.endTime = minute.startTime; // ✅更新结束时间
											switch (Condition.beginCondition) {
												case Condition.endCondition: // ✅与begin相同
													Condition.parameters = [];
													Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
													Conditions.push({ ...Condition });
													break;
												default: // ✅与begin不同
													Condition.endCondition = previousMinute.condition;
													Condition.parameters = [{ date: Condition.endTime, type: "FIRST_AT" }];
													Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
													Conditions.push({ ...Condition });
													// ✅CONSTANT
													Condition.beginCondition = previousMinute.condition;
													break;
											}
											Condition.endCondition = minute.condition;
											Condition.startTime = Condition.endTime; // ✅更新开始时间
											Condition.parameters = [];
											break;
									}
									break;
							}
							break;
						default: // 与前次不同
							switch (Condition.forecastToken) {
								case "CLEAR": // ✅当前RAIN
									// ✅START
									Condition.beginCondition = minute.condition;
									Condition.endCondition = minute.condition;
									Condition.forecastToken = "START"; // ✅不推送，可能变为START_STOP
									Condition.endTime = minute.startTime; // ✅更新结束时间
									Condition.parameters = [{ date: Condition.endTime, type: "FIRST_AT" }];
									break;
								case "CONSTANT": // ✅当前CLEAR
									Conditions.length = 0; // ✅清空
									// ✅STOP
									Condition.beginCondition = minutes[0].condition; // ✅更新结束条件
									Condition.endCondition = previousMinute.condition; // ✅更新结束条件
									Condition.forecastToken = "STOP"; // ✅不推送，可能变为STOP_START
									Condition.endTime = minute.startTime; // ✅更新结束时间
									Condition.parameters = [{ date: Condition.endTime, type: "FIRST_AT" }];
									break;
								case "START": // ✅当前CLEAR
								case "STOP": // ✅当前RAIN
									// ✅确定上一个条件
									switch (Condition.forecastToken) {
										case "START":
											Condition.endCondition = previousMinute.condition; // ✅更新结束条件
											Condition.forecastToken = "START_STOP"; // ✅START_STOP
											break;
										case "STOP":
											Condition.endCondition = minute.condition; // ✅更新结束条件
											Condition.forecastToken = "STOP_START"; // ✅STOP_START
											break;
									}
									Condition.parameters.push({ date: minute.startTime, type: "SECOND_AT" });
									Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									// ✅初始化当前条件
									Condition.beginCondition = Condition.endCondition;
									switch (Condition.forecastToken) {
										case "START_STOP": // ✅STOP
											Condition.forecastToken = "STOP"; // ✅不推送，可能变为STOP_START
											break;
										case "STOP_START": // ✅START
											Condition.forecastToken = "START"; // ✅不推送，可能变为START_STOP
											break;
									}
									Condition.startTime = Condition.endTime;
									Condition.endTime = minute.startTime; // ✅更新结束时间
									Condition.parameters = [{ date: Condition.endTime, type: "FIRST_AT" }];
									break;
								case "START_STOP": // ✅当前RAIN
									Console.error(`⚠️ START_STOP\nminute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
									break;
								case "STOP_START": // ✅当前CLEAR
									Console.error(`⚠️ STOP_START\nminute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
									break;
							}
							break;
					}
					break;
				case Length - 1:
					// 问题5: 最后一个minute的处理逻辑有误，没有正确处理endTime=0的情况和最终状态的确定
					switch (Condition.forecastToken) {
						case "CLEAR": // ✅当前CLEAR
						case "CONSTANT": // ✅当前RAIN
							switch (Condition.forecastToken) {
								case "CLEAR": // ✅确定CLEAR
									Condition.beginCondition = "CLEAR";
									Condition.endCondition = "CLEAR";
									Condition.forecastToken = "CLEAR";
									break;
								case "CONSTANT": // ✅确定CONSTANT
									Condition.beginCondition = Condition.endCondition;
									break;
							}
							break;
						case "START": // ✅当前RAIN
						case "STOP": // ✅当前CLEAR
							// ✅确定
							Condition.parameters = [{ date: Condition.endTime, type: "FIRST_AT" }];
							Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
							Conditions.push({ ...Condition });
							switch (Condition.forecastToken) {
								case "START":
									// ✅补充CONSTANT
									Condition.beginCondition = Condition.endCondition;
									Condition.forecastToken = "CONSTANT";
									break;
								case "STOP":
									// ✅补充CLEAR
									Condition.beginCondition = "CLEAR";
									Condition.endCondition = "CLEAR";
									Condition.forecastToken = "CLEAR";
									break;
							}
							Condition.startTime = Condition.endTime;
							break;
						case "START_STOP": // ✅当前CLEAR
							Console.error(`⚠️ START_STOP\nminute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
							break;
						case "STOP_START": // ✅当前RAIN
							Console.error(`⚠️ STOP_START\nminute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
							break;
					}
					Condition.endTime = 0; // ⚠️空值必须写零！
					Condition.parameters = [];
					Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
					Conditions.push({ ...Condition });
					break;
			}
			//Console.debug(`⚠️ ${i}, after, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
		}
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
