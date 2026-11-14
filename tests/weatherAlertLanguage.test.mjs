// Synthetic source responses test language routing; no translation service or live account is used.
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$httpClient = { get() { throw new Error("Unexpected network request"); } };
const [{ weatherAlertLanguage, weatherAlertParameters }, { default: createProviderEnvironment }, { GetWeatherAlerts }, { default: ProviderTransport }, { default: database }, { Console }] = await Promise.all([
    import("../src/function/weatherAlertLanguage.mjs"),
    import("../src/function/createProviderEnvironment.mjs"),
    import("../src/function/getWeatherAlerts.mjs"),
    import("../src/class/ProviderTransport.mjs"),
    import("../src/function/database.mjs"),
    import("@nsnanocat/util"),
]);
const [{ Response }, { Response: ResponseDev }, { default: QWeather }] = await Promise.all([import("../src/process/Response.mjs"), import("../src/process/Response.dev.mjs"), import("../src/class/QWeather.mjs")]);
Console.logLevel = "OFF";
const parameters = { latitude: 31.2, longitude: 121.5, country: "CN", version: "v1", language: "en-GB", weatherKitLanguage: "en-GB" };
const settings = (language, provider = "QWeatherWeb") => ({ WeatherAlerts: { Provider: provider, ...(language === undefined ? {} : { Language: language }) }, API: {} });
const html = english => `<html><h1 class="c-submenu__location">Fixture</h1><div class="c-city-warning-events warning--yellow"><h3>${english ? "Fixture Observatory issues yellow warning for heavy fog" : "测试市气象台发布大雾黄色预警"}</h3><p>Issue date: 2026-11-14T00:24+08:00</p><p class="warning-events__txt">${english ? "Original source fog notice." : "来源原文：请防范大雾。"}</p></div><div class="c-city-warning-around"></div></html>`;

test("missing, Auto and unsupported saved language settings retain the original parameter object", () => {
    for (const value of [undefined, "Auto", "auto", "", null, false, {}, ["en"], "fr", "zh-Hant", "<invalid>"]) {
        assert.equal(weatherAlertLanguage(settings(value)), undefined);
        assert.equal(weatherAlertParameters(parameters, settings(value)), parameters);
    }
    assert.equal(database.WeatherKit.Settings.WeatherAlerts.Language, "Auto");
});

test("supported language aliases only override warning locale fields", () => {
    for (const [value, expected] of [["zh-Hans", "zh-Hans"], ["zh_CN", "zh-Hans"], ["zh-CN", "zh-Hans"], ["en", "en"], ["en-US", "en"], ["en_GB", "en"]]) {
        const actual = weatherAlertParameters(parameters, settings(value));
        assert.deepEqual(actual, { ...parameters, language: expected, weatherKitLanguage: expected });
        assert.notEqual(actual, parameters);
        assert.equal(parameters.language, "en-GB");
    }
});

test("Auto shares existing lazy provider instances", () => {
    const env = createProviderEnvironment(parameters, settings("Auto"), new ProviderTransport());
    assert.equal(env.weatherAlertsQWeather, env.qWeather);
    assert.equal(env.weatherAlertsColorfulClouds, env.colorfulClouds);
});

test("explicit warning language is isolated from other weather and AQ provider instances", () => {
    const env = createProviderEnvironment(parameters, settings("zh-Hans"), new ProviderTransport());
    assert.notEqual(env.weatherAlertsQWeather, env.qWeather);
    assert.notEqual(env.weatherAlertsColorfulClouds, env.colorfulClouds);
    assert.equal(env.qWeather.language, "en");
    assert.equal(env.colorfulClouds.language, "en_GB");
    assert.equal(env.weatherAlertsQWeather.language, "zh-hans");
    assert.equal(env.weatherAlertsColorfulClouds.language, "zh_CN");
    assert.equal(env.qWeather.weatherKitLanguage, "en-GB");
    assert.equal(env.weatherAlertsQWeather.weatherKitLanguage, "zh-Hans");
});

