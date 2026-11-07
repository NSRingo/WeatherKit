// Parameter keys follow the fork's settings and upstream argument templates.
// Defaults reproduce the existing local module; WK3 AQ controls use shared conversion.
// `choices` documents list inputs; only scalar `options` render as single selects.
export const localParameters = [
    { key: "DataSets", type: "array", name: "[数据集]", value: "airQuality,currentWeather,forecastDaily,forecastHourly,forecastNextHour,locationInfo,news,historicalComparisons,weatherAlerts,weatherChanges", choices: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "weatherAlerts"], description: "选择要处理的数据；留空或 [] 全部保留原数据。" },
    { key: "Weather.Replace", type: "string", name: "[天气] 替换范围", value: "CN", description: "普通天气的替换地区。WK3 空气质量单独处理，不受此项限制。" },
    { key: "Weather.Provider", type: "string", name: "[天气] 数据源", value: "ColorfulClouds", options: ["WeatherKit", "ColorfulClouds", "QWeather"], optionLabels: {"WeatherKit": "WeatherKit（不替换）", "ColorfulClouds": "彩云天气", "QWeather": "和风天气"}, description: "选择普通天气来源；WK3 当前、逐日和逐小时天气仍使用 Apple 数据。" },
    { key: "Weather.ReplaceDaily", type: "boolean", name: "[天气] 替换逐日预报", value: "false", boolean: true, description: "是否替换逐日预报；仅 WK2 生效。" },
    { key: "Weather.ReplaceHourly", type: "boolean", name: "[天气] 替换逐小时预报", value: "false", boolean: true, description: "是否替换逐小时预报；仅 WK2 生效。" },
    { key: "WeatherAlerts.Provider", type: "string", name: "[天气预警] 数据源", value: "QWeatherWeb", options: ["WeatherKit", "QWeatherWeb"], optionLabels: {"WeatherKit": "WeatherKit（不修改）", "QWeatherWeb": "和风天气网页"}, description: "和风网页补全原生预警；选择 WeatherKit 保留原数据。" },
    { key: "NextHour.Provider", type: "string", name: "[未来一小时降水强度] 数据源", value: "ColorfulClouds", options: ["WeatherKit", "ColorfulClouds", "QWeather"], optionLabels: {"WeatherKit": "WeatherKit（不添加）", "ColorfulClouds": "彩云天气", "QWeather": "和风天气"}, description: "选择未来一小时雨雪分钟数据来源。" },
    { key: "AirQuality.Current.Index.Provider", type: "string", name: "[今日空气指数] 数据源", value: "Calculate", options: ["Calculate", "ColorfulCloudsUS", "ColorfulCloudsCN", "QWeather"], optionLabels: {"Calculate": "iRingo内置算法", "ColorfulCloudsUS": "彩云天气（美标，18年9月版）", "ColorfulCloudsCN": "彩云天气（国标，12年2月版）", "QWeather": "和风天气（国标，12年2月版）"}, description: "选择指数来源：iRingo内置算法、彩云或和风。" },
    { key: "AirQuality.Current.Index.Replace", type: "array", name: "[今日空气指数] 替换目标", value: "HJ6332012", choices: ["HJ6332012", "IE.AQIH", "AT.AQI", "BE.BelAQI", "UBA", "FR.ATMO", "KR.CAI", "CA.AQHI", "CZ.AQI", "NL.LKI", "EPA_NowCast", "ICARS", "EU.EAQI", "CH.KBI", "ES.MITECO", "SG.NEA", "NAQI", "DAQI", "HK.AQHI", "CN.AQHI"], description: "填写要替换的原始标准，逗号分隔；留空或 [] 不替换。" },
    { key: "AirQuality.Current.Index.ForceCNPrimaryPollutants", type: "boolean", name: "[今日空气指数] 强制主要污染物", value: "true", boolean: true, description: "国标指数不超过 50 时，仍显示主要污染物。" },
    { key: "AirQuality.Current.Pollutants.Provider", type: "string", name: "[今日污染物] 数据源", value: "ColorfulClouds", options: ["ColorfulClouds", "QWeather"], optionLabels: {"ColorfulClouds": "彩云天气", "QWeather": "和风天气"}, description: "已有 Apple 污染物优先保留；缺失时使用此来源。" },
    { key: "AirQuality.Current.Pollutants.Units.Replace", type: "array", name: "[今日污染物 - 单位转换] 替换目标", value: "[]", choices: ["EPA_NowCast", "EU.EAQI", "HJ6332012", "UBA", "CA.AQHI", "HK.AQHI", "CN.AQHI"], description: "需要转换单位的空气质量标准；留空或 [] 不转换。" },
    { key: "AirQuality.Current.Pollutants.Units.Mode", type: "string", name: "[今日污染物 - 单位转换] 模式", value: "Scale", options: ["None", "Scale", "ugm3", "EU_ppb", "US_ppb", "Force_ugm3", "Force_EU_ppb", "Force_US_ppb"], optionLabels: {"None": "不转换污染物单位", "Scale": "与空气质量标准的要求相同", "ugm3": "除非标准要求，都转为µg/m³", "EU_ppb": "除非标准要求，都转为欧盟ppb", "US_ppb": "除非标准要求，都转为美标ppb", "Force_ugm3": "µg/m³", "Force_EU_ppb": "欧盟ppb", "Force_US_ppb": "美标ppb"}, description: "Scale 跟随标准，Force 强制转换，None 保留原单位。" },
    { key: "AirQuality.Comparison.ReplaceWhenCurrentChange", type: "boolean", name: "[空气质量 - 对比昨日] 变化时替换", value: "false", boolean: true, description: "今日指数变化时，是否重新计算昨日对比。" },
    { key: "AirQuality.Comparison.Yesterday.IndexProvider", type: "string", name: "[昨日空气指数] 数据源", value: "ColorfulCloudsUS", options: ["Calculate", "ColorfulCloudsUS", "ColorfulCloudsCN", "QWeather"], optionLabels: {"Calculate": "iRingo内置算法", "ColorfulCloudsUS": "彩云天气（美标，18年9月版）", "ColorfulCloudsCN": "彩云天气（国标，12年2月版）", "QWeather": "和风天气（国标，12年2月版）"}, description: "选择昨日指数来源；仅同源、同标准的数据可比较。" },
    { key: "AirQuality.Comparison.Yesterday.PollutantsProvider", type: "string", name: "[昨日污染物] 数据源", value: "QWeather", options: ["QWeather"], optionLabels: {"QWeather": "和风天气"}, description: "内置算法计算昨日指数所需的污染物来源。" },
    { key: "AirQuality.Calculate.Algorithm", type: "string", name: "[iRingo内置算法] 算法", value: "EU_EAQI", options: ["None", "UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT", "CA_AQHI", "HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI"], optionLabels: {"None": "不转换", "UBA": "德国LQI（FB001846）", "EU_EAQI": "欧盟EAQI（ETC HE Report 2024/17）", "WAQI_InstantCast_US": "美标InstantCast（EPA-454/B-24-002）", "WAQI_InstantCast_CN": "国标InstantCast（HJ 633—2012）", "WAQI_InstantCast_CN_25_DRAFT": "国标InstantCast（HJ 633 2025年草案）", "CA_AQHI": "加拿大AQHI（10.17269/s41997-019-00237-w）", "HK_AQHI": "香港AQHI", "AQHI_Multi_CN": "AQHI-Multi（中国）", "AQHI_Multi_CN_HK": "AQHI-Multi（中国+香港）", "CN_DEATH_AQHI": "中国（致死风险）AQHI", "CN_DEATH_HK_AQHI": "中国（致死风险）+香港AQHI"}, description: "使用污染物本地计算指数；None 不转换。" },
    { key: "AirQuality.Calculate.AllowOverRange", type: "boolean", name: "[iRingo内置算法] 允许指数超标", value: "true", boolean: true, description: "允许内置美标、国标指数超过 500。" },
    { key: "API.ColorfulClouds.Token", type: "string", name: "[API] 彩云天气令牌", value: "", description: "自有彩云令牌；留空使用内置公开令牌。" },
    { key: "API.QWeather.Host", type: "string", name: "[API] 和风天气主机", value: "devapi.qweather.com", description: "和风 API 主机名；使用和风来源时填写。" },
    { key: "API.QWeather.Token", type: "string", name: "[API] 和风天气令牌", value: "", description: "和风 API 令牌；网页预警不需要。" },
    { key: "LogLevel", type: "string", name: "[调试] 日志等级", value: "INFO", options: ["OFF", "ERROR", "WARN", "INFO", "DEBUG", "ALL"], optionLabels: {"OFF": "关闭", "ERROR": "❌ 错误", "WARN": "⚠️ 警告", "INFO": "ℹ️ 信息", "DEBUG": "🅱️ 调试", "ALL": "全部"}, description: "默认 INFO；DEBUG 显示细节，OFF 关闭日志。" },
    { key: "HTTP_TIMEOUT_MS", type: "number", name: "[网络] 单次请求超时（毫秒）", value: "8000", description: "单次网络请求超时，默认 8000 毫秒。" },
];

// Select controls already show their choices; help text stays concise.
export function parameterDescription(parameter) {
    return parameter.description;
}
