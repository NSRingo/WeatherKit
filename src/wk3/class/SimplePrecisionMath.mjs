export default class SimplePrecisionMath {
    /**
     * 乘法
     */
    static multiply(a, b, _decimals = 15) {
        return a * b;
    }

    /**
     * 除法
     */
    static divide(a, b, _decimals = 15) {
        return b === 0 ? 0 : a / b;
    }

    /**
     * 加法
     */
    static add(a, b, _decimals = 15) {
        return a + b;
    }

    /**
     * 减法
     */
    static subtract(a, b, _decimals = 15) {
        return a - b;
    }
}
