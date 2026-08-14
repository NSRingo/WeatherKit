import { defineConfig } from "@iringo/arguments-builder";
import { airQualityFull, api, calculateFull, dataSetsFull, logLevel, nextHourFull, storage, weatherAlerts, weatherFull } from "./arguments-builder.full.config";

export default defineConfig({
    output: {
        surge: {
            path: "./dist/iRingo.WeatherKit.dev.sgmodule",
            template: "./template/surge.dev.handlebars",
        },
        loon: {
            path: "./dist/iRingo.WeatherKit.dev.plugin",
            template: "./template/loon.dev.handlebars",
        },
        customItems: [
            {
                path: "./dist/iRingo.WeatherKit.dev.snippet",
                template: "./template/quantumultx.dev.handlebars",
            },
            {
                path: "./dist/iRingo.WeatherKit.dev.stoverride",
                template: "./template/stash.dev.handlebars",
            },
        ],
        boxjsSettings: {
            path: "./dist/iRingo.WeatherKit.dev.boxjs.json",
            scope: "@iRingo.WeatherKit.Settings",
        },
    },
    args: [...dataSetsFull, ...weatherFull, ...weatherAlerts, ...nextHourFull, ...airQualityFull, ...calculateFull, ...api, ...storage, ...logLevel],
});
