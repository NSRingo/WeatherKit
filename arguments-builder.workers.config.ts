import { defineConfig } from "@iringo/arguments-builder";
export default defineConfig({
	output: {
		surge: {
			path: "./dist/iRingo.WeatherKit.Workers.sgmodule",
			template: "./template/surge.workers.handlebars",
			transformEgern: {
				enable: true,
				path: "./dist/iRingo.WeatherKit.Workers.yaml",
			},
		},
		loon: {
			path: "./dist/iRingo.WeatherKit.Workers.plugin",
			template: "./template/loon.workers.handlebars",
		},
		customItems: [
			{
				path: "./dist/iRingo.WeatherKit.Workers.srmodule",
				template: "./template/shadowrocket.workers.handlebars",
			},
			{
				path: "./dist/iRingo.WeatherKit.Workers.stoverride",
				template: "./template/stash.workers.handlebars",
			},
		]
	},
});
