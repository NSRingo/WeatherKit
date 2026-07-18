import { Console, fetch } from "@nsnanocat/util";
import * as WK2 from "@nsringo/weatherkit";

/**
 * MatchEnum - 用于比对 JSON 接口和 Flatbuffer 接口的枚举值是否一致
 *
 * 变量命名约定：
 * - jsonValue: JSON 接口返回的枚举字符串值，如 "RAIN", "MINOR"
 * - protoValue: Flatbuffer 接口返回的枚举字符串值，如 "RAIN", "MINOR"
 * - protoEnumIndex: 枚举的数字索引，如 WK2.Severity["MINOR"] = 4
 *
 * 比较逻辑：jsonValue 与 protoValue 进行字符串比较
 * 通知格式：json: {jsonValue} / proto: {protoEnumIndex}-{protoValue}
 */
export default class MatchEnum {
    constructor(proto) {
        this.Name = "MatchEnum";
        this.Version = "0.0.3";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.request = $request;
        this.json = {};
        this.proto = proto;
    }

    async init() {
        if (this.request.headers.Accept) this.request.headers.Accept = "application/json";
        if (this.request.headers.accept) this.request.headers.accept = "application/json";

        try {
            this.json = await fetch(this.request).then(res => JSON.parse(res?.body ?? "{}"));
        } catch (error) {
            Console.error("初始化过程中发生错误:", error);
        }
    }

    airQuality() {
        const jsonTime = this.json?.airQuality?.metadata?.reportedTime;
        const protoTime = this.proto?.airQuality?.metadata?.reportedTime;
        const jsonValue = this.json?.airQuality?.previousDayComparison;
        const protoValue = this.proto?.airQuality?.previousDayComparison;
        const protoEnumIndex = WK2.ComparisonTrend[protoValue];
        if (jsonValue !== protoValue) {
            $notification.post("ComparisonTrend", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
        }
        this.json?.airQuality?.pollutants?.forEach(pollutant => {
            const jsonValue = pollutant?.pollutantType;
            const protoEnumIndex = WK2.PollutantType[pollutant?.pollutantType];
            const protoValue = WK2.PollutantType[protoEnumIndex];
            if (jsonValue !== protoValue) {
                $notification.post("PollutantType", "", `json: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
        this.json?.airQuality?.pollutants?.forEach(pollutant => {
            const jsonValue = pollutant?.units;
            const protoEnumIndex = WK2.UnitType[pollutant?.units];
            const protoValue = WK2.UnitType[protoEnumIndex];
            if (jsonValue !== protoValue) {
                $notification.post("UnitType", "", `json: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    weatherCondition() {
        const jsonTime = this.json?.currentWeather?.metadata?.reportedTime;
        const protoTime = this.proto?.currentWeather?.metadata?.reportedTime;
        const jsonValue = this.json?.currentWeather?.conditionCode;
        const protoValue = this.proto?.currentWeather?.conditionCode;
        const protoEnumIndex = WK2.WeatherCondition[protoValue];
        if (jsonValue !== protoValue) {
            $notification.post("WeatherCondition", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
        }
    }

    pressureTrend() {
        const jsonTime = this.json?.currentWeather?.metadata?.reportedTime;
        const protoTime = this.proto?.currentWeather?.metadata?.reportedTime;
        const jsonValue = this.json?.currentWeather?.pressureTrend;
        const protoValue = this.proto?.currentWeather?.pressureTrend;
        const protoEnumIndex = WK2.PressureTrend[protoValue];
        if (jsonValue !== protoValue) {
            $notification.post("PressureTrend", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
        }
    }

    conditionType() {
        this.json?.forecastNextHour?.condition?.forEach(condition => {
            const jsonValue = condition?.beginCondition;
            const jsonStartTime = condition?.startTime;
            const protoCondition = this.proto?.forecastNextHour?.condition?.find(c => c?.startTime === jsonStartTime);
            const protoValue = protoCondition?.beginCondition;
            const protoEnumIndex = WK2.ConditionType[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("ConditionType", "", `startTime: ${jsonStartTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    forecastToken() {
        this.json?.forecastNextHour?.condition?.forEach(condition => {
            const jsonValue = condition?.forecastToken;
            const jsonStartTime = condition?.startTime;
            const protoCondition = this.proto?.forecastNextHour?.condition?.find(c => c?.startTime === jsonStartTime);
            const protoValue = protoCondition?.forecastToken;
            const protoEnumIndex = WK2.ForecastToken[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("ForecastToken", "", `startTime: ${jsonStartTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    severity() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.severity;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.severity;
            const protoEnumIndex = WK2.Severity[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("Severity", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    significanceType() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.significance;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.significance;
            const protoEnumIndex = WK2.SignificanceType[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("SignificanceType", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    urgency() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.urgency;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.urgency;
            const protoEnumIndex = WK2.Urgency[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("Urgency", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    certainty() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.certainty;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.certainty;
            const protoEnumIndex = WK2.Certainty[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("Certainty", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    importanceType() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.importance;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.importance;
            const protoEnumIndex = WK2.ImportanceType[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("ImportanceType", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    responseType() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            alert?.responses?.forEach((response, j) => {
                const jsonValue = response;
                const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.responses?.[j];
                const protoEnumIndex = WK2.ResponseType[protoValue];
                if (jsonValue !== protoValue) {
                    $notification.post("ResponseType", "", `json[${i}][${j}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
                }
            });
        });
    }

    placementType() {
        this.json?.news?.placements?.forEach((jsonPlacement, i) => {
            const jsonArticleIds = jsonPlacement?.articles?.map(a => a?.id) ?? [];
            const jsonHeadlines = jsonPlacement?.articles?.map(a => a?.headlineOverride) ?? [];
            // 通过 articles 的 id 或 headlineOverride 匹配对应的 proto placement
            let protoIndex = -1;
            const protoPlacement = this.proto?.news?.placements?.find((p, idx) => {
                const protoArticleIds = p?.articles?.map(a => a?.id) ?? [];
                const protoHeadlines = p?.articles?.map(a => a?.headlineOverride) ?? [];
                // 检查是否有相同的 article id 或 headline
                const matched = jsonArticleIds.some(id => protoArticleIds.includes(id)) || jsonHeadlines.some(h => h && protoHeadlines.includes(h));
                if (matched) protoIndex = idx;
                return matched;
            });
            if (protoPlacement) {
                const jsonValue = jsonPlacement?.placement;
                const protoValue = protoPlacement?.placement;
                const protoEnumIndex = WK2.PlacementType[protoValue];
                if (jsonValue !== protoValue) {
                    const headline = jsonHeadlines[0] ?? jsonArticleIds[0] ?? "";
                    $notification.post("PlacementType", "", `article: ${headline}\njson[${i}]: ${jsonValue}\nproto[${protoIndex}]: ${protoEnumIndex}-${protoValue}`);
                }
            }
        });
    }
}
