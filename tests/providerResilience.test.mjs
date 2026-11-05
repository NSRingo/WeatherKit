// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
globalThis.$loon = "simulated Loon";
const persistent = new Map();
globalThis.$persistentStore = {
    read: key => persistent.get(key),
    write: (value, key) => {
        persistent.set(key, value);
        return true;
    },
};
const callbacks = [];
globalThis.$httpClient = { get: (request, callback) => callbacks.push({ request, callback }) };
const [{ default: Cache }, { default: QWeather }, { default: resolveRegion, countryFromCoordinates }, { activeProviderAlerts, cloneWeatherProduct }, { default: utf8Length }, { Console }] = await Promise.all([
    import("../src/class/ProviderRequestCache.mjs"),
    import("../src/class/QWeather.mjs"),
    import("../src/function/resolveWeatherRegion.mjs"),
    import("../src/function/providerRecovery.mjs"),
    import("../src/function/utf8Length.mjs"),
    import("@nsnanocat/util"),
]);
Console.logLevel = "OFF";
const store = () => {
    let raw;
    return {
        read: () => raw,
        write: value => {
            raw = value;
            return true;
        },
        value: () => raw,
    };
};
const request = { url: "https://provider.example/31.2/121.5?token=fixture-secret", headers: { Authorization: "fixture-auth" } };
const response = (status = 200, headers = {}) => ({ status, ok: status >= 200 && status < 300, headers, body: JSON.stringify({ status: "ok" }) });
const options = { partition: ["provider", "zh-CN"], product: "now", validate: body => body.status === "ok" };

test("two transient failures cool down across Loon executions without persisting credentials", async () => {
    let now = 100000,
        calls = 0;
    const failures = store();
    const make = () => new Cache({ now: () => now, store: store(), failureStore: failures, cooldownSeconds: 30 });
    const fetcher = async () => {
        calls++;
        throw new Error(`timeout ${request.url}`);
    };
    for (let i = 0; i < 2; i++) await assert.rejects(make().fetch(request, { ...options, fetcher }), /timeout/);
    await assert.rejects(make().fetch(request, { ...options, fetcher }), /cooldown/);
    assert.equal(calls, 2);
    assert.doesNotMatch(failures.value(), /fixture-secret|fixture-auth|provider\.example|31\.2/);
    const changed = { ...request, headers: { Authorization: "other-account" } };
    await make().fetch(changed, { ...options, fetcher: async () => response() });
    now += 30000;
    await make().fetch(request, {
        ...options,
        fetcher: async () => {
            calls++;
            return response();
        },
    });
    assert.equal(calls, 3);
    await make().fetch(request, { ...options, fetcher: async () => response() });
});

test("rate limits cool down immediately and Retry-After is bounded to 120 seconds", async () => {
    let now = 100000,
        calls = 0;
    const failures = store();
    const make = () => new Cache({ now: () => now, store: store(), failureStore: failures, cooldownSeconds: 30 });
    await assert.rejects(
        make().fetch(request, {
            ...options,
            fetcher: async () => {
                calls++;
                return response(429, { "Retry-After": "999999" });
            },
        }),
        error => error.code === "rate_limit",
    );
    now += 119999;
    await assert.rejects(make().fetch(request, { ...options, fetcher: async () => response() }), /cooldown/);
    now++;
    await make().fetch(request, {
        ...options,
        fetcher: async () => {
            calls++;
            return response();
        },
    });
    assert.equal(calls, 2);
});

test("clock rollback and corrupt cooldown storage do not suppress future native requests", async () => {
    const failures = store();
    failures.write(JSON.stringify({ version: 1, entries: [{ key: "a".repeat(64), at: 200000, until: 230000, count: 2 }] }));
    let called = 0;
    const cache = new Cache({ now: () => 100000, cooldownSeconds: 30, failureStore: failures, store: store() });
    await cache.fetch(request, {
        ...options,
        fetcher: async () => {
            called++;
            return response();
        },
    });
    assert.equal(called, 1);
});

