import { Console } from "@nsnanocat/util";

export default class Weather {
	static Name = "Weather";
	static Version = "0.0.1";
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
}
