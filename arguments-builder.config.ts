import { defineConfig } from "@iringo/arguments-builder";
import { api, calculate, logLevel, nextHour, output, storage, weather } from './arguments-builder-full.config';

export default defineConfig({
	output: output,
	args: [...weather, ...nextHour, ...calculate, ...api, ...storage, ...logLevel],
});