for (const [preference, english] of [["zh-Hans", false], ["en", true]]) {
    test(`${preference}: page details request a native source locale and preserve original text and attribution`, async t => {
        const seen = [];
        t.mock.method(globalThis.$httpClient, "get", (request, callback) => {
            seen.push(request);
            callback(null, { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }, html(english));
        });
        const headers = { "Accept-Language": english ? "zh-CN" : "en-GB", "If-None-Match": "original-apple-validator" };
        const originalHeaders = structuredClone(headers);
        const result = await GetWeatherAlerts("fixture-101010100", parameters, settings(preference), headers, new ProviderTransport());
        assert.equal(seen.length, 1);
        assert.equal(new URL(seen[0].url).pathname.startsWith("/en/"), english);
        assert.equal(seen[0].headers["Accept-Language"], preference);
        assert.deepEqual(headers, originalHeaders);
        assert.equal(result.status, 200);
        assert.equal(result.headers["Cache-Control"], "no-store");
        const rows = JSON.parse(result.body);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].messages[0].text, english ? "Original source fog notice." : "来源原文：请防范大雾。");
        assert.equal(rows[0].messages[0].language, "und", "requested language does not certify returned warning text");
        assert.equal(new URL(rows[0].attributionURL).hostname, "www.qweather.com");
        assert.ok(rows[0].source);
    });
}

test("different language source URLs stay distinct and a shared transport reuses no completed alert data", async t => {
    const URLs = [];
    t.mock.method(globalThis.$httpClient, "get", (request, callback) => {
        URLs.push(request.url);
        callback(null, { status: 200, headers: { "Content-Type": "text/html" } }, html(new URL(request.url).pathname.startsWith("/en/")));
    });
    const transport = new ProviderTransport();
    const zh = await GetWeatherAlerts("fixture-101010100", parameters, settings("zh-Hans"), {}, transport);
    const en = await GetWeatherAlerts("fixture-101010100", parameters, settings("en"), {}, transport);
    assert.equal(URLs.length, 2);
    assert.notEqual(URLs[0], URLs[1]);
    assert.notEqual(JSON.parse(zh.body)[0].messages[0].text, JSON.parse(en.body)[0].messages[0].text);
});

test("old settings and explicit Auto retain exactly the same detail response and request language", async t => {
    const seen = [];
    t.mock.method(globalThis.$httpClient, "get", (request, callback) => {
        seen.push(request);
        callback(null, { status: 200, headers: { "Content-Type": "text/html" } }, html(true));
    });
    const a = await GetWeatherAlerts("fixture-101010100", parameters, settings(undefined), {}, new ProviderTransport());
    const b = await GetWeatherAlerts("fixture-101010100", parameters, settings("Auto"), {}, new ProviderTransport());
    assert.deepEqual(a, b);
    assert.equal(a.headers["Cache-Control"], "max-age=0");
    assert.equal(JSON.parse(a.body)[0].messages[0].language, "en-GB");
    assert.equal(seen[0].url, seen[1].url);
});

test("an API returning another language keeps the source original instead of inventing English", async t => {
    let requested;
    t.mock.method(globalThis.$httpClient, "get", (request, callback) => {
        requested = request;
        callback(null, { status: 200, headers: {} }, JSON.stringify({ metadata: {}, alerts: [{ id: "source-original", senderName: "原签发单位", issuedTime: "2026-11-14T00:00:00Z", effectiveTime: "2026-11-14T00:00:00Z", expireTime: "2099-01-01T00:00:00Z", headline: "来源中文预警", description: "该来源没有提供英文，保留此原文。", severity: "moderate", responseTypes: [] }] }));
    });
    const result = await GetWeatherAlerts("31.2,121.5", parameters, settings("en", "QWeather"), {}, new ProviderTransport());
    assert.equal(new URL(requested.url).searchParams.get("lang"), "en");
    const row = JSON.parse(result.body)[0];
    assert.equal(row.messages[0].text, "该来源没有提供英文，保留此原文。");
    assert.equal(row.messages[0].language, "und");
    assert.equal(row.source, "原签发单位");
});

