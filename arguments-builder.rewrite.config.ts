import { defineConfig } from "@iringo/arguments-builder";
export default defineConfig({
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
			path: "./dist/iRingo.WeatherKit.Rewrite.plugin",
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
