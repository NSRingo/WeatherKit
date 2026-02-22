import { defineConfig } from "@iringo/arguments-builder";

type Arg = {
	key: string;
	type: "string" | "number" | "boolean" | "array";
	boxJsType?: "number" | "boolean" | "text" | "slider" | "textarea" | "radios" | "checkboxes" | "colorpicker" | "selects" | "modalSelects" | undefined;
	name?: string | undefined;
	description?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Copy from upstream `@iringo/arguments-builder`
	defaultValue?: any;
	options?:
		| {
				key: string;
				label?: string | undefined;
		  }[]
		| undefined;
	placeholder?: string | undefined;
	exclude?: ("surge" | "loon" | "boxjs" | "dts")[] | undefined;
};

export const output = {
	surge: {
		path: "./dist/iRingo.WeatherKit.sgmodule",
		transformEgern: {
			enable: true,
			path: "./dist/iRingo.WeatherKit.yaml",
		},
	},
	loon: {
		path: "./dist/iRingo.WeatherKit.plugin",
	},
	customItems: [
		{
			path: "./dist/iRingo.WeatherKit.snippet",
			template: "./template/quantumultx.handlebars",
		},
		{
			path: "./dist/iRingo.WeatherKit.stoverride",
			template: "./template/stash.handlebars",
		},
	],
	dts: {
		isExported: true,
		path: "./src/types.d.ts",
	},
	boxjsSettings: {
		path: "./template/boxjs.settings.json",
		scope: "@iRingo.WeatherKit.Settings",
	},
};

const dataSets: Arg[] = [
	{
		key: "DataSets",
		name: "[数据集]",
		defaultValue: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "locationInfo", "news", "historicalComparisons", "weatherAlerts", "weatherChanges"],
		type: "array",
		description: "选中的数据集会被包含在请求中。",
		options: [
			{ key: "airQuality", label: "空气质量" },
			{ key: "currentWeather", label: "当前天气" },
			{ key: "forecastDaily", label: "每日预报" },
			{ key: "forecastHourly", label: "每小时预报" },
			{ key: "forecastNextHour", label: "未来一小时降水强度" },
			{ key: "locationInfo", label: "位置信息" },
			{ key: "news", label: "新闻" },
			{ key: "historicalComparisons", label: "历史对比" },
			{ key: "weatherAlerts", label: "天气预警" },
			{ key: "weatherChanges", label: "天气变化" },
		],
	},
];

const weatherReplace: Arg = {
	key: "Weather.Replace",
	name: "[天气] 替换范围",
	defaultValue: ["CN"],
	type: "array",
	description: "正则表达式，只替换指定地区的天气。",
};

const weatherProvider: Arg = {
	key: "Weather.Provider",
	name: "[天气] 数据源",
	defaultValue: "ColorfulClouds",
	type: "string",
	options: [
		{ key: "WeatherKit", label: "WeatherKit（不替换）" },
		{ key: "ColorfulClouds", label: "彩云天气" },
		{ key: "QWeather", label: "和风天气" },
	],
	description: "使用选定的数据源替换天气数据。",
};

export const weather = [weatherProvider];
const weatherFull = [weatherReplace, weatherProvider];

const nextHourProvider: Arg = {
	key: "NextHour.Provider",
	name: "[未来一小时降水强度] 数据源",
	defaultValue: "ColorfulClouds",
	type: "string",
	options: [
		{ key: "WeatherKit", label: "WeatherKit（不添加）" },
		{ key: "ColorfulClouds", label: "彩云天气" },
		{ key: "QWeather", label: "和风天气" },
	],
	description: "使用选定的数据源填充未来一小时降水强度的数据。",
};

export const nextHour = [nextHourProvider];
const nextHourFull = [nextHourProvider];

const airQualityCurrentPollutantsProvider: Arg = {
	key: "AirQuality.Current.Pollutants.Provider",
	name: "[今日污染物] 数据源",
	defaultValue: "ColorfulClouds",
	type: "string",
	options: [
		{ key: "ColorfulClouds", label: "彩云天气" },
		{ key: "QWeather", label: "和风天气" },
	],
	description: "使用选定的数据源填补污染物数据。",
};

const airQualityCurrentPollutantsUnitsReplace: Arg = {
	key: "AirQuality.Current.Pollutants.Units.Replace",
	name: "[今日污染物 - 单位转换] 替换目标",
	defaultValue: [],
	type: "array",
	options: [
		{ key: "EPA_NowCast", label: "美国AQI（EPA_NowCast）" },
		{ key: "EU.EAQI", label: "欧盟EAQI（EU.EAQI）" },
		{ key: "HJ6332012", label: "中国AQI（HJ6332012）" },
		{ key: "UBA", label: "德国LQI（UBA）" },
	],
	description: "转换污染物的单位，方便与空气质量标准比对。单位转换会产生小数，有略微精度损失，且小数部分可能会被省略。",
};