for (const [name, status, body] of [["HTTP failure", 403, "blocked"], ["missing fields", 200, "<html>unrecognized</html>"], ["empty source body", 200, ""]]) {
    test(`${name}: preferred language never manufactures an available response`, async t => {
        let calls = 0;
        t.mock.method(globalThis.$httpClient, "get", (_, callback) => {
            calls++;
            callback(null, { status, headers: { "Content-Type": "text/html" } }, body);
        });
        assert.equal(await GetWeatherAlerts("fixture-101010100", parameters, settings("en"), {}, new ProviderTransport()), undefined);
        assert.equal(calls, 1);
    });
}

test("WeatherKit-selected coordinate details retain the Apple path for every preference", async () => {
    for (const value of ["Auto", "zh-Hans", "en"]) assert.equal(await GetWeatherAlerts("31.2,121.5", parameters, settings(value, "WeatherKit"), {}, new ProviderTransport()), undefined);
});

test("missing coordinate parameters fall back without throwing or contacting a provider", async () => {
    for (const value of [undefined, null, {}]) {
        for (const preference of ["Auto", "en"]) assert.equal(await GetWeatherAlerts("31.2,121.5", value, settings(preference), undefined, new ProviderTransport()), undefined);
    }
});

test("Caiyun language requests retain an untranslated original when that is what the source supplies", async t => {
    let outgoing;
    t.mock.method(globalThis.$httpClient, "get", (request, callback) => {
        outgoing = request;
        callback(null, { status: 200, headers: {} }, JSON.stringify({ status: "ok", result: { realtime: { status: "ok" }, alert: { status: "ok", content: [{ code: "0501", description: "原始中文预警，请保留原意。", pubtimestamp: 1794615840, source: "测试签发单位", regionId: "fixture-region", city: "测试区域" }] } } }));
    });
    const result = await GetWeatherAlerts("31.2,121.5", parameters, settings("en", "ColorfulClouds"), {}, new ProviderTransport());
    assert.equal(new URL(outgoing.url).searchParams.get("lang"), "en_US");
    const row = JSON.parse(result.body)[0];
    assert.ok(row.messages.some(message => message.text === "原始中文预警，请保留原意。"));
    assert.ok(row.messages.every(message => message.language === "und"));
});

for (const [name, process] of [["release", Response], ["development", ResponseDev]]) {
    test(`${name}: WK3 weather and alerts use independent locales in the same response`, async t => {
        const seen = [];
        t.mock.method(QWeather.prototype, "WeatherNow", async function () {
            seen.push(["weather", this.language]);
            return { metadata: { providerName: "Fixture Weather", temporarilyUnavailable: false }, temperature: 22, conditionCode: "CLEAR" };
        });
        t.mock.method(QWeather.prototype, "WeatherAlertWeb", async function () {
            seen.push(["alerts", this.weatherKitLanguage]);
            return { metadata: { temporarilyUnavailable: false }, alerts: [], detailsUrl: "https://weatherkit.apple.com/alertDetails/index.html?ids=fixture-101010100&lang=zh-Hans" };
        });
        const previous = globalThis.$argument;
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather,weatherAlerts", Weather: { Provider: "QWeather", Replace: ["CN"] }, WeatherAlerts: { Provider: "QWeatherWeb", Language: "zh-Hans" } };
        try {
            const response = await process({ method: "GET", url: "https://weatherkit.apple.com/api/v3/weather/en-GB/31.2/121.5?country=CN&dataSets=currentWeather,weatherAlerts", headers: {} }, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentWeather: { metadata: { temporarilyUnavailable: false }, temperature: 18, conditionCode: "CLEAR" }, weatherAlerts: { metadata: { providerName: "National Early Warning Center", temporarilyUnavailable: true }, alerts: [] }, futureProduct: { keep: true } }) });
            assert.deepEqual(seen.sort(), [["alerts", "zh-Hans"], ["weather", "en"]]);
            const body = JSON.parse(response.body);
            assert.equal(body.currentWeather.temperature, 22);
            assert.equal(body.weatherAlerts.metadata.temporarilyUnavailable, true);
            assert.deepEqual(body.futureProduct, { keep: true });
        } finally {
            globalThis.$argument = previous;
        }
    });
}
