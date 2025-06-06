import { defineConfig } from "@iringo/arguments-builder";

export default defineConfig({
	output: {
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
	},
	args: [
		{
			key: "NextHour.Provider",
			name: "[未来一小时降水强度] 数据源",
			defaultValue: "ColorfulClouds",
			type: "string",
			options: [
				{ key: "WeatherKit", label: "WeatherKit (不进行替换)" },
				{ key: "ColorfulClouds", label: "彩云天气" },
				{ key: "QWeather", label: "和风天气" },
			],
			description: "始终会使用选定的数据源，填补无降水监测地区的数据。",
		},
		{
			key: "AQI.Provider",
			name: "[空气质量] 数据源",
			defaultValue: "ColorfulClouds",
			type: "string",
			options: [
				{ key: "WeatherKit", label: "WeatherKit (不进行替换)" },
				{ key: "ColorfulClouds", label: "彩云天气" },
				{ key: "QWeather", label: "和风天气" },
				{ key: "WAQI", label: "The World Air Quality Project" },
			],
			description: "始终会使用选定的数据源，填补无空气质量监测地区的数据。",
		},
		{
			key: "AQI.ReplaceProviders",
			name: "[空气质量] 需要替换的供应商",
			defaultValue: ["QWeather"],
			type: "array",
			description: "选中的空气质量数据源会被替换。",
			options: [
				{ key: "QWeather", label: "和风天气" },
				{ key: "BreezoMeter", label: "BreezoMeter" },
				{ key: "TWC", label: "The Weather Channel" },
			],
		},
		{
			key: "AQI.Local.Scale",
			type: "string",
			name: "[空气质量] 本地替换算法",
			description: "本地替换时使用的算法",
			defaultValue: "WAQI_InstantCast",
			options: [
				{ key: "NONE", label: "None (不进行替换)" },
				{ key: "WAQI_InstantCast", label: "WAQI InstantCast" },
			],
		},
		{
			key: "AQI.Local.ReplaceScales",
			type: "array",
			name: "[空气质量] 需要修改的标准",
			description: "选中的空气质量标准会被替换。请注意各国监测的污染物种类可能有所不同，转换算法或API未必适合当地。",
			defaultValue: ["HJ6332012"],
			options: [{ key: "HJ6332012", label: "中国 (HJ 633—2012)" }],
		},
		{
			key: "AQI.Local.ConvertUnits",
			name: "[空气质量] 转换污染物计量单位",
			defaultValue: false,
			type: "boolean",
			description: "将污染物数据替换为转换单位后的数据，方便对照转换后的标准。（不推荐。不同单位互转可能会损失精度，导致数值偏大）",
		},
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
			description: "和风天气 API 使用的主机名",
			options: [
				{ key: "devapi.qweather.com", label: "免费订阅 (devapi.qweather.com)" },
				{ key: "api.qweather.com", label: "付费订阅 (api.qweather.com)" },
			],
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
	],
});
