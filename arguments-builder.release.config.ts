// Modified by hhhoratioxu, 2026-10-19: expose provider response cache lifetime.
import { defineConfig } from "@iringo/arguments-builder";
import { requestCache, airQuality, api, calculate, dataSets, logLevel, nextHour, output, storage, weather, weatherAlerts } from "./arguments-builder.full.config";

export default defineConfig({
    output: output,
    args: [...dataSets, ...weather, ...weatherAlerts, ...nextHour, ...airQuality, ...calculate, ...api, ...storage, ...logLevel, ...requestCache],
});
