import { defineConfig } from "@iringo/arguments-builder";
import { airQualityComparison, api, calculate, currentAirQuality, storage, logLevel, nextHour, output, weather } from "./arguments-builder-full.config";

export default defineConfig({
	output: output,
	args: [...weather, ...nextHour, ...currentAirQuality, ...airQualityComparison, ...calculate, ...api, ...storage, ...logLevel],
});
