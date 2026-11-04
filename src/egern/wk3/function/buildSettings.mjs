import { Console, get, set, merge } from "../utils/index.mjs";

/**
 * 将字符串值转换为数字（如果是纯数字字符串）
 * @param {string} string
 * @returns {string|number}
 */
function string2number(string) {
    if (/^\d+$/.test(string)) return Number.parseInt(string, 10);
    return string;
}

/**
 * 将逗号分隔的字符串转为数组
 * @param {string|number|boolean|any} value
 * @returns {any[]}
 */
function value2array(value) {
    switch (typeof value) {
        case "string":
            return value.split(",");
        case "number":
        case "boolean":
            return [value];
        default:
            return value || [];
    }
}

/**
 * 深度遍历对象，对每个叶子节点执行回调函数
 * @param {object} o
 * @param {function} c
 * @returns {object}
 */
function traverseObject(o, c) {
    for (const t in o) {
        const n = o[t];
        o[t] = "object" === typeof n && null !== n ? traverseObject(n, c) : c(t, n);
    }
    return o;
}

/**
 * 将 Settings 中特定路径的字符串值规范化为数组
 * @param {object} Settings
 * @param {string} path - 点分隔路径，如 "Weather.Replace"
 */
function string2array(Settings, path) {
    const setting = get(Settings, path);
    if (!Array.isArray(setting)) set(Settings, path, setting ? [setting] : []);
}

/**
 * 构建请求级配置（纯函数，无全局副作用）
 *
 * 替代原来的 setENV → getStorage 调用链。
 * 每次请求独立构建，不读写任何模块级或全局状态。
 *
 * @param {object} database - 默认数据库配置（database.mjs）
 * @param {object} [queryArguments={}] - 请求级参数（URL query 或 base64 配置解码后的对象）
 * @returns {{ Settings: object, Configs: object }}
 */
export default function buildSettings(database, queryArguments = {}) {
    // 1. 从 database 深拷贝合并默认 Settings（Default → WeatherKit）
    const Settings = merge(
        {},
        database?.Default?.Settings,
        database?.WeatherKit?.Settings,
    );

    // 2. 合并请求级参数（请求参数优先级最高）
    if (queryArguments && typeof queryArguments === "object") {
        merge(Settings, queryArguments);
    }

    // 3. 规范化需要为数组的字段
    string2array(Settings, "Weather.Replace");
    string2array(Settings, "AirQuality.Current.Index.Replace");
    string2array(Settings, "AirQuality.Current.Pollutants.Units.Replace");

    // 4. 类型转换：字符串 "true"/"false"/"[]" → 原生类型；逗号分隔 → 数组；纯数字字符串 → number
    traverseObject(Settings, (_key, value) => {
        switch (typeof value) {
            case "string":
                switch (value) {
                    case "true":
                    case "false":
                    case "[]":
                        return JSON.parse(value);
                    default:
                        if (value.includes(",")) return value2array(value).map(item => string2number(item));
                        return string2number(value);
                }
            default:
                return value;
        }
    });

    const indexProvider = Settings?.AirQuality?.Current?.Index?.Provider;
    const calculateAlgorithm = Settings?.AirQuality?.Calculate?.Algorithm;
    const indexReplace = Settings?.AirQuality?.Current?.Index?.Replace;
    const yesterday = Settings?.AirQuality?.Comparison?.Yesterday;
    const shouldReplaceChinaScaleForNonCNIndex = indexProvider === "ColorfulCloudsUS"
        || (indexProvider === "Calculate" && ["WAQI_InstantCast_US", "EU_EAQI", "UBA"].includes(calculateAlgorithm));
    if (shouldReplaceChinaScaleForNonCNIndex && Array.isArray(indexReplace) && !indexReplace.includes("HJ6332012")) {
        indexReplace.unshift("HJ6332012");
    }
    if (yesterday && indexProvider === "ColorfulCloudsUS" && yesterday.IndexProvider === "ColorfulCloudsCN") {
        yesterday.IndexProvider = "ColorfulCloudsUS";
    } else if (yesterday && indexProvider === "Calculate" && shouldReplaceChinaScaleForNonCNIndex && yesterday.IndexProvider === "ColorfulCloudsCN") {
        yesterday.IndexProvider = "Calculate";
    }

    // 5. 构建 Configs（深拷贝合并，并将 Locale/i18n 转为 Map）
    const Configs = merge(
        {},
        database?.Default?.Configs,
        database?.WeatherKit?.Configs,
    );
    if (Configs.Locale) Configs.Locale = new Map(Configs.Locale);
    if (Configs.i18n) {
        for (const type in Configs.i18n) {
            Configs.i18n[type] = new Map(Configs.i18n[type]);
        }
    }

    Console.info("[buildSettings] Settings:", JSON.stringify(Settings, null, 2));

    return { Settings, Configs };
}
