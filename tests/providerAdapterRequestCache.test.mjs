// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "Mac simulated Loon";
const values = new Map();
globalThis.$persistentStore = {
    read: key => values.get(key),
    write: (value, key) => {
        values.set(key, value);
        return true;
    },
};
let pending = [];
globalThis.$httpClient = {
    get(request, callback) {
        pending.push({ request, callback });
    },
};
const [{ default: ColorfulClouds }, { default: QWeather }, { default: ProviderRequestCache }, { Console }] = await Promise.all([import("../src/class/ColorfulClouds.mjs"), import("../src/class/QWeather.mjs"), import("../src/class/ProviderRequestCache.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";
const parameters = { latitude: 31.2, longitude: 121.5, country: "CN", language: "zh-CN", version: "v2" };
const finish = (body, status = 200) => {
    const tasks = pending;
    pending = [];
    for (const task of tasks) task.callback(null, { status, headers: {} }, JSON.stringify(body));
};
const realtime = {
    status: "ok",
    location: [31.2, 121.5],
    server_time: 1_790_000_000,
    result: {
        server_time: 1_790_000_000,
        realtime: { status: "ok", temperature: 23, apparent_temperature: 24, cloudrate: 0.2, skycon: "CLEAR_DAY", humidity: 0.8, precipitation: { local: { intensity: 0 } }, pressure: 100_000, visibility: 10, wind: { direction: 90, speed: 1 } },
        alert: { status: "ok", content: [] },
    },
};
const weatherNow = {
    code: "200",
    updateTime: "2026-10-19T00:00:00+08:00",
    fxLink: "https://example.test/weather",
    now: { obsTime: "2026-10-19T00:00:00+08:00", temp: "23", feelsLike: "24", text: "晴", icon: "100", wind360: "90", windSpeed: "1", windScale: "1", humidity: "80", precip: "0", pressure: "1000", vis: "10", cloud: "20", dew: "15" },
};

test("Caiyun real provider coalesces six requests and refreshes when expired", async () => {
    values.clear();
    let now = 100_000;
    const cache = new ProviderRequestCache({ now: () => now });
    const provider = new ColorfulClouds(parameters, "fixture-caiyun-token", cache);
    const consumers = Array.from({ length: 6 }, () => provider.CurrentWeather());
    assert.equal(pending.length, 1);
    assert.equal(pending[0].request.timeout, 5000);
    finish(realtime);
    assert.ok((await Promise.all(consumers)).every(product => product.temperature === 23));
    assert.equal((await provider.CurrentWeather()).temperature, 23);
    assert.equal(pending.length, 0);
    now += 60_000;
    const refresh = provider.CurrentWeather();
    assert.equal(pending.length, 1);
    finish({ status: "error" }, 503);
    assert.equal((await refresh).metadata.temporarilyUnavailable, true);
    const retry = provider.CurrentWeather();
    assert.equal(pending.length, 1);
    finish(realtime);
    assert.equal((await retry).temperature, 23);
});

test("Caiyun yesterday hourly queries share a stable hour key across fresh executions", async () => {
    values.clear();
    const dateNow = Date.now;
    let now = Date.UTC(2026, 9, 19, 0, 0, 10),
        requests = 0;
    Date.now = () => now;
    const hourly = { status: "ok", result: { hourly: { status: "ok", air_quality: { aqi: [{ value: { usa: 42, chn: 40 } }] } } } };
    try {
        for (let i = 0; i < 6; i++, now += 10000) {
            const provider = new ColorfulClouds(parameters, "hourly-fixture-token", new ProviderRequestCache({ ttls: { forecast: 180 }, now: () => now }));
            const result = provider.YesterdayAirQuality();
            if (pending.length) {
                requests++;
                assert.equal(new URL(pending[0].request.url).searchParams.get("begin"), String(Date.UTC(2026, 9, 18) / 1000));
                finish(hourly);
            }
            assert.equal((await result).index, 42);
        }
        assert.equal(requests, 1);
        now = Date.UTC(2026, 9, 19, 1, 0, 0);
        const result = new ColorfulClouds(parameters, "hourly-fixture-token", new ProviderRequestCache({ now: () => now })).YesterdayAirQuality();
        assert.equal(pending.length, 1);
        assert.equal(new URL(pending[0].request.url).searchParams.get("begin"), String(Date.UTC(2026, 9, 18, 1) / 1000));
        finish(hourly);
        assert.equal((await result).index, 42);
    } finally {
        Date.now = dateNow;
    }
});

test("QWeather real provider shares requests and isolates changed authorization", async () => {
    values.clear();
    const cache = new ProviderRequestCache();
    const provider = new QWeather(parameters, "fixture-qweather-token", "devapi.qweather.com", cache);
    const consumers = Array.from({ length: 6 }, () => provider.WeatherNow());
    assert.equal(pending.length, 1);
    assert.equal(pending[0].request.headers["X-QW-Api-Key"], "fixture-qweather-token");
    finish(weatherNow);
    assert.ok((await Promise.all(consumers)).every(product => product.temperature === 23));
    const same = new QWeather(parameters, "fixture-qweather-token", "devapi.qweather.com", new ProviderRequestCache());
    assert.equal((await same.WeatherNow()).temperature, 23);
    assert.equal(pending.length, 0);
    const changed = new QWeather(parameters, "changed-qweather-token", "devapi.qweather.com", cache);
    const next = changed.WeatherNow();
    assert.equal(pending.length, 1);
    finish({ ...weatherNow, now: { ...weatherNow.now, temp: "24" } });
    assert.equal((await next).temperature, 24);
});

for (const order of ["alerts-first", "current-first"]) {
    test(`Caiyun keeps healthy current weather when its shared alert subproduct fails (${order})`, async () => {
        values.clear();
        const cache = new ProviderRequestCache();
        const provider = new ColorfulClouds(parameters, "fixture-caiyun-token", cache);
        const tasks = order === "alerts-first" ? [provider.WeatherAlert(), provider.CurrentWeather()] : [provider.CurrentWeather(), provider.WeatherAlert()];
        assert.equal(pending.length, 1);
        finish({ ...realtime, result: { ...realtime.result, alert: { status: "error" } } });
        const results = await Promise.all(tasks);
        const [alerts, current] = order === "alerts-first" ? results : results.toReversed();
        assert.equal(alerts.metadata.temporarilyUnavailable, true);
        assert.equal(current.temperature, 23);
        assert.equal(cache.stats.requests, 1);
        assert.equal(cache.stats.failures, 1);
    });
}

test("QWeather rejects nonnumeric temperature even if its JSON code says 200", async () => {
    values.clear();
    const cache = new ProviderRequestCache();
    const provider = new QWeather(parameters, "fixture-qweather-token", "devapi.qweather.com", cache);
    const task = provider.WeatherNow();
    finish({ ...weatherNow, now: { ...weatherNow.now, temp: "not-a-number" } });
    assert.equal(await task, undefined);
    assert.equal(cache.stats.failureReasons.invalid, 1);
});

test("an unchanged QWeather location grid survives a native 304 response", async () => {
    const existing = { lastUpdated: Date.now() - 31 * 86400000, etag: "fixture-grid", data: { "31,121": [{ name: "fixture" }] } };
    const runtime = new ProviderRequestCache();
    let updated;
    const task = QWeather.GetLocationsGrid(
        { locationsGrid: existing },
        value => {
            updated = value;
        },
        runtime,
    );
    assert.equal(pending.length, 1);
    assert.equal(pending[0].request.headers["If-None-Match"], "fixture-grid");
    finish(undefined, 304);
    assert.deepEqual(await task, existing.data);
    assert.equal(updated.locationsGrid.data, existing.data);
    assert.equal(updated.locationsGrid.etag, existing.etag);
    assert.ok(updated.locationsGrid.lastUpdated > existing.lastUpdated);
    assert.equal(runtime.stats.failures, 0);
});

test("a provider receives exactly 499 ms when only 499 ms of the dispatch budget remains", async () => {
    values.clear();
    let now = 100000;
    const runtime = new ProviderRequestCache({ now: () => now, budgetMs: 1000 });
    const provider = new QWeather(parameters, "fixture-budget-token", "devapi.qweather.com", runtime);
    now += 501;
    const task = provider.WeatherNow();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].request.timeout, 499);
    finish(weatherNow);
    assert.equal((await task).temperature, 23);
});