const airQualityCurrentPollutantsUnitsMode: Arg = {
	key: "AirQuality.Current.Pollutants.Units.Mode",
	name: "[今日污染物 - 单位转换] 模式",
	defaultValue: "Scale",
	type: "string",
	options: [
		{ key: "Scale", label: "与空气质量标准的要求相同" },
		{ key: "ugm3", label: "除非标准要求，都转为µg/m³" },
		{ key: "EU_ppb", label: "除非标准要求，都转为欧盟ppb" },
		{ key: "US_ppb", label: "除非标准要求，都转为美标ppb" },
		{ key: "Force_ugm3", label: "µg/m³" },
		{ key: "Force_EU_ppb", label: "欧盟ppb" },
		{ key: "Force_US_ppb", label: "美标ppb" },
	],
	description: "污染物单位的转换目标。",
};

const airQualityCurrentIndexReplace: Arg = {
	key: "AirQuality.Current.Index.Replace",
	name: "[今日空气指数] 替换目标",
	defaultValue: ["HJ6332012"],
	type: "array",
	options: [
		{ key: "HJ6332012", label: "中国AQI（HJ6332012）" },
		{ key: "IE.AQIH", label: "爱尔兰AQIH（IE.AQIH）" },
		{ key: "AT.AQI", label: "奥地利AQI（AT.AQI）" },
		{ key: "BE.BelAQI", label: "比利时BelAQI（BE.BelAQI）" },
		{ key: "UBA", label: "德国LQI（UBA）" },
		{ key: "FR.ATMO", label: "法国IQA（FR.ATMO）" },
		{ key: "KR.CAI", label: "韩国CAI（KR.CAI）" },
		{ key: "CA.AQHI", label: "加拿大AQHI（CA.AQHI）" },
		{ key: "CZ.AQI", label: "捷克AQI（CZ.AQI）" },
		{ key: "NL.LKI", label: "荷兰LKI（NL.LKI）" },
		{ key: "EPA_NowCast", label: "美国AQI（EPA_NowCast）" },
		{ key: "ICARS", label: "墨西哥ICARS（ICARS）" },
		{ key: "EU.EAQI", label: "欧盟EAQI（EU.EAQI）" },
		{ key: "CH.KBI", label: "瑞士KBI（CH.KBI）" },
		{ key: "ES.MITECO", label: "西班牙ICA（ES.MITECO）" },
		{ key: "SG.NEA", label: "新加坡PSI（SG.NEA）" },
		{ key: "NAQI", label: "印度NAQI（NAQI）" },
		{ key: "DAQI", label: "英国DAQI（DAQI）" },
	],
	description: "替换指定标准的空气质量指数。",
};

const airQualityCurrentIndexProvider: Arg = {
	key: "AirQuality.Current.Index.Provider",
	name: "[今日空气指数] 数据源",
	defaultValue: "Calculate",
	type: "string",
	options: [
		{ key: "Calculate", label: "iRingo内置算法" },
		{ key: "ColorfulCloudsUS", label: "彩云天气（美标，18年9月版）" },
		{ key: "ColorfulCloudsCN", label: "彩云天气（国标，12年2月版）" },
		{ key: "QWeather", label: "和风天气（国标，12年2月版）" },
	],
	description: "使用选定的数据源填补和替换空气质量指数。",
};

const airQualityCurrentIndexForceCNPrimaryPollutants: Arg = {
	key: "AirQuality.Current.Index.ForceCNPrimaryPollutants",
	name: "[今日空气指数] 强制主要污染物",
	defaultValue: true,
	type: "boolean",
	description: "忽略国标（HJ 633—2012）的AQI > 50规定，始终将IAQI最大的空气污染物作为主要污染物。",
};

const airQualityCurrentFull = [airQualityCurrentPollutantsProvider, airQualityCurrentPollutantsUnitsReplace, airQualityCurrentPollutantsUnitsMode, airQualityCurrentIndexReplace, airQualityCurrentIndexProvider, airQualityCurrentIndexForceCNPrimaryPollutants];

const airQualityComparisonReplace: Arg = {
	key: "AirQuality.Comparison.ReplaceWhenCurrentChange",
	name: "[空气质量 - 对比昨日] 变化时替换",
	defaultValue: false,
	type: "boolean",
	description: "即使已有对比昨日数据，当今日空气质量指数发生变化时，替换对比昨日数据。",
};

const airQualityComparisonYesterdayPollutantsProvider: Arg = {
	key: "AirQuality.Comparison.Yesterday.PollutantsProvider",
	name: "[昨日污染物] 数据源",
	defaultValue: "QWeather",
	type: "string",
	options: [{ key: "QWeather", label: "和风天气" }],
	description: "为iRingo内置算法提供污染物数据，计算出昨日的空气质量指数。",
};

