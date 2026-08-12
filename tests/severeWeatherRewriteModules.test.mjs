import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modulesDirectory = new URL("../modules/", import.meta.url);
const configurableModules = ["iRingo.WeatherKit.Rewrite.sgmodule", "iRingo.WeatherKit.Rewrite.srmodule", "iRingo.WeatherKit.Rewrite.yaml"];
const fixedModules = ["iRingo.WeatherKit.Rewrite.lpx", "iRingo.WeatherKit.Rewrite.stoverride"];
const rewriteTemplates = ["loon.rewrite.handlebars", "surge.rewrite.handlebars", "shadowrocket.rewrite.handlebars", "stash.rewrite.handlebars"];
const coordinatePattern = String.raw`-?[0-9]+(?:\.[0-9]+)?,-?[0-9]+(?:\.[0-9]+)?`;
const weatherAlertsPattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?([^#]*&ids=${coordinatePattern}(?:&[^#]*)?)$`;
const weatherAlertsHandlerPattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?[^#]*&ids=${coordinatePattern}(?:&|$)`;
const weatherAlertsRewriteComment = "# 🌤 WeatherKit.api.v1.weatherAlerts.response";
const unsafeOpenEndedQuantifier = "{6" + ",}";
const completedAlertFeatureDescription = "5.修改天气预警数据";
const hhhContributor = "hhh2210[https://github.com/hhh2210]";

test("all Rewrite modules hook WeatherAlert data without QWeather page redirects", async () => {
    for (const filename of [...configurableModules, ...fixedModules]) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.ok(content.includes(weatherAlertsPattern), filename);
        assert.ok(content.includes(completedAlertFeatureDescription), filename);
        assert.ok(content.includes(hhhContributor), filename);
        assert.ok(!content.includes(unsafeOpenEndedQuantifier), filename);
        assert.ok(content.includes(weatherAlertsRewriteComment), filename);
        assert.ok(!content.includes("Apple 官方预警页面的 QWeather 数据"), filename);
        assert.ok(!content.includes("QWeather data for the official Apple alert page"), filename);
        assert.doesNotMatch(content, /alertDetails\.index\.response/, filename);
        assert.doesNotMatch(content, /party=qweather/, filename);
        assert.doesNotMatch(content, /www\.qweather\.com/, filename);
        assert.match(content, /weatherkit\.apple\.com/);
    }

    for (const filename of configurableModules) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.match(content, /https:\/\/\{\{\{endpoint\}\}\}\/api\/v1\/weatherAlerts\?\$1/);
    }

    for (const filename of fixedModules) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.match(content, /https:\/\/weatherkit\.pages\.dev\/api\/v1\/weatherAlerts\?\$1/);
    }
});

test("WeatherAlerts hooks accept coordinate ids after an existing query parameter", () => {
    const regex = new RegExp(weatherAlertsPattern);
    const handlerRegex = new RegExp(weatherAlertsHandlerPattern);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115,118.814", regex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=32.115,118.814&country=CN", regex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115,118.814", handlerRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=32.115,118.814&country=CN", handlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2C118.814", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2c118.814", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2C118.814", handlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2c118.814", handlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=32.115,118.814", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=32.115%2C118.814", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=.115,118.814", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=35889ee6-fa82-5f9f-8e49-fad78c4f383a", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", handlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN", regex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN", handlerRegex);
});

