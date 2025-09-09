import { Console } from "@nsnanocat/util";

export default class ForecastNextHour {
	Name = "ForecastNextHour";
	Version = "v1.5.1";
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
			minute.precipitationIntensity = Math.trunc(minute.precipitationIntensity * 1000000) / 1000000;
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
			} else if (minute.perceivedPrecipitationIntensity > 0.1) {
				// ❓ perceivedPrecipitationIntensity 小于 0.1, 苹果天气显示为无降水
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
			} else {
				minute.condition = "CLEAR";
				minute.summaryCondition = "CLEAR";
			}
			//Console.debug(`minutes[${i}]`, JSON.stringify(minute, null, 2));
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
				case 0: // 第一个
					Summary.startTime = minute.startTime;
					Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
					Summary.precipitationChance = minute.precipitationChance;
					Summary.precipitationIntensity = minute.precipitationIntensity;
					break;
				case Length - 1: // 最后一个
					Summary.endTime = 0; // ⚠️空值必须写零！
					Console.debug(`Summaries[${i}]`, JSON.stringify({ ...minute, ...Summary }, null, 2));
					Summaries.push({ ...Summary });
					break;
				default: // 中间
					if (minute.summaryCondition !== previousMinute.summaryCondition) {
						// 结束当前summary
						Summary.endTime = minute.startTime;
						Console.debug(`Summaries[${i}]`, JSON.stringify({ ...previousMinute, ...Summary }, null, 2));
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
			}
		}
		Console.debug(`Summaries: ${JSON.stringify(Summaries, null, 2)}`);
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
				case 0: // 第一个
					//Console.debug(`⚠️ ${i}, before, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
					Condition.beginCondition = minute.condition;
					Condition.startTime = minute.startTime;
					Condition.parameters = [];
					switch (minute.summaryCondition) {
						case "CLEAR": // ✅ 第一个, CLEAR
							Condition.forecastToken = "CLEAR";
							break;
						default: // ✅ 第一个, 其他状态
							Condition.forecastToken = "CONSTANT";
							break;
					}
					Condition.parameters = [];
					//Console.debug(`⚠️ ${i}, after, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
					break;
				case Length - 1: // 最后一个
					switch (Condition.forecastToken) {
						case "CLEAR": // ✅当前CLEAR
						case "CONSTANT": // ✅当前RAIN
							//Conditions.length = 0; // ❓ 尝试把之前都清理掉
							//Condition.startTime = minutes[0].startTime; // ✅ 如果清理, startTime 也要重置!
							// 不用做任何修改，仅补充
							Condition.endCondition = minute.condition;
							Condition.endTime = 0; // ⚠️空值必须写零！
							Condition.parameters = [];
							break;
						case "START": // ✅当前RAIN
							// ✅ 确定当前缓存条件没有机会再变成 START_STOP
							if (!Condition.endTime) Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
							if (!Condition.endCondition) Condition.endCondition = previousMinute.condition; // ✅ 当前缓存的结束条件是前一个的 condition
							if (Condition.parameters.length === 0) Condition.parameters = [{ date: Condition.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 START 的 FIRST_AT
							Console.debug(`Condition[${i}]: START`, JSON.stringify({ ...minute, ...Condition }, null, 2));
							Conditions.push({ ...Condition });
							// ✅ 必须以 CONSTANT 结尾
							Condition.beginCondition = minute.condition;
							Condition.endCondition = minute.condition;
							Condition.forecastToken = "CONSTANT";
							Condition.startTime = Condition.endTime; // 这里要紧接着上一个缓存条件的结束时间，而不是最后这个时间点
							Condition.endTime = 0; // ⚠️空值必须写零！
							Condition.parameters = [];
							break;
						case "STOP": // ✅当前CLEAR
							// ✅ 确定当前缓存条件没有机会再变成 STOP_START
							if (!Condition.endTime) Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
							if (!Condition.endCondition) Condition.endCondition = previousMinute.condition; // ✅ 当前缓存的结束条件是前一个的 condition
							if (Condition.parameters.length === 0) Condition.parameters = [{ date: Condition.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 START 的 FIRST_AT
							Console.debug(`Condition[${i}]: STOP`, JSON.stringify({ ...minute, ...Condition }, null, 2));
							Conditions.push({ ...Condition });
							// ✅ 必须以 CLEAR 结尾
							Condition.beginCondition = "CLEAR";
							Condition.endCondition = "CLEAR";
							Condition.forecastToken = "CLEAR";
							Condition.startTime = Condition.endTime; // 这里要紧接着上一个缓存条件的结束时间，而不是最后这个时间点
							Condition.endTime = 0; // ⚠️空值必须写零！
							Condition.parameters = [];
							break;
						case "START_STOP": // 不该出现这种情况
						case "STOP_START": // 不该出现这种情况
							Console.error(`Condition[${i}]: ${Condition.forecastToken}`, JSON.stringify({ ...minute, ...Condition }, null, 2));
							break;
					}
					Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
					Conditions.push({ ...Condition });
					break;
				default: // 中间
					switch (minute.summaryCondition) {
						case previousMinute.summaryCondition: // ✅ summaryCondition 与前次相同，说明降水情况没有变化
							switch (`${previousMinute.condition}|${minute.condition}`) {
								case `${previousMinute.condition}|${previousMinute.condition}`: // ✅ condition 与前次相同，说明降水量等级也完全没变化
								case `${minute.condition}|${minute.condition}`: // ✅ condition 与前次相同，说明降水量等级也完全没变化
									break;
								case `POSSIBLE_DRIZZLE|${minute.condition}`: // POSSIBLE 不参与降水量转变描述，所以要始终单独列出
								case `${previousMinute.condition}|POSSIBLE_DRIZZLE`: // POSSIBLE 不参与降水量转变描述，所以要始终单独列出
									// ✅ 确定上次缓存条件
									Condition.endCondition = previousMinute.condition; // ✅ 上次缓存的结束条件是前一个的 condition
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 CONSTANT 的 FIRST_AT
									Console.debug(`Condition[${i}]: ${previousMinute.condition}|${minute.condition}`, JSON.stringify({ ...previousMinute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									// ✅ 初始化当前缓存条件
									// 这里我们假设下个节点依旧是 CONSTANT （只是是降水量变了，但没有停），但要等到下个节点到来才能确定是 CONSTANT 还是 STOP
									Condition.beginCondition = minute.condition;
									Condition.startTime = minute.startTime;
									Condition.endTime = undefined; // 要重置
									Condition.parameters = []; // 要重置
									// 要等到下个节点才能确认写入什么条件
									break;
								default: // 其他情况，说明依旧在降水，但降水量等级有变化
									// ✅ 确定上次缓存条件
									Condition.endCondition = previousMinute.condition; // ✅ 上次缓存的结束条件是前一个的 condition
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 CONSTANT 的 FIRST_AT
									Console.debug(`Condition[${i}]: ${previousMinute.condition}|${minute.condition}`, JSON.stringify({ ...previousMinute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									// ✅ 初始化当前缓存条件
									// 这里我们假设下个节点依旧是 CONSTANT （只是是降水量变了，但没有停），但要等到下个节点到来才能确定是 CONSTANT 还是 STOP
									Condition.beginCondition = minute.condition;
									Condition.startTime = minute.startTime;
									Condition.endTime = undefined; // 要重置
									Condition.parameters = []; // 要重置
									// 要等到下个节点才能确认写入什么条件
									break;
							}
							/*
							switch (minute?.condition) {
								case previousMinute?.condition: // ✅ condition 与前次相同，说明降水量等级也完全没变化
									break;
								case "POSSIBLE_DRIZZLE": // POSSIBLE 不参与降水量转变描述，所以要始终单独列出
									// ✅ 确定上次缓存条件
									Condition.endCondition = previousMinute.condition; // 上一个一定不是 POSSIBLE
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 CONSTANT 的 FIRST_AT
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									// ✅ 初始化当前缓存条件
									// 这里我们假设下个节点依旧是 CONSTANT （只是是降水量变了，但没有停），但要等到下个节点到来才能确定是 CONSTANT 还是 STOP
									Condition.beginCondition = minute.condition;
									Condition.startTime = minute.startTime;
									Condition.parameters = [];
									// 要等到下个节点才能确认写入什么条件
									break;
								default: // ✅ summaryCondition 与前次不同相同，但 condition 与前次不同，说明依旧在降水，但降水量等级变了
									// ✅ 确定上次缓存条件
									switch (Condition.beginCondition) {
										case "POSSIBLE_DRIZZLE": // POSSIBLE 不参与降水量转变描述，所以要始终单独列出
											Condition.endCondition = previousMinute.condition;
											Condition.parameters = [];
											break;
										default: // 其他降水量自由转变
											Condition.endCondition = minute.condition; // ✅ 上次缓存的结束条件是前一个的 condition
											Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 CONSTANT 的 FIRST_AT
											break;
									}
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									// ✅ 初始化当前缓存条件
									// 这里我们假设下个节点依旧是 CONSTANT （只是是降水量变了，但没有停），但要等到下个节点到来才能确定是 CONSTANT 还是 STOP
									Condition.beginCondition = minute.condition;
									Condition.startTime = minute.startTime;
									Condition.parameters = [];
									// 要等到下个节点才能确认写入什么条件
									break;
							}
							*/
							break;
						default: // ✅ summaryCondition 与前次不同，说明开始降水/停止降水了
							switch (Condition.forecastToken) {
								case "CLEAR": // ✅ 缓存的是 CLEAR, 说明当前是 RAIN, 开始降水了，清除之前的 CLEAR, 新建一个 START
									// ✅ 清理之前的缓存并重置
									Conditions.length = 0; // ✅ START 前面不能有 CLEAR，只能是 START/STOP_START，所以要清除前面的 CLEAR
									Condition.startTime = minutes[0].startTime; // ✅ 如果清理, startTime 也要重置!
									// ✅ 初始化当前缓存条件，CLEAR 转为 START
									// ✅ startTime 依旧要保持是 minute[0].startTime (第一个开头！)所有这里不做修改！不要移除这行注释！
									Condition.beginCondition = minute.condition; // ✅ 显然，之前都是 CLEAR ，这里第一次有降水条件
									Condition.endTime = minute.startTime;
									Condition.forecastToken = "START"; // ✅ 不推送，下一次才能确定会不会变为 START_STOP
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 START 的 FIRST_AT
									// 不推送，如果转为 START_STOP, 还需要补充 SECOND_AT
									break;
								case "CONSTANT": // ✅ 缓存的是 CONSTANT, 说明当前是 CLEAR, 结束降水了
									/*
									// ❌ 缓存的是 CONSTANT, 说明当前是 CLEAR, 结束降水了，缓存的前一个 CONSTANT 转为 STOP
									// ❓ 清理之前的缓存并重置
									Conditions.length = 0; // ❌ STOP 前面不能有 CONSTANT，只能是 STOP/STOP_START，所以要清除前面的 CONSTANT
									Condition.startTime = minutes[0].startTime; // ✅ 如果清理, startTime 也要重置!
									Condition.beginCondition = minutes[0].condition; // ❓ 测试使用第一个 condition
									*/
									// ✅ 之前的 CONSTANT 全部转为 STOP, 并在这一刻结束
									Conditions.forEach(condition => {
										// ✅ 缓存的是 CONSTANT, 说明当前是 CLEAR, 结束降水了，缓存的所有 CONSTANT 都要转为 STOP, 并在这一刻 FIRST_AT
										condition.forecastToken = "STOP";
										condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }];
										return condition;
									});
									// ✅ 初始化当前缓存条件, CONSTANT 转成 STOP
									Condition.endCondition = previousMinute.condition; // ✅ 当前缓存的结束条件是前一个的 condition
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Condition.forecastToken = "STOP"; // ✅ 不推送，下一次才能确定会不会变为 STOP_START
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // ✅ 可以确认 STOP 的 FIRST_AT
									// 不推送，如果转为 STOP_START, 还需要补充 SECOND_AT
									break;
								case "START": // ✅ 缓存的是 START, 说明当前是 CLEAR, 结束降水了，说明变成 START_STOP 了
									/*
									// 清理并重置是错误的，因为如果已有 STOP_START, 缓存是 START, 则此清理逻辑会同时将 STOP_START 清理掉, 导致无法生成 [STOP_START, START_STOP]
									// ❓ 清理之前的缓存并重置
									Conditions.length = 0; // ❓ 尝试把之前都清理掉
									Condition.startTime = minutes[0].startTime; // ✅ 如果清理, startTime 也要重置!
									Condition.beginCondition = minutes[0].condition; // ❓ 测试使用第一个 condition
									*/
									// ✅ 确定上次缓存条件
									//Condition.endCondition = Condition.beginCondition; // ❓ 尝试使用和 beginCondition 一样的值
									Condition.endCondition = previousMinute.condition; // ✅ minute.condition 是 CLEAR, 不能用
									Condition.forecastToken = "START_STOP"; // ✅ 结束降水了，变成 START_STOP 了
									Condition.parameters.push({ date: minute.startTime, type: "SECOND_AT" }); // ✅ 可以确认 START_STOP 的 SECOND_AT
									Console.debug(`Condition[${i}]: START->START_STOP`, JSON.stringify({ ...previousMinute, ...Condition }, null, 2));
									Conditions.push({ ...Condition }); // 尘埃落定，可以推送了
									// ✅ START_STOP 后面要补一个 STOP, 大致与 START_STOP 相同, FIRST_AT 为 START_STOP 的 SECOND_AT
									Condition.forecastToken = "STOP"; // ✅ 不推送，下一次才能确定会不会变为 STOP_START
									Condition.startTime = Condition.endTime; // 这里要紧接着上一个缓存条件的结束时间，而不是最后这个时间点
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }];
									// 不推送，如果转为 STOP_START, 还需要补充 SECOND_AT
									break;
								case "STOP": // ✅ 缓存的是 STOP, 说明当前是 RAIN, 又开始降水了，说明变成 STOP_START 了
									/*
									// 清理并重置是错误的，因为如果已有 START_STOP, 缓存是 STOP, 则此清理逻辑会同时将 START_STOP 清理掉, 导致无法生成 [START_STOP, STOP_START]
									// ❓ 清理之前的缓存并重置
									Conditions.length = 0; // ❓ 尝试把之前都清理掉
									Condition.startTime = minutes[0].startTime; // ✅ 如果清理, startTime 也要重置!
									Condition.beginCondition = minutes[0].condition; // ❓ 测试使用第一个 condition
									*/
									// ✅ 确定上次缓存条件
									//Condition.endCondition = Condition.beginCondition; // ❓ 尝试使用和 beginCondition 一样的值
									Condition.endCondition = minute.condition; // ✅ previousMinute.condition 是 CLEAR, 不能用
									Condition.forecastToken = "STOP_START"; // ✅ 开始降水了，变成 STOP_START 了
									Condition.parameters.push({ date: minute.startTime, type: "SECOND_AT" }); // ✅ 可以确认 STOP_START 的 SECOND_AT
									Console.debug(`Condition[${i}]: STOP->STOP_START`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition }); // 尘埃落定，可以推送了
									// ✅ STOP_START 后面要补一个 START, 大致与 STOP_START 相同, FIRST_AT 为 STOP_START 的 SECOND_AT
									Condition.forecastToken = "START"; // ✅ 不推送，下一次才能确定会不会变为 START_STOP
									Condition.startTime = Condition.endTime; // 这里要紧接着上一个缓存条件的结束时间，而不是最后这个时间点
									Condition.endTime = minute.startTime; // ✅ 结束时间永远是新起点的 startTime
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }];
									// 不推送，如果转为 STOP_START, 还需要补充 SECOND_AT
									break;
								case "START_STOP": // 不该出现这种情况
								case "STOP_START": // 不该出现这种情况
									Console.error(`Condition[${i}]: ${Condition.forecastToken}`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									break;
							}
							break;
					}
					break;
			}
			//Console.debug(`⚠️ ${i}, after, minute: ${JSON.stringify(minute, null, 2)}\nCondition: ${JSON.stringify(Condition, null, 2)}`);
			/*
			Console.debug(`${previousMinute?.summaryCondition}|${minute?.summaryCondition}:${Condition.forecastToken}`);
			switch (i) {
				case 0: // 第一个
					switch (minute.summaryCondition) {
						case "CLEAR": // 第一个, CLEAR
							Condition.forecastToken = "CLEAR";
							Condition.beginCondition = minute.condition;
							Condition.startTime = minute.startTime;
							break;
						default: // 第一个, 其他状态
							Condition.forecastToken = "CONSTANT";
							Condition.beginCondition = minute.condition;
							Condition.startTime = minute.startTime;
							break;
					}
					break;
				case Length - 1: // 最后一个
					switch (minute?.summaryCondition) {
						case "CLEAR": // 最后一个, CLEAR
							// ✅确定上一个条件
							Condition.forecastToken = "CLEAR";
							Condition.endCondition = previousMinute.condition;
							Condition.endTime = previousMinute.startTime;
							Console.debug(`Condition[${i}]`, JSON.stringify({ ...previousMinute, ...Condition }, null, 2));
							Conditions.push({ ...Condition });
							break;
						default: // 最后一个, 其他状态
							Condition.forecastToken = "CONSTANT";
							Condition.endCondition = previousMinute.condition;
							Condition.endTime = previousMinute.startTime;
							Console.debug(`Condition[${i}]`, JSON.stringify({ ...previousMinute, ...Condition }, null, 2));
							Conditions.push({ ...Condition });
							break;
					}
					break;
				default: // 中间
					switch (`${previousMinute?.summaryCondition}|${minute?.summaryCondition}`) {
						case "CLEAR|CLEAR": //没变
						case "RAIN|RAIN": // 没变
						case "SNOW|SNOW": // 没变
						case "undefined|undefined": // 不存在
							break;
						case `CLEAR|${minute.summaryCondition}`:
							// 判断现在缓存中的 Condition
							switch (Condition.forecastToken) {
								case "CLEAR": // 上一个是 CLEAR，说明首次开始，这里就是 START
									// ✅确定上一个条件
									Conditions.forecastToken = "CLEAR"; // 不变
									Condition.endCondition = previousMinute.summaryCondition;
									Condition.endTime = minute.startTime; // 结束时间永远是新起点的 startTime
									Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									break;
								case "STOP": // 上一个是 STOP，说明才结束又开始了，直接变成 STOP_START
									// ✅确定上一个条件
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // 这里要填充 STOP 的第一个节点
									Condition.forecastToken = "STOP_START"; // 变了
									Condition.endCondition = previousMinute.condition;
									Condition.endTime = minute.startTime; // 结束时间永远是新起点的 startTime
									// STOP_START 的第二个节点要等到 START 结束后补充 (STOP_START 与 START 的部分是重叠的)
									// STOP_START 不能立刻推送，因为要等补充第二个节点后再推送
									break;
								case "START_STOP": // 上一个是 START_STOP，视为和 CLEAR 一样，说明再次开始，这里就是 START
									// 补充 START_STOP 的第二个节点
									Condition.parameters.push({ date: minute.startTime, type: "SECOND_AT" }); // 这里要填充 START_STOP 的第二个节点
									// ✅确定上一个条件
									Condition.forecastToken = "START_STOP"; // 不变
									Condition.endCondition = previousMinute.summaryCondition;
									Condition.endTime = minute.startTime; // 结束时间永远是新起点的 startTime
									Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									break;
							}
							// ✅初始化当前条件
							Condition.beginCondition = minute.condition;
							Condition.startTime = minute.startTime;
							break;
						case `${previousMinute.summaryCondition}|CLEAR`: // 到 CLEAR 结束
							// 判断现在缓存中的 Condition
							switch (Condition.forecastToken) {
								case "CONSTANT": // 上一个是 CONSTANT, 说明与上一个 START 有间隔，这里应该变成 STOP
									Condition.forecastToken = "STOP";
									Condition.endCondition = previousMinute.summaryCondition;
									Condition.endTime = minute.startTime;
									// STOP 的第一个节点要等到 START 结束后补充 (STOP_START 与 START 的部分是重叠的)
									// STOP 不能立刻推送，因为不确定会不会变成 STOP_START
									break;
								case "START": // 上一个是 START，说明才开始就结束了，直接变成 START_STOP
									// ✅确定上一个条件
									Condition.parameters = [{ date: minute.startTime, type: "FIRST_AT" }]; // 这里要填充 START 的第一个节点
									Condition.forecastToken = "START_STOP"; // 变了
									Condition.endCondition = previousMinute.summaryCondition;
									Condition.endTime = minute.startTime; // 结束时间永远是新起点的 startTime
									// START_STOP 的第二个节点要等到 STOP 结束后补充 (START_STOP 与 STOP 的部分是重叠的)
									// START_STOP 不能立刻推送，因为要等补充第二个节点后再推送
									break;
								case "STOP_START": // 上一个是 STOP_START，说明才结束又开始了，直接变成 STOP_START
									// ✅确定上一个条件
									Condition.parameters.push({ date: minute.startTime, type: "SECOND_AT" }); // 这里要填充 STOP_START 的第二个节点
									Condition.forecastToken = "STOP_START"; // 不变
									Condition.endCondition = previousMinute.summaryCondition;
									Condition.endTime = minute.startTime; // 结束时间永远是新起点的 startTime
									// STOP_START 的第二个节点要等到 START 结束后补充 (STOP_START 与 START 的部分是重叠的)
									Console.debug(`Condition[${i}]`, JSON.stringify({ ...minute, ...Condition }, null, 2));
									Conditions.push({ ...Condition });
									break;
							}
							// ✅初始化当前条件
							Condition.beginCondition = minute.condition;
							Condition.startTime = minute.startTime;
							break;
					}
					break;
			}
			*/
		}
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

		// 使用Math.trunc保留一位小数（性能最快，截断不四舍五入）
		perceivedPrecipitationIntensity = Math.trunc(perceivedPrecipitationIntensity * 1000) / 1000;

		//Console.debug(`perceivedPrecipitationIntensity: ${perceivedPrecipitationIntensity}`);
		//Console.info(`✅ ConvertPrecipitationIntensity`);
		return perceivedPrecipitationIntensity;
	}
}
