import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modulesDirectory = new URL("../modules/", import.meta.url);
const configurableModules = ["iRingo.WeatherKit.Rewrite.sgmodule", "iRingo.WeatherKit.Rewrite.srmodule", "iRingo.WeatherKit.Rewrite.yaml"];
const fixedModules = ["iRingo.WeatherKit.Rewrite.lpx", "iRingo.WeatherKit.Rewrite.stoverride"];
const chinesePattern = String.raw`^https?:\/\/www\.qweather\.com\/\/?severe-weather\/([^/?#]+)\.html\?from=AppleWeatherService$`;
const englishPattern = String.raw`^https?:\/\/www\.qweather\.com\/en\/severe-weather\/([^/?#]+)\.html\?from=AppleWeatherService$`;
const weatherAlertsPattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts(\?[^#]*&ids=[^&#]*-[0-9]{9}(?:&[^#]*)?)$`;
const weatherAlertsHandlerPattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?[^#]*&ids=[^&#]*-[0-9]{9}(?:&|$)`;
const chineseDestination = "https://weatherkit.apple.com/alertDetails/index.html?ids=$1&lang=zh-CN&party=qweather";
const englishDestination = "https://weatherkit.apple.com/alertDetails/index.html?ids=$1&lang=en-US&party=qweather";
const alertDetailsComment = "# 🌤 WeatherKit.alertDetails.index.response";
const weatherAlertsRewriteComment = "# 🌤 WeatherKit.api.v1.weatherAlerts.response";
const unsafeOpenEndedQuantifier = "{6" + ",}";

test("QWeather entry routes redirect only supported source URLs to Apple", () => {
    const chineseRegex = new RegExp(chinesePattern);
    const englishRegex = new RegExp(englishPattern);
    const chineseUrl = "https://www.qweather.com/severe-weather/jianye-101190110.html?from=AppleWeatherService";
    const legacyChineseUrl = "https://www.qweather.com//severe-weather/jianye-101190110.html?from=AppleWeatherService";
    const englishUrl = "https://www.qweather.com/en/severe-weather/jianye-101190110.html?from=AppleWeatherService";
    const chineseExpected = "https://weatherkit.apple.com/alertDetails/index.html?ids=jianye-101190110&lang=zh-CN&party=qweather";
    const englishExpected = "https://weatherkit.apple.com/alertDetails/index.html?ids=jianye-101190110&lang=en-US&party=qweather";

    assert.equal(chineseUrl.replace(chineseRegex, chineseDestination), chineseExpected);
    assert.equal(legacyChineseUrl.replace(chineseRegex, chineseDestination), chineseExpected);
    assert.equal(englishUrl.replace(englishRegex, englishDestination), englishExpected);
    assert.doesNotMatch("https://qweather.com/en/severe-weather/jianye-101190110.html?from=AppleWeatherService", englishRegex);
    assert.doesNotMatch("https://www.qweather.com///severe-weather/jianye-101190110.html?from=AppleWeatherService", chineseRegex);
    assert.doesNotMatch("https://www.qweather.com/en/severe-weather/jianye-101190110.html", englishRegex);
    assert.doesNotMatch("https://www.qweather.com/severe-weather/jianye-101190110.html?from=AppleWeatherService&lang=zh-CN", chineseRegex);
    assert.doesNotMatch("https://www.qweather.com/en/severe-weather/jianye-101190110.html?from=AppleWeatherService&lang=en-US", englishRegex);
});

test("all Rewrite modules redirect the entry and transparently hook WeatherAlert data", async () => {
    for (const filename of [...configurableModules, ...fixedModules]) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.ok(content.includes(chinesePattern), filename);
        assert.ok(content.includes(englishPattern), filename);
        assert.ok(content.includes(weatherAlertsPattern), filename);
        assert.ok(!content.includes(unsafeOpenEndedQuantifier), filename);
        assert.ok(content.includes(alertDetailsComment), filename);
        assert.ok(content.includes(weatherAlertsRewriteComment), filename);
        assert.ok(!content.includes("Apple 官方预警页面的 QWeather 数据"), filename);
        assert.ok(!content.includes("QWeather data for the official Apple alert page"), filename);
        assert.ok(content.includes(`${chineseDestination} 302`) || content.includes(`location: ${chineseDestination}`), filename);
        assert.ok(content.includes(`${englishDestination} 302`) || content.includes(`location: ${englishDestination}`), filename);
        assert.match(content, /weatherkit\.apple\.com/);
        assert.match(content, /www\.qweather\.com/);
    }

    for (const filename of configurableModules) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.match(content, /https:\/\/\{\{\{endpoint\}\}\}\/api\/v1\/weatherAlerts\$1/);
    }

    for (const filename of fixedModules) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.match(content, /https:\/\/weatherkit\.pages\.dev\/api\/v1\/weatherAlerts\$1/);
    }
});