const airQualityComparisonYesterdayIndexProvider: Arg = {
	key: "AirQuality.Comparison.Yesterday.IndexProvider",
	name: "[昨日空气指数] 数据源",
	defaultValue: "ColorfulCloudsUS",
	type: "string",
	options: [
		{ key: "Calculate", label: "iRingo内置算法" },
		{ key: "ColorfulCloudsUS", label: "彩云天气（美标，18年9月版）" },
		{ key: "ColorfulCloudsCN", label: "彩云天气（国标，12年2月版）" },
		{ key: "QWeather", label: "和风天气（国标，12年2月版）" },
	],
	description: "用来和今日空气质量指数对比的数据。",
};

const airQualityComparisonFull = [airQualityComparisonReplace, airQualityComparisonYesterdayPollutantsProvider, airQualityComparisonYesterdayIndexProvider];

const airQualityFull = [...airQualityCurrentFull, ...airQualityComparisonFull];

const calculateAlgorithm: Arg = {
	key: "AirQuality.Calculate.Algorithm",
	name: "[iRingo内置算法] 算法",
	defaultValue: "EU_EAQI",
	type: "string",
	options: [
		{ key: "None", label: "不转换" },
		{ key: "UBA", label: "德国LQI（FB001846）" },
		{ key: "EU_EAQI", label: "欧盟EAQI（ETC HE Report 2024/17）" },
		{ key: "WAQI_InstantCast_US", label: "美标InstantCast（EPA-454/B-24-002）" },
		{ key: "WAQI_InstantCast_CN", label: "国标InstantCast（HJ 633—2012）" },
		{ key: "WAQI_InstantCast_CN_25_DRAFT", label: "国标InstantCast（HJ 633 2025年草案）" },
	],
	description: "使用内置算法，通过污染物数据本地计算空气指数。InstantCast源自于WAQI，美标版本使用了WAQI的臭氧标准。",
};

const calculateAllowOverRange: Arg = {
	key: "AirQuality.Calculate.AllowOverRange",
	name: "[iRingo内置算法] 允许指数超标",
	defaultValue: true,
	type: "boolean",
	description: "允许美标和国标的指数超过500。超过500时，指示颜色的小圆点会消失。",
};

export const calculate = [calculateAlgorithm];
const calculateFull = [calculateAlgorithm, calculateAllowOverRange];

export const api: Arg[] = [
	{
		key: "API.ColorfulClouds.Token",
		name: "[API] 彩云天气令牌",
		defaultValue: "",
		type: "string",
		placeholder: "123456789123456789abcdefghijklmnopqrstuv",
		description: "彩云天气 API 令牌",
	},
	{
		key: "API.QWeather.Host",
		name: "[API] 和风天气主机",
		defaultValue: "devapi.qweather.com",
		type: "string",
		placeholder: "devapi.qweather.com",
		description: "和风天气 API 使用的主机名",
	},
	{
		key: "API.QWeather.Token",
		name: "[API] 和风天气令牌",
		defaultValue: "",
		type: "string",
		placeholder: "123456789123456789abcdefghijklmnopqrstuv",
		description: "和风天气 API 令牌",
	},
	{
		key: "API.WAQI.Token",
		name: "[API] WAQI 令牌",
		defaultValue: "",
		type: "string",
		placeholder: "123456789123456789abcdefghijklmnopqrstuv",
		description: "WAQI API 令牌，填写此字段将自动使用WAQI高级API",
	},
];

export const storage: Arg[] = [
	{
		key: "Storage",
		name: "[储存] 配置类型",
		defaultValue: "Argument",
		type: "string",
		options: [
			{ key: "Argument", label: "优先使用插件选项与模块参数等，由 $argument 传入的配置，$argument 不包含的设置项由 PersistentStore (BoxJs) 提供" },
			{ key: "PersistentStore", label: "只使用来自 BoxJs 等，由 $persistentStore 提供的配置" },
			{ key: "database", label: "只使用由作者的 database.mjs 文件提供的默认配置，其他任何自定义配置不再起作用" },
		],
		description: "选择要使用的配置类型。未设置此选项或不通过此选项的旧版本的配置顺序依旧是 $persistentStore (BoxJs) > $argument > database。",
	},
];

export const logLevel: Arg[] = [
	{
		key: "LogLevel",
		name: "[调试] 日志等级",
		type: "string",
		defaultValue: "WARN",
		description: "选择脚本日志的输出等级，低于所选等级的日志将全部输出。",
		options: [
			{ key: "OFF", label: "关闭" },
			{ key: "ERROR", label: "❌ 错误" },
			{ key: "WARN", label: "⚠️ 警告" },
			{ key: "INFO", label: "ℹ️ 信息" },
			{ key: "DEBUG", label: "🅱️ 调试" },
			{ key: "ALL", label: "全部" },
		],
	},
];

export default defineConfig({
	output,
	args: [...dataSets, ...weatherFull, ...nextHourFull, ...airQualityFull, ...calculateFull, ...api, ...storage, ...logLevel],
});
