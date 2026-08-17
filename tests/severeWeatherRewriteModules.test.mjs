import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modulesDirectory = new URL("../modules/", import.meta.url);
const configurableModules = ["iRingo.WeatherKit.Rewrite.sgmodule", "iRingo.WeatherKit.Rewrite.srmodule", "iRingo.WeatherKit.Rewrite.yaml"];
const fixedModules = ["iRingo.WeatherKit.Rewrite.lpx", "iRingo.WeatherKit.Rewrite.stoverride"];
const rewriteTemplates = ["loon.rewrite.handlebars", "surge.rewrite.handlebars", "shadowrocket.rewrite.handlebars", "stash.rewrite.handlebars"];
const qWeatherPageIdentifierPattern = "[^&#]*-[0-9]{9}";
const qWeatherCoordinatePattern = String.raw`-?[0-9]+(?:\.[0-9]+)?,-?[0-9]+(?:\.[0-9]+)?`;
const weatherAlertsPagePattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?([^#]*&ids=${qWeatherPageIdentifierPattern}(?:&[^#]*)?)$`;
const weatherAlertsCoordinatePattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?([^#]*&ids=${qWeatherCoordinatePattern}(?:&[^#]*)?)$`;
const weatherAlertsPageHandlerPattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?[^#]*&ids=${qWeatherPageIdentifierPattern}(?:&|$)`;
const weatherAlertsCoordinateHandlerPattern = String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts\?[^#]*&ids=${qWeatherCoordinatePattern}(?:&|$)`;
const mergedWeatherAlertsIdentifierPattern = `(?:${qWeatherPageIdentifierPattern}|${qWeatherCoordinatePattern})`;
const weatherAlertsRewriteComment = "# 🌤 WeatherKit.api.v1.weatherAlerts.response";
const unsafeOpenEndedQuantifier = "{6" + ",}";
const completedAlertFeatureDescription = "5.修改天气预警数据";
const hhhContributor = "hhh2210[https://github.com/hhh2210]";

test("all Rewrite modules hook WeatherAlert data without QWeather page redirects", async () => {
    for (const filename of [...configurableModules, ...fixedModules]) {
        const content = await readFile(new URL(filename, modulesDirectory), "utf8");
        assert.ok(content.includes(weatherAlertsPagePattern), filename);
        assert.ok(content.includes(weatherAlertsCoordinatePattern), filename);
        assert.ok(!content.includes(mergedWeatherAlertsIdentifierPattern), filename);
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

test("WeatherAlerts hooks accept QWeather location and API coordinate ids after an existing query parameter", () => {
    const pageRegex = new RegExp(weatherAlertsPagePattern);
    const coordinateRegex = new RegExp(weatherAlertsCoordinatePattern);
    const pageHandlerRegex = new RegExp(weatherAlertsPageHandlerPattern);
    const coordinateHandlerRegex = new RegExp(weatherAlertsCoordinateHandlerPattern);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", pageRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=jianye-101190110&country=CN", pageRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", pageHandlerRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=jianye-101190110&country=CN", pageHandlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110", coordinateRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115,118.814", coordinateRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=32.115,118.814&country=CN", coordinateRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115,118.814", coordinateHandlerRegex);
    assert.match("https://weatherkit.apple.com/api/v1/weatherAlerts?timezone=Asia%2FShanghai&ids=32.115,118.814&country=CN", coordinateHandlerRegex);
    assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115,118.814", pageRegex);
    for (const regex of [pageRegex, coordinateRegex]) {
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=jianye-101190110", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=32.115,118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-10119011", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-1011901100", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=35889ee6-fa82-5f9f-8e49-fad78c4f383a", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2C118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2c118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?ids=32.115%2C118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=.115,118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN", regex);
    }
    for (const regex of [pageHandlerRegex, coordinateHandlerRegex]) {
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2C118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115%2c118.814", regex);
        assert.doesNotMatch("https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN", regex);
    }
});

test("Egern keeps the API hook without QWeather page redirects", async () => {
    const content = await readFile(new URL("iRingo.WeatherKit.Rewrite.yaml", modulesDirectory), "utf8");
    assert.match(content, /match: \^https\?:\\\/\\\/weatherkit\\\.apple\\\.com\\\/api\\\/v1\\\/weatherAlerts\\\?\([\s\S]*?location: https:\/\/\{\{\{endpoint\}\}\}\/api\/v1\/weatherAlerts\?\$1\nmitm:/);
});

test("script module templates hook Apple weatherAlerts without QWeather page redirects", async () => {
    const templates = ["surge.handlebars", "loon.handlebars", "quantumultx.handlebars", "stash.handlebars"];
    for (const filename of templates) {
        const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
        assert.ok(content.includes(weatherAlertsPageHandlerPattern), filename);
        assert.ok(content.includes(weatherAlertsCoordinateHandlerPattern), filename);
        assert.ok(!content.includes(mergedWeatherAlertsIdentifierPattern), filename);
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
    assert.match(surge, /weatherAlerts\.html\.request = type=http-request,[^\n]+request\.bundle\.js/);
    assert.match(surge, /weatherAlerts\.api\.request = type=http-request,[^\n]+request\.bundle\.js/);
    assert.ok(surge.includes(`pattern="${weatherAlertsPageHandlerPattern}"`));
    assert.ok(surge.includes(`pattern="${weatherAlertsCoordinateHandlerPattern}"`));
    assert.doesNotMatch(surge, /weatherAlerts\.(?:html|api)\.request[^\n]+pattern=\^https/);
    assert.doesNotMatch(surge, /weatherAlerts\.(?:html|api)\.request[^\n]+requires-body/);
    assert.match(loon, /http-request [^\n]+weatherAlerts[^\n]+request\.bundle\.js[^\n]+weatherAlerts\.html\.request/);
    assert.match(loon, /http-request [^\n]+weatherAlerts[^\n]+request\.bundle\.js[^\n]+weatherAlerts\.api\.request/);
    assert.match(quantumultX, /weatherAlerts[^\n]+url script-echo-response[^\n]+request\.bundle\.js/);
    assert.doesNotMatch(quantumultX, /weatherAlerts[^\n]+script-request-header/);
    assert.match(stash, /match: [^\n]+weatherAlerts[\s\S]*?name: WeatherKit\.api\.v1\.weatherAlerts\.request[\s\S]*?type: request/);
    assert.doesNotMatch(stash, /name: WeatherKit\.api\.v1\.weatherAlerts\.request\n      type: request\n      require-body/);
});

test("Stash weather-alert requests declare the required request type", async () => {
    const requestEntry = /    - match: [^\n]*weatherAlerts[^\n]*\n      name: WeatherKit\.api\.v1\.weatherAlerts\.request\n      type: request\n/g;

    for (const filename of ["stash.handlebars", "stash.dev.handlebars"]) {
        const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
        assert.equal(content.match(requestEntry)?.length, 2, filename);
    }
});

test("Rewrite templates stay aligned with fixed Rewrite modules", async () => {
	const fixedTemplates = ["loon.rewrite.handlebars", "stash.rewrite.handlebars"];
	for (const filename of rewriteTemplates) {
        const content = await readFile(new URL(`../template/${filename}`, import.meta.url), "utf8");
        assert.ok(content.includes("(Rewrite)"), filename);
        assert.ok(content.includes(weatherAlertsPagePattern), filename);
        assert.ok(content.includes(weatherAlertsCoordinatePattern), filename);
        assert.ok(!content.includes(mergedWeatherAlertsIdentifierPattern), filename);
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

test("Argument builder consumers use purpose-specific configs", async () => {
    const [packageJson, sgmoduleTools] = await Promise.all([readFile(new URL("../package.json", import.meta.url), "utf8"), readFile(new URL("../sgmodule-tools.config.ts", import.meta.url), "utf8")]);

    assert.match(packageJson, /arguments-builder build -c arguments-builder\.release\.config\.ts/);
    assert.match(packageJson, /arguments-builder build -c arguments-builder\.dev\.config\.ts/);
    assert.match(packageJson, /arguments-builder boxjs -c arguments-builder\.full\.config\.ts/);
    assert.match(packageJson, /arguments-builder build --config arguments-builder\.rewrite\.config\.ts/);
    assert.match(packageJson, /arguments-builder dts -c arguments-builder\.full\.config\.ts/);
    assert.match(sgmoduleTools, /from "\.\/arguments-builder\.dev\.config"/);
});

test("Dev builds use dev templates, bundles, and output names", async () => {
    const devTemplates = ["surge.dev.handlebars", "loon.dev.handlebars", "quantumultx.dev.handlebars", "stash.dev.handlebars"];
    const [config, packageJson, rollup, devWorkflow, deployWorkflow, sgmoduleTools, ...templates] = await Promise.all([
        readFile(new URL("../arguments-builder.dev.config.ts", import.meta.url), "utf8"),
        readFile(new URL("../package.json", import.meta.url), "utf8"),
        readFile(new URL("../rollup.dev.config.mjs", import.meta.url), "utf8"),
        readFile(new URL("../.github/workflows/dev.yml", import.meta.url), "utf8"),
        readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8"),
        readFile(new URL("../sgmodule-tools.config.ts", import.meta.url), "utf8"),
        ...devTemplates.map(filename => readFile(new URL(`../template/${filename}`, import.meta.url), "utf8")),
    ]);

    for (const output of ["sgmodule", "plugin", "snippet", "stoverride", "boxjs.json"]) {
        assert.ok(config.includes(`iRingo.WeatherKit.dev.${output}`), output);
    }
    for (const template of devTemplates) {
        assert.ok(config.includes(`./template/${template}`), template);
    }
    assert.doesNotMatch(config, /\boutput\b[^\n]*from "\.\/arguments-builder\.full\.config"/);
    assert.match(packageJson, /"dev": "npm-run-all --parallel build:dev build:dev-args"/);
    assert.match(devWorkflow, /run: npm run dev/);
    assert.match(rollup, /\.\/dist\/request\.dev\.bundle\.js/);
    assert.match(rollup, /\.\/dist\/response\.dev\.bundle\.js/);
    assert.doesNotMatch(rollup, /\.\/dist\/(?:request|response)\.bundle\.js/);
    assert.match(sgmoduleTools, /\.\/dist\/response\.dev\.bundle\.js/);

    for (const output of ["request.dev.bundle.js", "response.dev.bundle.js", "iRingo.WeatherKit.dev.sgmodule", "iRingo.WeatherKit.dev.plugin", "iRingo.WeatherKit.dev.snippet", "iRingo.WeatherKit.dev.stoverride"]) {
        assert.ok(deployWorkflow.includes(`dist/${output}`), output);
    }
    for (const [index, template] of templates.entries()) {
        assert.match(template, / β/, devTemplates[index]);
        assert.match(template, /(?:request|response)\.dev\.bundle\.js/, devTemplates[index]);
        assert.doesNotMatch(template, /\/raw\/(?:request|response)\.bundle\.js/, devTemplates[index]);
        assert.ok(template.includes(weatherAlertsPageHandlerPattern), devTemplates[index]);
        assert.ok(template.includes(weatherAlertsCoordinateHandlerPattern), devTemplates[index]);
    }

    const [surge, loon, quantumultX, stash] = templates;
    for (const template of [surge, loon]) {
        assert.match(template, /^\[URL Rewrite\]$/m);
        assert.match(template, /www\\\.qweather\\\.com\\\/\{1,2\}severe-weather/);
        assert.match(template, /www\\\.qweather\\\.com\\\/en\\\/severe-weather/);
        assert.match(template, /weather-\*\.apple\.com, www\.qweather\.com, \*api\.qweather\.com, api\.caiyunapp\.com, \*\.waqi\.info/);
        assert.doesNotMatch(template, /PROTOCOL,QUIC/);
    }
    for (const template of [surge, loon, quantumultX]) {
        assert.match(template, /airQualityScale[^\n]+request\.dev\.bundle\.js/);
    }
    assert.match(stash, /WeatherKit\.api\.v1\.airQualityScale\.request:[\s\S]*?url: [^\n]+request\.dev\.bundle\.js/);
    assert.match(loon, /api\.v1\.weather\.request/);
    for (const template of [surge, loon, quantumultX, stash]) {
        assert.doesNotMatch(template, /releases\/download/);
    }
});

test("Handler generation keeps Loon local and enables Egern", async () => {
    const content = await readFile(new URL("../arguments-builder.full.config.ts", import.meta.url), "utf8");
    assert.match(content, /path: "\.\/dist\/iRingo\.WeatherKit\.lpx"/);
    assert.match(content, /transformEgern: \{/);
    assert.match(content, /path: "\.\/dist\/iRingo\.WeatherKit\.yaml"/);
});

test("WeatherAlert provider settings expose web and user API choices", async () => {
    const [full, release, dev, database, types, boxjs] = await Promise.all([
        readFile(new URL("../arguments-builder.full.config.ts", import.meta.url), "utf8"),
        readFile(new URL("../arguments-builder.release.config.ts", import.meta.url), "utf8"),
        readFile(new URL("../arguments-builder.dev.config.ts", import.meta.url), "utf8"),
        readFile(new URL("../src/function/database.mjs", import.meta.url), "utf8"),
        readFile(new URL("../src/types.d.ts", import.meta.url), "utf8"),
        readFile(new URL("../template/boxjs.settings.json", import.meta.url), "utf8"),
    ]);

    assert.match(full, /key: "WeatherAlerts\.Provider"[\s\S]*defaultValue: "QWeatherWeb"[\s\S]*key: "WeatherKit"[\s\S]*key: "QWeatherWeb"[\s\S]*key: "QWeather"[\s\S]*key: "ColorfulClouds"/);
    assert.match(full, /export const weatherAlerts = \[weatherAlertsProvider\]/);
    assert.match(full, /export const airQuality = \[airQualityCurrentPollutantsProvider\]/);
    assert.match(full, /export const dataSets: Arg\[\] = \[[\s\S]*defaultValue: \["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "weatherAlerts"\]/);
    assert.match(full, /export const dataSetsFull: Arg\[\] = \[[\s\S]*defaultValue: \["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "locationInfo", "news", "historicalComparisons", "weatherAlerts", "weatherChanges"\][\s\S]*key: "weatherChanges", label: "天气变化"/);
    assert.doesNotMatch(full, /export const dataSetsFull: Arg\[\] = \[[\s\S]*\.\.\.dataSets\[0\]/);
    assert.match(full, /args: \[\.\.\.dataSetsFull/);
    assert.match(release, /import \{[^}]*dataSets[^}]*weatherAlerts[^}]*\} from "\.\/arguments-builder\.full\.config"/);
    assert.match(release, /import \{[^}]*airQuality[^}]*\} from "\.\/arguments-builder\.full\.config"/);
    assert.match(release, /args: \[\.\.\.dataSets,[^\]]*\.\.\.weatherAlerts,[^\]]*\.\.\.airQuality/);
    assert.match(dev, /import \{[^}]*airQualityFull[^}]*dataSetsFull[^}]*weatherFull[^}]*\} from "\.\/arguments-builder\.full\.config"/);
    assert.match(dev, /args: \[\.\.\.dataSetsFull, \.\.\.weatherFull, \.\.\.weatherAlerts, \.\.\.nextHourFull, \.\.\.airQualityFull, \.\.\.calculateFull, \.\.\.api, \.\.\.storage, \.\.\.logLevel\]/);
    assert.match(database, /WeatherAlerts: \{ Provider: "QWeatherWeb" \}/);
    assert.match(types, /WeatherAlerts\?: \{[\s\S]*Provider\?: "WeatherKit" \| "QWeatherWeb" \| "QWeather" \| "ColorfulClouds"/);
    assert.match(boxjs, /@iRingo\.WeatherKit\.Settings\.WeatherAlerts\.Provider[\s\S]*"val": "QWeatherWeb"[\s\S]*"key": "WeatherKit"/);
});
