// Code by Claude
export default class SimplePrecisionMath {
	/**
	 * 获取数字的小数位数
	 */
	static getDecimalLength(num) {
		const str = String(num);
		const decimalIndex = str.indexOf(".");
		return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
	}

	/**
	 * 乘法
	 */
	static multiply(a, b, decimals = 15) {
		const numA = Number(a.toFixed(decimals));
		const numB = Number(b.toFixed(decimals));

		const lenA = SimplePrecisionMath.getDecimalLength(numA);
		const lenB = SimplePrecisionMath.getDecimalLength(numB);

		const factorA = 10 ** lenA;
		const factorB = 10 ** lenB;

		const intA = Math.round(numA * factorA);
		const intB = Math.round(numB * factorB);

		const result = (intA * intB) / (factorA * factorB);

		return Number(result.toFixed(decimals));
	}

	/**
	 * 除法
	 */
	static divide(a, b, decimals = 15) {
		if (b === 0) {
			throw new Error("除数不能为0");
		}

		const numA = Number(a.toFixed(decimals));
		const numB = Number(b.toFixed(decimals));

		const lenA = SimplePrecisionMath.getDecimalLength(numA);
		const lenB = SimplePrecisionMath.getDecimalLength(numB);

		const factorA = 10 ** lenA;
		const factorB = 10 ** lenB;

		const intA = Math.round(numA * factorA);
		const intB = Math.round(numB * factorB);

		const result = (intA / intB) * (factorB / factorA);

		return Number(result.toFixed(decimals));
	}

	/**
	 * 加法
	 */
	static add(a, b, decimals = 15) {
		const numA = Number(a.toFixed(decimals));
		const numB = Number(b.toFixed(decimals));

		const lenA = SimplePrecisionMath.getDecimalLength(numA);
		const lenB = SimplePrecisionMath.getDecimalLength(numB);
		const maxLen = Math.max(lenA, lenB);
		const factor = 10 ** maxLen;

		const intA = Math.round(numA * factor);
		const intB = Math.round(numB * factor);

		return Number(((intA + intB) / factor).toFixed(decimals));
	}

	/**
	 * 减法
	 */
	static subtract(a, b, decimals = 15) {
		const numA = Number(a.toFixed(decimals));
		const numB = Number(b.toFixed(decimals));

		const lenA = SimplePrecisionMath.getDecimalLength(numA);
		const lenB = SimplePrecisionMath.getDecimalLength(numB);
		const maxLen = Math.max(lenA, lenB);
		const factor = 10 ** maxLen;

		const intA = Math.round(numA * factor);
		const intB = Math.round(numB * factor);

		return Number(((intA - intB) / factor).toFixed(decimals));
	}
}
