import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

globalThis.$loon = "simulated Loon";
const store = new Map();
globalThis.$persistentStore = {
    read: key => store.get(key) ?? null,
    write: (value, key) => {
        store.set(key, value);
        return true;
    },
};
const [{ Response }, { default: parseWeatherKitURL }, { Console }] = await Promise.all([import("../src/process/Response.mjs"), import("../src/function/parseWeatherKitURL.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";
const removedSettings = { RequestCache: { TTL: 300, ForecastTTL: 300, MinutelyTTL: 30, AlertsTTL: 30, BudgetMs: 1, CooldownSeconds: 120, Diagnostics: true }, Region: { Fallback: "CN" }, ProviderFallback: { Enabled: true } };

test("legacy settings cannot restore provider switching, dispatch budgets or failure cooldown", async () => {
    store.set("iRingo", JSON.stringify({ WeatherKit: { Settings: removedSettings } }));
    globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather", Weather: { Provider: "QWeather", Replace: ["CN"] }, API: { ColorfulClouds: { Token: "configured-other-provider" }, QWeather: { Token: "selected-provider" } }, ...removedSettings };
    const request = { url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.2/121.5?country=CN&dataSets=currentWeather", method: "GET", headers: {} };
    const original = { status: 200, headers: { "Content-Type": "application/json", ETag: "apple" }, body: ' {"currentWeather":{"metadata":{"temporarilyUnavailable":false},"temperature":18,"conditionCode":"CLOUDY"}}\n' };
    let calls = 0;
    globalThis.$httpClient = {
        get(outgoing, callback) {
            calls++;
            assert.ok(outgoing.url.includes("/weather/now"));
            assert.equal(outgoing.headers["X-QW-Api-Key"], "selected-provider");
            assert.equal(outgoing.timeout, 5000);
            callback(null, { status: 429, headers: {} }, "{}");
        },
    };
    for (let i = 0; i < 3; i++) {
        const output = await Response(request, { ...original, headers: { ...original.headers } });
        assert.equal(output.body, original.body);
        assert.equal(output.headers.ETag, "apple");
    }
    assert.equal(calls, 3);
    assert.deepEqual([...store.keys()], ["iRingo"], "No removed feature may write new response or cooldown stores");
});

test("legacy region fallback does not override the explicit country or locale", () => {
    globalThis.$argument = { LogLevel: "OFF", ...removedSettings };
    const base = "https://weatherkit.apple.com/api/v3/weather/";
    assert.equal(parseWeatherKitURL(new URL(base + "en-US/31.2/121.5")).country, "US");
    assert.equal(parseWeatherKitURL(new URL(base + "zh-Hans/31.2/121.5")).country, undefined);
    assert.equal(parseWeatherKitURL(new URL(base + "en-US/31.2/121.5?country=HK")).country, "HK");
});

test("legacy region settings never cause a China-only weather replacement for a US locale", async () => {
    globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather", Weather: { Provider: "QWeather", Replace: ["CN"] }, ...removedSettings };
    globalThis.$httpClient = {
        get() {
            assert.fail("No inferred-country request should be made");
        },
    };
    const response = { status: 200, headers: { "Content-Type": "application/json" }, body: '{"currentWeather":{"metadata":{"temporarilyUnavailable":false},"temperature":18,"conditionCode":"CLOUDY"}}' };
    assert.equal((await Response({ url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.2/121.5?dataSets=currentWeather", method: "GET", headers: {} }, response)).body, response.body);
});

test("active runtime and argument definitions contain none of the removed controls", async () => {
    const forbidden = /RequestCache|ProviderFallback|Region\.Fallback|ProviderRequestCache|resolveWeatherRegion|recoverConfiguredProduct/;
    async function verify(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
            if (entry.isDirectory()) await verify(file);
            else if (/\.(?:mjs|js|ts)$/.test(entry.name)) assert.doesNotMatch(await readFile(file, "utf8"), forbidden, file.pathname);
        }
    }
    await verify(new URL("../src/", import.meta.url));
    for (const name of ["full", "release", "dev"]) assert.doesNotMatch(await readFile(new URL(`../arguments-builder.${name}.config.ts`, import.meta.url), "utf8"), forbidden);
    const settings = JSON.parse(await readFile(new URL("../template/boxjs.settings.json", import.meta.url), "utf8"));
    assert.doesNotMatch(JSON.stringify(settings), forbidden);
});
