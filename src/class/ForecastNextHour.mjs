import { Console } from "@nsnanocat/util";

export default class ForecastNextHour {
	Name = "ForecastNextHour";
	Version = "v1.3.2";
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

	static ConditionType(precipitationIntensity, precipitationType, units = "mmph") {
		// refer: https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/precip.html
		//Console.info("☑️ ConditionType");
		//Console.debug(`precipitationIntensity: ${precipitationIntensity}`, `precipitationChance: ${precipitationChance}`, `precipitationType: ${precipitationType}`);
		const Range = ForecastNextHour.#Configs.Precipitation.Range[units];
		let condition = "CLEAR";
		if (precipitationIntensity === 0) condition = "CLEAR";
		else if (precipitationIntensity > Range.NO[0] && precipitationIntensity <= Range.NO[1]) {
			switch (precipitationType) {
				case "RAIN":
					condition = "POSSIBLE_DRIZZLE";
					break;
				case "SNOW":
					condition = "POSSIBLE_FLURRIES";
					break;
				default:
					condition = `POSSIBLE_${precipitationType}`;
					break;
			}
		} else if (precipitationIntensity > Range.LIGHT[0] && precipitationIntensity <= Range.LIGHT[1]) {
			switch (precipitationType) {
				case "RAIN":
					condition = "DRIZZLE";
					break;
				case "SNOW":
					condition = "FLURRIES";
					break;
				default:
					condition = precipitationType;
					break;
			}
		} else if (precipitationIntensity > Range.MODERATE[0] && precipitationIntensity <= Range.MODERATE[1]) {
			switch (precipitationType) {
				case "RAIN":
					condition = "RAIN";
					break;
				case "SNOW":
					condition = "SNOW";
					break;
				default:
					condition = precipitationType;
					break;
			}
		} else if (precipitationIntensity > Range.HEAVY[0]) {
			switch (precipitationType) {
				case "RAIN":
					condition = "HEAVY_RAIN";
					break;
				case "SNOW":
					condition = "HEAVY_SNOW";
					break;
				default:
					condition = precipitationType;
					break;
			}
		}
		//Console.info(`✅ #ConditionType: ${condition}`);
		return condition;
	}

	static Minute(minutes = [], description = "", units = "mmph") {
		Console.info("☑️ Minute");
		const PrecipitationType = ForecastNextHour.PrecipitationType(description);
		minutes = minutes.map(minute => {
			//minute.precipitationIntensity = Math.round(minute.precipitationIntensity * 1000000) / 1000000; // 六位小数
			minute.condition = ForecastNextHour.ConditionType(minute.precipitationIntensity, PrecipitationType, units);
			minute.perceivedPrecipitationIntensity = ForecastNextHour.ConvertPrecipitationIntensity(minute.precipitationIntensity, minute.condition, units);
			minute.precipitationType = minute.perceivedPrecipitationIntensity ? PrecipitationType : "CLEAR";
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
			let maxPrecipitationIntensity = Math.max(minute?.precipitationIntensity ?? 0, previousMinute?.precipitationIntensity ?? 0);
			let maxPrecipitationChance = Math.max(minute?.precipitationChance ?? 0, previousMinute?.precipitationChance ?? 0);
			switch (i) {
				case 0:
					Summary.startTime = minute.startTime;
					if (minute?.precipitationIntensity > 0) {
						Summary.condition = minute.precipitationType;
						Summary.precipitationChance = maxPrecipitationChance;
						Summary.precipitationIntensity = maxPrecipitationIntensity;
					}
					break;
				default:
					if (minute?.precipitationType !== previousMinute?.precipitationType) {
						Summary.endTime = minute.startTime;
						switch (Summary.condition) {
							case "CLEAR":
								break;
							default:
								Summary.precipitationChance = maxPrecipitationChance;
								Summary.precipitationIntensity = maxPrecipitationIntensity;
								break;
						}
						Summaries.push({ ...Summary });
						// reset
						Summary.startTime = minute.startTime;
						switch (Summary.condition) {
							case "CLEAR":
								Summary.condition = minute.precipitationType;
								Summary.precipitationChance = minute.precipitationChance;
								Summary.precipitationIntensity = minute.precipitationIntensity;
								break;
							default:
								Summary.condition = "CLEAR";
								Summary.precipitationChance = 0;
								Summary.precipitationIntensity = 0;
								break;
						}
						maxPrecipitationChance = 0;
						maxPrecipitationIntensity = 0;
					}
					break;
				case Length - 1:
					Summary.endTime = 0; // ⚠️空值必须写零！
					switch (Summary.condition) {
						case "CLEAR":
							break;
						default:
							Summary.precipitationChance = maxPrecipitationChance;
							Summary.precipitationIntensity = maxPrecipitationIntensity;
							break;
					}
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
					switch (minute.precipitationType) {
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
					switch (minute?.precipitationType) {
						case previousMinute?.precipitationType: // ✅与前次相同
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
													Conditions.push({ ...Condition });
													break;
												default: // ✅与begin不同
													Condition.endCondition = previousMinute.condition;
													Condition.parameters = [{ date: Condition.endTime, type: "FIRST_AT" }];
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
					Conditions.push({ ...Condition });
					break;
			}
			//Console.debug(`⚠️ ${i}, after, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
		}
		Console.info("✅ Condition");
		return Conditions;
	}

	static ConvertPrecipitationIntensity(precipitationIntensity, condition, units = "mmph") {
		//Console.info("☑️ ConvertPrecipitationIntensity");
		let perceivedPrecipitationIntensity = 0;
		const Range = ForecastNextHour.#Configs.Precipitation.Range[units];
		let level = 0;
		let range = [];
		switch (condition) {
			case "CLEAR":
				level = 0;
				range = Range.NO;
				break;
			case "POSSIBLE_DRIZZLE":
			case "POSSIBLE_FLURRIES":
				level = 0;
				range = Range.LIGHT;
				break;
			case "DRIZZLE":
			case "FLURRIES":
				level = 0;
				range = Range.LIGHT;
				break;
			case "RAIN":
			case "SNOW":
				level = 1;
				range = Range.MODERATE;
				break;
			case "HEAVY_RAIN":
			case "HEAVY_SNOW":
				level = 2;
				range = Range.HEAVY;
				break;
		}
		perceivedPrecipitationIntensity = level + (precipitationIntensity - range[0]) / (range[1] - range[0]);
		perceivedPrecipitationIntensity = Math.round(perceivedPrecipitationIntensity * 1000) / 1000;
		perceivedPrecipitationIntensity = Math.max(0, perceivedPrecipitationIntensity);
		perceivedPrecipitationIntensity = Math.min(3, perceivedPrecipitationIntensity);
		//Console.info(`✅ ConvertPrecipitationIntensity: ${perceivedPrecipitationIntensity}`);
		return perceivedPrecipitationIntensity;
	}
}
