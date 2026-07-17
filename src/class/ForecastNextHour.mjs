import { Console } from "@nsnanocat/util";
import * as WK2 from "../proto/apple/wk2.js";

export default class ForecastNextHour {
    Name = "ForecastNextHour";
    Version = "v1.6.5";
    Author = "iRingo";

    // iOS 27 hides NextHour data once its metadata is more than 15 minutes old.
    static ExpirationInterval = 10 * 60;

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
                EXTREME: 4,
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
                    EXTREME: [0.48, Number.MAX_VALUE],
                },
                mmph: {
                    NO: [0, 0.08],
                    LIGHT: [0.08, 3.44],
                    MODERATE: [3.44, 11.33],
                    HEAVY: [11.33, 51.3],
                    EXTREME: [51.3, Number.MAX_VALUE],
                },
                precipitation: {
                    NO: [0, 0.01],
                    LIGHT: [0.01, 0.6],
                    MODERATE: [0.6, 1.65],
                    HEAVY: [1.65, 8.0],
                    EXTREME: [8.0, 205.0],
                },
            },
        },
    };

    static WeatherCondition(sentence) {
        Console.info("☑️ WeatherCondition", `sentence: ${sentence}`);
        // 完整短语排在通用词前，首次命中即可，避免“雨夹雪”又被“雪”覆盖。
        const weatherCondition = Object.entries(ForecastNextHour.#Configs.WeatherCondition).find(([key]) => sentence.includes(key))?.[1] ?? "CLEAR";
        Console.info(`✅ WeatherCondition: ${weatherCondition}`);
        return weatherCondition;
    }

    // 根据描述文本猜测降水类型
    static PrecipitationType(sentence) {
        Console.info("☑️ PrecipitationType", `sentence: ${sentence}`);
        const precipitationType = Object.entries(ForecastNextHour.#Configs.PrecipitationType).find(([key]) => sentence.includes(key))?.[1] ?? "CLEAR";
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
            startTime: 0,
            precipitationChance: 0,
            precipitationIntensity: 0,
            //beginCondition: "",
            //endCondition: "",
            maxCondition: "",
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
                    //Summary.beginCondition = minute.condition;
                    //Summary.endCondition = "";
                    Summary.maxCondition = minute.condition;
                    Summary.clear = minute.clear;
                    break;
                case Length - 1: // 最后一个
                    Summary.endTime = 0; // ⚠️空值必须写零！
                    //Summary.endCondition = minute.condition;
                    Summary.clear = minute.clear;
                    Console.debug(`Summaries[${i}]`, JSON.stringify({ ...minute, ...Summary }, null, 2));
                    Summaries.push({ ...Summary });
                    break;
                default: // 中间
                    if (minute.summaryCondition !== previousMinute.summaryCondition) {
                        // 结束当前summary
                        Summary.endTime = minute.startTime;
                        //Summary.endCondition = previousMinute.condition;
                        Console.debug(`Summaries[${i}]`, JSON.stringify({ ...previousMinute, ...Summary }, null, 2));
                        Summaries.push({ ...Summary });

                        // 开始新的summary
                        Summary.startTime = minute.startTime;
                        Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
                        Summary.precipitationChance = minute.precipitationChance;
                        Summary.precipitationIntensity = minute.precipitationIntensity;
                        //Summary.beginCondition = minute.condition;
                        //Summary.endCondition = ""; // 重置
                        Summary.maxCondition = minute.condition; // 重置
                        Summary.clear = minute.clear;
                    } else {
                        // 条件相同，更新最大值
                        Summary.precipitationChance = Math.max(Summary.precipitationChance, minute.precipitationChance);
                        Summary.precipitationIntensity = Math.max(Summary.precipitationIntensity, minute.precipitationIntensity);
                        if (Summary.precipitationIntensity === minute.precipitationIntensity) Summary.maxCondition = minute.condition;
                    }
                    break;
            }
        }
        Console.debug(`Summaries: ${JSON.stringify(Summaries, null, 2)}`);
        Console.info("✅ Summary");
        return Summaries;
    }

    static Condition(summaries = []) {
        Console.info("☑️ Condition");
        const Conditions = [];
        if (!summaries.length) {
            Console.debug(`Conditions: ${JSON.stringify(Conditions, null, 2)}`);
            Console.info("✅ Condition");
            return Conditions;
        }

        // Summary() emits alternating clear/precipitation runs. Preserve the
        // previous empty result for unsupported direct callers that violate it.
        for (let i = 1; i < summaries.length; i++) {
            if (summaries[i - 1].clear === summaries[i].clear) {
                Console.warn("Condition", `Adjacent summaries have the same clear state at indexes ${i - 1} and ${i}`);
                Console.debug(`Conditions: ${JSON.stringify(Conditions, null, 2)}`);
                Console.info("✅ Condition");
                return Conditions;
            }
        }

        for (let i = 0; i < summaries.length; i++) {
            const current = summaries[i];
            const next = summaries[i + 1];
            const afterNext = summaries[i + 2];

            if (current.clear) {
                if (!next) {
                    Conditions.push({
                        beginCondition: current.maxCondition,
                        endCondition: current.maxCondition,
                        forecastToken: "CLEAR",
                        parameters: [],
                        startTime: current.startTime,
                        endTime: 0,
                    });
                } else if (afterNext) {
                    Conditions.push({
                        beginCondition: next.maxCondition,
                        endCondition: next.maxCondition,
                        forecastToken: "START_STOP",
                        parameters: [
                            { date: next.startTime, type: "FIRST_AT" },
                            { date: next.endTime, type: "SECOND_AT" },
                        ],
                        startTime: current.startTime,
                        endTime: current.endTime,
                    });
                } else {
                    Conditions.push({
                        beginCondition: next.maxCondition,
                        endCondition: next.maxCondition,
                        forecastToken: "START",
                        parameters: [{ date: next.startTime, type: "FIRST_AT" }],
                        startTime: current.startTime,
                        endTime: current.endTime,
                    });
                }
            } else if (!next) {
                Conditions.push({
                    beginCondition: current.maxCondition,
                    endCondition: current.maxCondition,
                    forecastToken: "CONSTANT",
                    parameters: [],
                    startTime: current.startTime,
                    endTime: 0,
                });
            } else if (afterNext) {
                Conditions.push({
                    beginCondition: current.maxCondition,
                    endCondition: afterNext.maxCondition,
                    forecastToken: "STOP_START",
                    parameters: [
                        { date: current.endTime, type: "FIRST_AT" },
                        { date: afterNext.startTime, type: "SECOND_AT" },
                    ],
                    startTime: current.startTime,
                    endTime: current.endTime,
                });
            } else {
                Conditions.push({
                    beginCondition: current.maxCondition,
                    endCondition: current.maxCondition,
                    forecastToken: "STOP",
                    parameters: [{ date: current.endTime, type: "FIRST_AT" }],
                    startTime: current.startTime,
                    endTime: current.endTime,
                });
            }
        }
        // pinned WK2 schema 不认识的值会被 FlatBuffer 当成 0（CLEAR），因此整条条件必须跳过。
        const safeConditions = Conditions.filter(condition => {
            const supported = [condition.beginCondition, condition.endCondition].every(value => typeof WK2.ConditionType[value] === "number");
            if (!supported) Console.warn("Condition", `Unsupported ConditionType: ${condition.beginCondition}/${condition.endCondition}`);
            return supported;
        });
        Console.debug(`Conditions: ${JSON.stringify(safeConditions, null, 2)}`);
        Console.info("✅ Condition");
        return safeConditions;
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
