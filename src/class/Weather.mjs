import { Console } from "@nsnanocat/util";

export default class Weather {
	static Name = "Weather";
	static Version = "0.2.0";
	static Author = "Virgil Clyne & 001";

	/**
	 * 将 DSWRF（W/m²）估算为 UV Index（整数）
	 * @param {number} dswrf - 向下短波辐射通量
	 * @param {number} k - UV 占比系数，可选，默认 0.04
	 * @returns {number} UV Index（四舍五入为整数）
	 */
	static ConvertDSWRF(dswrf, k = 0.04) {
		Console.log("☑️ ConvertDSWRF");
		const uvIndex = Math.round((Math.max(dswrf, 0) * k) / 0.025); // 估算 UV Index
		//Console.debug(`UV Index: ${uvIndex}`);
		Console.log("✅ ConvertDSWRF");
		// 限制结果在 0~11，并四舍五入为整数
		return Math.min(uvIndex, 11);
	}

	/**
	 * 将新的气象数组合并到原始气象数组
	 * @param {array} to - 原始气象数组
	 * @param {array} from - 新的气象数组
	 * @returns {array} 原始气象数组
	 */
	static mergeForecast(to = [], from = []) {
		let i = 0,
			j = 0;
		while (i < to.length) {
			const forecastStart = to[i].forecastStart;
			const newForecastStart = j < from.length ? from[j].forecastStart : Number.POSITIVE_INFINITY;

			if (forecastStart === newForecastStart) {
				Console.debug(`${i}: ${newForecastStart} -> ${forecastStart}`);
				// 原地把 from[j] 的字段合入 to[i]（A 冲突字段保留 or 被覆盖，看你需要）
				if (Object.hasOwn(from[j], "daytimeForecast")) from[j].daytimeForecast = { ...to[i].daytimeForecast, ...from[j].daytimeForecast };
				if (Object.hasOwn(from[j], "overnightForecast")) from[j].overnightForecast = { ...to[i].overnightForecast, ...from[j].overnightForecast };
				if (Object.hasOwn(from[j], "restOfDayForecast")) from[j].restOfDayForecast = { ...to[i].restOfDayForecast, ...from[j].restOfDayForecast };
				Object.assign(to[i], from[j]); // 或者：Object.assign(to[i], {/* 自定义映射 */})
				i++;
				j++;
			} else if (newForecastStart < forecastStart) {
				Console.debug(`${j}: ${newForecastStart} -> X`);
				j++; // 让 from 追上 to
			} else {
				Console.debug(`${i}: X -> ${forecastStart}`);
				i++; // to 无匹配，保留 to[i]
			}
		}
		return to; // 可选：返回同一个引用
	}
}