test("Egern keeps the API hook without QWeather page redirects", async () => {
    const content = await readFile(new URL("iRingo.WeatherKit.Rewrite.yaml", modulesDirectory), "utf8");
    assert.match(content, /match: \^https\?:\\\/\\\/weatherkit\\\.apple\\\.com\\\/api\\\/v1\\\/weatherAlerts\\\?\([\s\S]*?location: https:\/\/\{\{\{endpoint\}\}\}\/api\/v1\/weatherAlerts\?\$1\nmitm:/);
});

test("script module templates hook Apple weatherAlerts without QWeather page redirects", async () => {
    const templates = ["surge.handlebars", "loon.handlebars", "quantumultx.handlebars", "stash.handlebars"];
    for (const filename of templates) {
        const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
        assert.ok(content.includes(weatherAlertsHandlerPattern), filename);
        assert.match(content, /api\\\/v1\\\/weatherAlerts\\\?/);
        assert.ok(!content.includes(unsafeOpenEndedQuantifier), filename);
        assert.doesNotMatch(content, /alertDetails\.index\.response/, filename);
        assert.doesNotMatch(content, /party=qweather/, filename);
        assert.doesNotMatch(content, /www\.qweather\.com/, filename);
        assert.match(content, /weatherkit\.apple\.com/);
    }

    const surge = await readFile(new URL("../template/surge.handlebars", import.meta.url), "utf8");
    const loon = await readFile(new URL("../template/loon.handlebars", import.meta.url), "utf8");
    const quantumultX = await readFile(new URL("../template/quantumultx.handlebars", import.meta.url), "utf8");
    const stash = await readFile(new URL("../template/stash.handlebars", import.meta.url), "utf8");
    assert.match(surge, /weatherAlerts\.request = type=http-request,[^\n]+request\.bundle\.js/);
    assert.ok(surge.includes(`pattern="${weatherAlertsHandlerPattern}"`));
    assert.doesNotMatch(surge, /weatherAlerts\.request[^\n]+pattern=\^https/);
    assert.doesNotMatch(surge, /weatherAlerts\.request[^\n]+requires-body/);
    assert.match(loon, /http-request [^\n]+weatherAlerts[^\n]+request\.bundle\.js[^\n]+weatherAlerts\.request/);
    assert.match(quantumultX, /weatherAlerts[^\n]+url script-echo-response[^\n]+request\.bundle\.js/);
    assert.doesNotMatch(quantumultX, /weatherAlerts[^\n]+script-request-header/);
    assert.match(stash, /match: [^\n]+weatherAlerts[\s\S]*?name: WeatherKit\.api\.v1\.weatherAlerts\.request[\s\S]*?type: request/);
    assert.doesNotMatch(stash, /name: WeatherKit\.api\.v1\.weatherAlerts\.request\n      type: request\n      require-body/);
});

test("Rewrite templates stay aligned with fixed Rewrite modules", async () => {
	const fixedTemplates = ["loon.rewrite.handlebars", "stash.rewrite.handlebars"];
	for (const filename of rewriteTemplates) {
		const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
        assert.ok(content.includes("(Rewrite)"), filename);
        assert.ok(content.includes(weatherAlertsPattern), filename);
		assert.doesNotMatch(content, /www\.qweather\.com/);
		assert.doesNotMatch(content, /party=qweather/);
		assert.match(content, /weatherkit\.apple\.com/);
		assert.doesNotMatch(content, /weatherkit\.nanocat\.cloud/);
	}


	const surge = await readFile(new URL("../template/surge.rewrite.handlebars", import.meta.url), "utf8");
	assert.ok(surge.includes("#!arguments = {{{arguments}}}"));
	assert.ok(surge.includes("#!arguments-desc = {{{argumentsDesc}}}"));
	assert.ok(surge.includes("https://\\{{{endpoint}}}/api/v1/weatherAlerts?$1"));

	const shadowrocket = await readFile(new URL("../template/shadowrocket.rewrite.handlebars", import.meta.url), "utf8");
	assert.ok(shadowrocket.includes("#!arguments = endpoint:weatherkit.pages.dev"));
	assert.ok(shadowrocket.includes("#!arguments-desc = endpoint: [重写] 服务端点\\n"));
	assert.ok(shadowrocket.includes("https://\\{{{endpoint}}}/api/v1/weatherAlerts?$1"));

	for (const filename of fixedTemplates) {
		const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
		assert.ok(content.includes("https://weatherkit.pages.dev/api/v1/weatherAlerts?$1"), filename);
		assert.doesNotMatch(content, /\{\{\{endpoint\}\}\}/, filename);
	}

    const loon = await readFile(new URL("../template/loon.rewrite.handlebars", import.meta.url), "utf8");
    assert.match(loon, /^\[Rewrite\]$/m);
    assert.doesNotMatch(loon, /^\[URL Rewrite\]$/m);
});

test("Loon Rewrite modules use the legacy Rewrite section", async () => {
    const loon = await readFile(new URL("../template/loon.rewrite.handlebars", import.meta.url), "utf8");
    const rewrite = await readFile(new URL("iRingo.WeatherKit.Rewrite.lpx", modulesDirectory), "utf8");
    for (const content of [loon, rewrite]) {
        assert.match(content, /^\[Rewrite\]$/m);
        assert.doesNotMatch(content, /^\[URL Rewrite\]$/m);
        assert.doesNotMatch(content, /party=qweather/);
        assert.doesNotMatch(content, /www\.qweather\.com/);
    }
});

test("Rewrite builder outputs use Rewrite names", async () => {
	const content = await readFile(new URL("../arguments-builder.rewrite.config.ts", import.meta.url), "utf8");
	assert.match(content, /iRingo\.WeatherKit\.Rewrite\.(?:sgmodule|lpx|srmodule|stoverride|yaml)/);
	assert.match(content, /key: "endpoint"[\s\S]*defaultValue: "weatherkit\.pages\.dev"/);
	assert.match(content, /weather\.nanocat\.cloud", label: "Worker 版；需要代理"/);
	assert.doesNotMatch(content, /Workers/);
    assert.doesNotMatch(content, /\.workers\.handlebars/);
});

test("Handler generation keeps Loon local and excludes Egern", async () => {
    const content = await readFile(new URL("../arguments-builder-full.config.ts", import.meta.url), "utf8");
    assert.match(content, /path: "\.\/dist\/iRingo\.WeatherKit\.lpx"/);
    assert.doesNotMatch(content, /transformEgern|iRingo\.WeatherKit\.yaml/);
});
