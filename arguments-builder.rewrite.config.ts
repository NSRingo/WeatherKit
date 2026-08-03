import { defineConfig } from "@iringo/arguments-builder";

const endpoint = {
	key: "endpoint",
	name: "[重写] 服务端点",
	defaultValue: "weatherkit.pages.dev",
	type: "string" as const,
	options: [
		{ key: "weatherkit.pages.dev", label: "首选；直连；无需代理" },
		{ key: "dev.weatherkit.pages.dev", label: "开发版" },
		{ key: "weather.nanocat.cloud", label: "Worker 版；需要代理" },
	],
};

export default defineConfig({
	args: [endpoint],
	output: {
		surge: {
			path: "./dist/iRingo.WeatherKit.Rewrite.sgmodule",
			template: "./template/surge.rewrite.handlebars",
			transformEgern: {
				enable: true,
				path: "./dist/iRingo.WeatherKit.Rewrite.yaml",
			},
		},
		loon: {
			path: "./dist/iRingo.WeatherKit.Rewrite.lpx",
			template: "./template/loon.rewrite.handlebars",
		},
		customItems: [
			{
				path: "./dist/iRingo.WeatherKit.Rewrite.srmodule",
				template: "./template/shadowrocket.rewrite.handlebars",
			},
			{
				path: "./dist/iRingo.WeatherKit.Rewrite.stoverride",
				template: "./template/stash.rewrite.handlebars",
			},
		],
	},
});