test("WeatherAlerts hooks accept QWeather ids without constraining preceding parameters", () => {
    const regex = new RegExp(weatherAlertsPattern);
    const handlerRegex = new RegExp(weatherAlertsHandlerPattern);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", regex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=jianye-101190110", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-10119011", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-1011901100", regex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", handlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-1011901100", handlerRegex);
});

test("Egern uses a real redirect for the entry and header mode for the API hook", async () => {
    const content = await readFile(new URL("iRingo.WeatherKit.Rewrite.yaml", modulesDirectory), "utf8");
    assert.match(content, new RegExp(`${englishPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?status_code: 302`));
    assert.match(content, /match: \^https\?:\\\/\\\/weatherkit\\\.apple\\\.com\\\/api\\\/v1\\\/weatherAlerts\(\\\?[\s\S]*?location: https:\/\/\{\{\{endpoint\}\}\}\/api\/v1\/weatherAlerts\$1\nmitm:/);
});

test("script module templates redirect QWeather and hook Apple weatherAlerts", async () => {
    const templates = ["surge.handlebars", "loon.handlebars", "quantumultx.handlebars", "stash.handlebars"];
    for (const filename of templates) {
        const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
        assert.ok(content.includes(chinesePattern), filename);
        assert.ok(content.includes(englishPattern), filename);
        assert.ok(content.includes(alertDetailsComment), filename);
        assert.ok(content.includes(chineseDestination), filename);
        assert.ok(content.includes(englishDestination), filename);
        assert.match(content, /api\\\/v1\\\/weatherAlerts\\\?/);
        assert.ok(!content.includes(unsafeOpenEndedQuantifier), filename);
        assert.match(content, /weatherkit\.apple\.com, www\.qweather\.com|"weatherkit\.apple\.com"[\s\S]*"www\.qweather\.com"/);
    }

    const surge = await readFile(new URL("../template/surge.handlebars", import.meta.url), "utf8");
    const loon = await readFile(new URL("../template/loon.handlebars", import.meta.url), "utf8");
    const quantumultX = await readFile(new URL("../template/quantumultx.handlebars", import.meta.url), "utf8");
    const stash = await readFile(new URL("../template/stash.handlebars", import.meta.url), "utf8");
    assert.match(surge, /weatherAlerts\.request = type=http-request,[^\n]+request\.bundle\.js/);
    assert.doesNotMatch(surge, /weatherAlerts\.request[^\n]+requires-body/);
    assert.match(loon, /http-request [^\n]+weatherAlerts[^\n]+request\.bundle\.js[^\n]+weatherAlerts\.request/);
    assert.match(quantumultX, /weatherAlerts[^\n]+url script-request-header[^\n]+request\.bundle\.js/);
    assert.match(stash, /match: [^\n]+weatherAlerts[\s\S]*?name: WeatherKit\.api\.v1\.weatherAlerts\.request[\s\S]*?type: request/);
    assert.doesNotMatch(stash, /name: WeatherKit\.api\.v1\.weatherAlerts\.request\n      type: request\n      require-body/);
});

test("Handler generation keeps Loon local and excludes Egern", async () => {
    const content = await readFile(new URL("../arguments-builder-full.config.ts", import.meta.url), "utf8");
    assert.match(content, /path: "\.\/dist\/iRingo\.WeatherKit\.plugin"/);
    assert.doesNotMatch(content, /transformEgern|iRingo\.WeatherKit\.yaml/);
});
