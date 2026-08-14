import { defineConfig } from "@iringo/sgmoudle-tools";
import { ArgumentsBuilder } from "@iringo/arguments-builder";
import argConfig from "./arguments-builder.dev.config";

const args = new ArgumentsBuilder(argConfig);

const { scriptParams } = args.buildSurgeArguments();

export default defineConfig({
    module: {
        rule: ["DOMAIN,weather-analytics-events.apple.com,REJECT-DROP"],
        script: [
            {
                name: "🌤 WeatherKit.api.v1.availability.response",
                type: "http-response",
                scriptPath: "./dist/response.dev.bundle.js",
                pattern: "^https?://weatherkit.apple.com/api/v1/availability/",
                requiresBody: true,
                engine: "webview",
                argument: scriptParams,
            },
            {
                name: "🌤 WeatherKit.api.v2.weather.response",
                type: "http-response",
                scriptPath: "./dist/response.dev.bundle.js",
                pattern: "^https?://weatherkit.apple.com/api/v2/weather/",
                requiresBody: true,
                binaryBodyMode: true,
                engine: "webview",
                argument: scriptParams,
            },
        ],
        mitm: {
            hostname: ["weatherkit.apple.com"],
        },
    },
});