test("queued work expires without cancelling active native callbacks or starting a late request", async () => {
    let now = 100000;
    const complete = [];
    const sent = [];
    const cache = new Cache({ now: () => now, budgetMs: 1000, store: store() });
    const pending = Array.from({ length: 4 }, (_, i) =>
        cache.fetch(
            { ...request, url: `${request.url}&item=${i}` },
            {
                ...options,
                fetcher: req => {
                    sent.push(req);
                    return new Promise(resolve => complete.push(() => resolve(response())));
                },
            },
        ),
    );
    const settled = Promise.allSettled(pending);
    assert.equal(sent.length, 3);
    assert.ok(sent.every(req => req.timeout === 1000));
    let finished = false;
    settled.then(() => {
        finished = true;
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(finished, false);
    now += 1000;
    for (const done of complete) done();
    const result = await settled;
    assert.equal(result.filter(r => r.status === "fulfilled").length, 3);
    assert.equal(result[3].reason.code, "budget");
    assert.equal(sent.length, 3);
    assert.equal(cache.stats.budgetSkips, 1);
});

test("per-product TTLs and the global zero switch retain distinct freshness limits", async () => {
    let now = 100000,
        calls = 0;
    const cache = Cache.fromSettings({ RequestCache: { TTL: 60, ForecastTTL: 180, MinutelyTTL: 15, AlertsTTL: 15 } }, { now: () => now, budgetMs: 0, store: store(), failureStore: store() });
    const fetcher = async () => {
        calls++;
        return response();
    };
    for (const kind of ["current", "forecast", "minutely", "alerts"]) await cache.fetch({ ...request, url: `${request.url}&kind=${kind}` }, { ...options, kind, fetcher });
    now += 16000;
    for (const kind of ["current", "forecast", "minutely", "alerts"]) await cache.fetch({ ...request, url: `${request.url}&kind=${kind}` }, { ...options, kind, fetcher });
    assert.equal(calls, 6);
    now = 161000;
    for (const kind of ["current", "forecast"]) await cache.fetch({ ...request, url: `${request.url}&kind=${kind}` }, { ...options, kind, fetcher });
    assert.equal(calls, 7);
    const disabled = Cache.fromSettings({ RequestCache: { TTL: 0 } }, { budgetMs: 0, store: store() });
    let n = 0;
    for (let i = 0; i < 2; i++)
        await disabled.fetch(request, {
            ...options,
            kind: "forecast",
            fetcher: async () => {
                n++;
                return response();
            },
        });
    assert.equal(n, 2);
});

test("eight cache slots are shared fairly by city while retaining a strict storage limit", async () => {
    let now = 100000;
    const storage = store(),
        cache = new Cache({ now: () => now, store: storage });
    for (const city of ["first", "second"])
        for (let product = 0; product < 6; product++) {
            now++;
            await cache.fetch({ ...request, url: `${request.url}&city=${city}&product=${product}` }, { ...options, group: [city], fetcher: async () => response() });
        }
    const entries = JSON.parse(storage.value()).entries;
    assert.equal(entries.length, 8);
    const counts = Object.values(Object.groupBy(entries, e => e.group))
        .map(a => a.length)
        .sort();
    assert.deepEqual(counts, [4, 4]);
    assert.ok(storage.value().length <= 256 * 1024);
    assert.doesNotMatch(storage.value(), /first|second|fixture-auth/);
});

test("diagnostics are opt-in, emitted once, and contain only safe reasons and counters", async () => {
    const messages = [],
        original = console.log;
    console.log = value => messages.push(value);
    try {
        const cache = Cache.fromSettings({ RequestCache: { Diagnostics: true } }, { store: store(), failureStore: store() });
        await cache.fetch(request, { ...options, fetcher: async () => response() });
        cache.noteFallback("currentWeather", "timeout");
        cache.report("response");
        cache.report("request");
        new Cache().report();
    } finally {
        console.log = original;
    }
    assert.equal(messages.length, 1);
    assert.match(messages[0], /currentWeather:timeout/);
    assert.doesNotMatch(messages[0], /fixture-secret|fixture-auth|provider\.example|31\.2|121\.5/);
});

const html = '<html><h1 class="c-submenu__location">Fixture City</h1><div class="c-city-warning-events warning--orange"><h3>Fixture warning</h3><p>Issue date: 2026-10-19T01:00:00Z</p></div></html>';
test("six default webpage warning consumers share one native request and reuse parsed records", async () => {
    persistent.clear();
    callbacks.length = 0;
    const runtime = Cache.fromSettings({}, { budgetMs: 0 });
    const all = Promise.all(Array.from({ length: 6 }, () => QWeather.FetchWeatherAlertPage("fixture-101190110", "en-US", {}, runtime)));
    assert.equal(callbacks.length, 1);
    const call = callbacks.shift();
    assert.equal(call.request.timeout, 5000);
    call.callback(null, { status: 200, headers: { "Content-Type": "text/html" } }, html);
    const results = await all;
    assert.equal(results.length, 6);
    assert.ok(results.every(r => r.metadata.temporarilyUnavailable === false));
    const next = await QWeather.FetchWeatherAlertPage("fixture-101190110", "en-US", {}, Cache.fromSettings({}, { budgetMs: 0 }));
    assert.equal(next.metadata.temporarilyUnavailable, false);
    assert.equal(callbacks.length, 0);
    const raw = [...persistent.values()].join("");
    assert.doesNotMatch(raw, /<html>|fixture-101190110|severe-weather/);
});

test("an unrecognized webpage is unavailable, never a cached no-warning success", async () => {
    persistent.clear();
    callbacks.length = 0;
    const runtime = Cache.fromSettings({}, { budgetMs: 0 });
    const pending = QWeather.FetchWeatherAlertPage("fixture-101190110", "en-US", {}, runtime);
    callbacks.shift().callback(null, { status: 200, headers: { "Content-Type": "text/html" } }, "<html>Access denied</html>");
    const result = await pending;
    assert.equal(result.metadata.temporarilyUnavailable, true);
    assert.equal(runtime.stats.stores, 0);
});

test("expired and invalid third-party alerts are excluded without altering unknown-expiry alerts", () => {
    assert.deepEqual(
        activeProviderAlerts([{ id: 1, expireTime: "2000-01-01T00:00:00Z" }, { id: 2, expireTime: "2099-01-01T00:00:00Z" }, { id: 3 }, { id: 4, expireTime: "bad" }], Date.parse("2026-10-19T00:00:00Z")).map(a => a.id),
        [2, 3],
    );
});

test("conservative polygons fix the domestic-coordinate/US-locale case without rectangular border guesses", () => {
    assert.equal(countryFromCoordinates(32.39, 119.499), "CN");
    assert.equal(countryFromCoordinates(25.04, 121.56), "TW");
    assert.equal(countryFromCoordinates(22.4, 114.12), "HK");
    for (const p of [
        [47.92, 106.92],
        [27.7, 85.3],
        [35.68, 139.69],
        [0, 0],
        [91, 0],
    ])
        assert.equal(countryFromCoordinates(...p), undefined);
    assert.equal(resolveRegion({ latitude: 32.39, longitude: 119.499, localeCountry: "US" }), "CN");
    assert.equal(resolveRegion({ latitude: 32.39, longitude: 119.499, explicitCountry: "US", localeCountry: "CN" }), "US");
    assert.equal(resolveRegion({ latitude: 32.39, longitude: 119.499, fallback: "Locale", localeCountry: "US" }), "US");
});

test("explicit per-coordinate hints are bounded, hashed, and remain separate between cities", () => {
    const storage = store();
    const original = { latitude: 22.16, longitude: 113.56, localeCountry: "US", store: storage, now: () => 100000 };
    assert.equal(resolveRegion({ ...original, explicitCountry: "MO" }), "MO");
    assert.equal(resolveRegion(original), "MO");
    assert.doesNotMatch(storage.value(), /22\.16|113\.56/);
    assert.equal(resolveRegion({ ...original, latitude: 35.68, longitude: 139.69 }), "US");
    assert.equal(resolveRegion({ ...original, now: () => 100000 + 7 * 86400000 }), "US");
});

test("product snapshots preserve binary values and isolate partial mutations before a failed replacement", () => {
    const original = { metadata: { providerName: "Apple" }, days: [{ v: 1 }], bytes: new Uint8Array([1, 2]) },
        copy = cloneWeatherProduct(original);
    copy.days[0].v = 2;
    copy.bytes[0] = 9;
    assert.equal(original.days[0].v, 1);
    assert.equal(original.bytes[0], 1);
    assert.ok(copy.bytes instanceof Uint8Array);
});

test("UTF-8 body bounds work without TextEncoder and stop once the limit is exceeded", () => {
    for (const value of ["abc", "天气", "😀", "\ud800", "a😀天"]) assert.equal(utf8Length(value), Buffer.byteLength(value));
    assert.ok(utf8Length("天".repeat(1000), 100) > 100);
});

test("actual response processing preserves Apple products on provider failure and waits for every native callback", async () => {
    persistent.clear();
    callbacks.length = 0;
    const saved = globalThis.$argument;
    globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: ["currentWeather", "forecastHourly"], Weather: { Provider: "QWeather", Replace: ["CN"] }, Region: { Fallback: "Auto" }, RequestCache: { BudgetMs: 8000, CooldownSeconds: 30 } };
    try {
        const [{ default: WeatherKit2 }, { Response }, { ByteBuffer }] = await Promise.all([import("../src/class/WeatherKit2.mjs"), import("../src/process/Response.mjs"), import("flatbuffers")]);
        const raw = WeatherKit2.encode(undefined, {
            currentWeather: {
                metadata: { providerName: "Apple", temporarilyUnavailable: false },
                temperature: 27,
                precipitationAmountNext1hByType: [],
                precipitationAmountNext24hByType: [],
                precipitationAmountNext6hByType: [],
                precipitationAmountPrevious1hByType: [],
                precipitationAmountPrevious24hByType: [],
                precipitationAmountPrevious6hByType: [],
            },
            forecastHourly: { metadata: { providerName: "Apple", temporarilyUnavailable: false }, hours: [] },
        });
        const before = WeatherKit2.decode(new ByteBuffer(raw), ["currentWeather", "forecastHourly"]);
        assert.equal(before.currentWeather?.temperature, 27);
        const pending = Response({ url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?dataSets=currentWeather,forecastHourly", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw });
        let settled = false;
        pending.then(() => {
            settled = true;
        });
        assert.equal(callbacks.length, 2);
        callbacks.shift().callback("timeout fixture-secret", {}, "");
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(settled, false);
        callbacks.shift().callback("timeout fixture-secret", {}, "");
        const result = await pending;
        const after = WeatherKit2.decode(new ByteBuffer(result.body), ["currentWeather", "forecastHourly"]);
        assert.deepEqual(after, before);
        assert.deepEqual(Array.from(result.body), Array.from(raw));
        assert.equal(after.currentWeather.temperature, 27);
    } finally {
        globalThis.$argument = saved;
    }
});

test("backup queries require a configured dedicated credential and never replace valid Apple data", async () => {
    const { default: recover } = await import("../src/function/recoverConfiguredProduct.mjs");
    let calls = 0;
    const value = { metadata: { providerName: "QWeather", temporarilyUnavailable: false }, temperature: 20 },
        failed = { metadata: { temporarilyUnavailable: true } };
    const loaders = {
        QWeather: async () => {
            calls++;
            return value;
        },
    };
    const runtime = new Cache();
    assert.equal(await recover("currentWeather", failed, undefined, "ColorfulClouds", loaders, {}, runtime), failed);
    assert.equal(calls, 0);
    assert.equal(await recover("currentWeather", failed, { metadata: { providerName: "Apple" } }, "ColorfulClouds", loaders, { API: { QWeather: { Token: "configured-account" } } }, runtime), failed);
    assert.equal(calls, 0);
    assert.equal(await recover("currentWeather", failed, undefined, "ColorfulClouds", loaders, { API: { QWeather: { Token: "configured-account" } } }, runtime), value);
    assert.equal(calls, 1);
    assert.equal(runtime.stats.backupSuccesses, 1);
    assert.equal(await recover("currentWeather", undefined, undefined, "WeatherKit", loaders, { API: { QWeather: { Token: "configured-account" } } }, runtime), undefined);
    assert.equal(calls, 1);
});

test("sequential requests cannot mutate shared defaults or inherit another credential", async () => {
    const [{ default: setENV }, { default: database }] = await Promise.all([import("../src/function/setENV.mjs"), import("../src/function/database.mjs")]);
    const token = database.WeatherKit.Settings.API.QWeather.Token,
        saved = globalThis.$argument;
    try {
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", API: { QWeather: { Token: "dedicated-fixture" } } };
        const a = setENV("iRingo", "WeatherKit", database);
        assert.equal(a.Settings.API.QWeather.Token, "dedicated-fixture");
        assert.equal(database.WeatherKit.Settings.API.QWeather.Token, token);
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF" };
        const b = setENV("iRingo", "WeatherKit", database);
        assert.equal(b.Settings.API.QWeather.Token, token);
        assert.notEqual(a.Settings.API, b.Settings.API);
    } finally {
        globalThis.$argument = saved;
    }
});

test("bounded fallback encoder matches Unicode replacement behavior without host TextEncoder", async () => {
    const countSource = (await readFile(new URL("../src/function/utf8Length.mjs", import.meta.url), "utf8")).replace("export default function", "function");
    const encoderSource = (await readFile(new URL("../src/function/ensureTextEncoder.mjs", import.meta.url), "utf8")).replace(/^import .+$/m, "");
    const context = vm.createContext({});
    vm.runInContext(`${countSource}\n${encoderSource}`, context);
    for (const value of ["", "ASCII", "天气雨雪🌦️", "a\ud800b\udc00c", "\ud83c\udf27\ud83c\udf08", "\u0000\u07ff\u0800\uffff"]) {
        const actual = vm.runInContext(`new TextEncoder().encode(${JSON.stringify(value)})`, context);
        assert.deepEqual(Array.from(actual), Array.from(new TextEncoder().encode(value)));
    }
    assert.throws(() => vm.runInContext('new TextEncoder().encode("x".repeat(2 * 1024 * 1024 + 1))', context), /encoding limit/);
    const nativeContext = vm.createContext({ TextEncoder });
    vm.runInContext(`${countSource}\n${encoderSource}`, nativeContext);
    assert.equal(nativeContext.TextEncoder, TextEncoder);
});

test("missing Apple daily and hourly roots can receive available provider forecasts", { timeout: 2000 }, async () => {
    const [{ Response }, { default: WeatherKit2 }, { ByteBuffer }] = await Promise.all([import("../src/process/Response.mjs"), import("../src/class/WeatherKit2.mjs"), import("flatbuffers")]);
    const savedArgument = globalThis.$argument,
        daily = QWeather.prototype.Daily,
        hourly = QWeather.prototype.Hourly;
    const metadata = { providerName: "QWeather", temporarilyUnavailable: false };
    try {
        globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: ["forecastDaily", "forecastHourly"], Weather: { Provider: "QWeather", Replace: ["CN"] }, Region: { Fallback: "Auto" } };
        QWeather.prototype.Daily = async () => ({ metadata, days: [{ forecastStart: 1792368000, temperatureMax: 29, precipitationAmountByType: [] }] });
        QWeather.prototype.Hourly = async () => ({ metadata, hours: [{ forecastStart: 1792368000, temperature: 25 }] });
        const raw = WeatherKit2.encode(undefined, {});
        const result = await Response({ url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?dataSets=forecastDaily,forecastHourly", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw });
        const decoded = WeatherKit2.decode(new ByteBuffer(result.body), ["forecastDaily", "forecastHourly"]);
        assert.equal(decoded.forecastDaily.days[0].temperatureMax, 29);
        assert.equal(decoded.forecastHourly.hours[0].temperature, 25);
    } finally {
        globalThis.$argument = savedArgument;
        QWeather.prototype.Daily = daily;
        QWeather.prototype.Hourly = hourly;
    }
});
