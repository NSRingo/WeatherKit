// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import verifyLoonRewrites from "./verify-loon-rewrites.mjs";

export default async function verifyLoonBundles(root) {
    const directory = path.join(root, "dist");
    const requestCode = await readFile(path.join(directory, "request.loon.bundle.js"), "utf8"),
        responseCode = await readFile(path.join(directory, "response.loon.bundle.js"), "utf8"),
        scaleCode = await readFile(path.join(directory, "scale.loon.bundle.js"), "utf8");
    const plugin = await readFile(path.join(directory, "iRingo.WeatherKit.lpx"), "utf8");
    const nativeRewrites = verifyLoonRewrites(plugin);
    const storage = new Map(),
        scenarios = [];
    async function run(code, request, response, http, argument = {}, expectedErrors = false) {
        let resolve,
            reject,
            doneCalls = 0,
            nativeRequests = 0,
            active = 0;
        const complete = new Promise((a, b) => {
            resolve = a;
            reject = b;
        });
        const timer = setTimeout(() => reject(new Error("Built Loon script did not complete")), 2000);
        const messages = [],
            errors = [];
        const context = vm.createContext({
            URL,
            URLSearchParams,
            TextDecoder,
            // Binary fixtures and scripts share the host typed-array realm in Loon.
            // Preserve that relationship when exercising opaque source slots in a VM.
            Uint8Array,
            $loon: "simulated Loon 3.5.1",
            $script: { startTime: new Date() },
            $argument: { Storage: "Argument", LogLevel: "OFF", ...argument },
            $request: request,
            $response: response,
            $persistentStore: {
                read: key => storage.get(key),
                write: (value, key) => {
                    storage.set(key, value);
                    return true;
                },
            },
            $httpClient: {
                get: (outgoing, callback) => {
                    nativeRequests++;
                    active++;
                    Promise.resolve()
                        .then(() =>
                            http(outgoing, (...args) => {
                                active--;
                                callback(...args);
                            }),
                        )
                        .catch(reject);
                },
            },
            console: { log: value => messages.push(String(value)), info() {}, warn() {}, error: value => errors.push(String(value)) },
            $done: value => {
                doneCalls++;
                assert.equal(active, 0, "$done must wait for every native callback");
                resolve(value);
            },
        });
        try {
            vm.runInContext(code, context, { timeout: 2000 });
            const output = await complete;
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(doneCalls, 1);
            assert.equal(context.process, undefined);
            assert.equal(context.require, undefined);
            if (code === responseCode) assert.equal(typeof context.TextEncoder, "function", "The response bundle supplies its bounded encoder when the host omits it");
            if (!expectedErrors) assert.equal(errors.length, 0, errors.join("\n"));
            return { output, nativeRequests, messages, errors };
        } finally {
            clearTimeout(timer);
        }
    }
    const noNetwork = () => {
        throw new Error("Unexpected native network request");
    };
    const scale = await run(scaleCode, { url: "https://weatherkit.apple.com/api/v1/airQualityScale/zh-Hans-CN/HK.AQHI.2604", method: "GET", headers: {} }, undefined, noNetwork);
    assert.equal(scale.output.response.status, 200);
    assert.ok(JSON.parse(scale.output.response.body));
    scenarios.push("custom scale uses a standalone bundle without storage or provider requests");
    const unknownScale = await run(scaleCode, { url: "https://weatherkit.apple.com/api/v1/airQualityScale/unknown-HK/HK.AQHI.2604?v=1", method: "GET", headers: { "If-None-Match": "fixture-etag" } }, undefined, noNetwork);
    assert.ok(unknownScale.output.url.endsWith("/HK.AQHI?v=1"));
    assert.equal(unknownScale.output.headers["If-None-Match"], "fixture-etag");
    scenarios.push("unknown scale language falls through with conditional headers intact");
    const availability = await run(responseCode, { url: "https://weatherkit.apple.com/api/v1/availability/en-US/31.2/121.5", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(["currentWeather", "weatherMaps"]) }, noNetwork);
    assert.ok(JSON.parse(availability.output.body).includes("weatherMaps"));
    assert.ok(JSON.parse(availability.output.body).includes("forecastNextHour"));
    scenarios.push("availability preserves Apple and appends plugin requirements");
    const plain = await run(responseCode, { url: "https://weatherkit.apple.com/api/v2/weather/en-US/31.2/121.5", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "text/plain" }, body: "original" }, noNetwork);
    assert.equal(plain.output.body, "original");
    scenarios.push("unhandled content passthrough");
    const v3Request = { url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans-CN/31.2/121.5?country=CN&dataSets=currentWeather", method: "GET", headers: {} };
    const v3Original = `  ${JSON.stringify({ currentWeather: { metadata: { latitude: 31.2, longitude: 121.5, sourceType: "MODELED", temporarilyUnavailable: false }, temperature: 18, conditionCode: "CLOUDY", futureField: [1, 2] }, unknownProduct: { retain: true } })}\n`;
    const v3Response = { status: 200, headers: { "Content-Type": "application/json", ETag: "fixture", "Content-Length": "1" }, body: v3Original };
    const v3Replaced = await run(responseCode, v3Request, v3Response, (_, callback) => {
        setImmediate(() => callback(null, { status: 200, headers: {} }, JSON.stringify({ code: "200", updateTime: "2026-11-04T00:00:00Z", now: { temp: "23", icon: "100", text: "晴", feelsLike: "24", cloud: "20", humidity: "50", precip: "0", pressure: "1000", dew: "10", vis: "10", wind360: "90", windSpeed: "2" } })));
    }, { DataSets: "currentWeather", "Weather.Provider": "QWeather" });
    const v3Body = JSON.parse(v3Replaced.output.body);
    assert.equal(v3Replaced.nativeRequests, 1);
    assert.equal(v3Body.currentWeather.temperature, 23);
    assert.equal(v3Body.currentWeather.conditionCode, "CLEAR");
    assert.equal(typeof v3Body.currentWeather.metadata.latitude, "number");
    assert.deepEqual(v3Body.currentWeather.futureField, [1, 2]);
    assert.deepEqual(v3Body.unknownProduct, { retain: true });
    assert.equal(v3Replaced.output.headers["Cache-Control"], "no-store");
    assert.equal(v3Replaced.output.headers.ETag, undefined);
    assert.equal(v3Response.body, v3Original);
    scenarios.push("v3 JSON replaces weather with WK3 types and preserves unknown fields after native callbacks finish");
    const nativeJSON = { currentWeather: { metadata: { temporarilyUnavailable: false }, temperature: 18, conditionCode: ["CLOUDY"] }, forecastDaily: { metadata: { temporarilyUnavailable: false }, days: [{ conditionCode: ["RAIN"], precipitationAmountByType: [{ expected: 3, minimum: 1, maximum: 4, precipitationType: ["RAIN"] }] }] }, forecastPeriodic: { metadata: {}, forecasts: [{ periods: [{ conditionCode: ["CLEAR"], snowfallAmount: { expected: 0, minimum: 0, maximum: 0 }, precipitationAmountByType: [] }] }] } };
    const nativeCompatible = await run(responseCode, v3Request, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(nativeJSON) }, noNetwork, { DataSets: "currentWeather", "Weather.Provider": "WeatherKit" });
    const nativeBody = JSON.parse(nativeCompatible.output.body);
    assert.equal(nativeBody.currentWeather.conditionCode, "CLOUDY");
    assert.equal(nativeBody.forecastDaily.days[0].precipitationAmount, 3);
    assert.equal(nativeBody.forecastPeriodic.forecasts[0].periods[0].conditionCode, "CLEAR");
    assert.equal(nativeBody.forecastPeriodic.forecasts[0].periods[0].snowfallAmount, 0);
    assert.equal(nativeCompatible.nativeRequests, 0);
    scenarios.push("Apple v3 JSON is adapted to the native Weather reader, including unselected periodic forecasts");
    const appleCO = { airQuality: { metadata: { temporarilyUnavailable: false, providerName: "QWeather" }, scale: "HJ6332012", index: 42, categoryIndex: 1, primaryPollutant: "PM2_5", previousDayComparison: "SIMILAR", pollutants: [["PM2_5", 35], ["PM10", 60], ["OZONE", 90], ["NO2", 35], ["SO2", 15], ["CO", 0.7]].map(([pollutantType, amount]) => ({ pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER" })) } };
    const appleCOResult = await run(responseCode, { ...v3Request, url: v3Request.url.replace("dataSets=currentWeather", "dataSets=airQuality") }, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(appleCO) }, noNetwork, { DataSets: "airQuality", "AirQuality.Calculate.Algorithm": "WAQI_InstantCast_US" });
    assert.equal(JSON.parse(appleCOResult.output.body).airQuality.pollutants.find(p => p.pollutantType === "CO").amount, 700);
    assert.equal(appleCOResult.nativeRequests, 0);
    scenarios.push("native Apple QWeather CO is repaired at ingress with no duplicate provider lookup");
    for (const algorithm of ["UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT", "CA_AQHI", "HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI", "None"]) {
        const pollutants = [["PM2_5", 35], ["PM10", 60], ["OZONE", 90], ["NO2", 35], ["SO2", 15], ["CO", 700]].map(([pollutantType, amount]) => ({ pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER" }));
        const body = { airQuality: { metadata: { temporarilyUnavailable: false, providerName: "Apple fixture" }, scale: "EPA_NowCast", index: 42, categoryIndex: 1, primaryPollutant: "PM2_5", previousDayComparison: "SIMILAR", pollutants } };
        const computed = await run(responseCode, { ...v3Request, url: v3Request.url.replace("dataSets=currentWeather", "dataSets=airQuality") }, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, noNetwork, { DataSets: "airQuality", "AirQuality.Calculate.Algorithm": algorithm });
        const actual = JSON.parse(computed.output.body).airQuality;
        assert.equal(computed.nativeRequests, 0);
        assert.equal(actual.pollutants.length, 6);
        assert.ok(Number.isInteger(actual.index) && actual.index >= 0);
        assert.ok(Number.isInteger(actual.categoryIndex) && actual.categoryIndex >= 1);
        if (algorithm === "None") assert.equal(actual.index, 42);
        else assert.match(actual.metadata.providerName, /iRingo/);
        scenarios.push(`v3 ${algorithm} retains all six measurements with no provider request`);
    }
    storage.clear();
    const v3Failed = await run(responseCode, v3Request, v3Response, (_, callback) => setImmediate(() => callback("timeout", {}, "")), { DataSets: "currentWeather", "Weather.Provider": "QWeather" }, true);
    assert.equal(v3Failed.output.body, v3Original);
    assert.equal(v3Failed.output.headers.ETag, "fixture");
    scenarios.push("v3 provider failure preserves exact Apple JSON, whitespace and validators");
    const v3Opaque = { ...v3Response, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, body: new Uint8Array([1, 2, 3, 4]) };
    const v3Kept = await run(responseCode, v3Request, v3Opaque, noNetwork);
    assert.strictEqual(v3Kept.output.body, v3Opaque.body);
    scenarios.push("WK3 binary stays opaque if JSON negotiation is not honoured");
    storage.clear();
    const alertRequest = { url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=en-US&ids=fixture-101190110", method: "GET", headers: { "User-Agent": "fixture-agent" } };
    const html = '<html><h1 class="c-submenu__location">Fixture</h1><div class="c-city-warning-events warning--orange"><h3>Fixture warning</h3><p>Issue date: 2026-10-19T00:00:00Z</p></div></html>';
    const first = await run(requestCode, alertRequest, undefined, (_, callback) => callback(null, { status: 200, headers: { "Content-Type": "text/html" } }, html), { "RequestCache.Diagnostics": true });
    assert.equal(first.nativeRequests, 1);
    assert.equal(first.output.response.status, 200);
    assert.ok(JSON.parse(first.output.response.body).length > 0);
    scenarios.push("web warning parsing without TextEncoder");
    const second = await run(requestCode, alertRequest, undefined, noNetwork, { "RequestCache.Diagnostics": true });
    assert.equal(second.nativeRequests, 0);
    assert.equal(second.output.response.body, first.output.response.body);
    scenarios.push("parsed warning cache survives a new Loon execution");
    storage.clear();
    const failed = await run(requestCode, alertRequest, undefined, (_, callback) => callback("timeout fixture-secret", {}, ""), { "RequestCache.Diagnostics": true }, true);
    assert.equal(failed.output.response, undefined);
    assert.equal(failed.output.url, alertRequest.url);
    const diagnostic = failed.messages.filter(message => message.startsWith("[WeatherKit]"));
    assert.equal(diagnostic.length, 1);
    assert.doesNotMatch(diagnostic[0], /fixture-secret|101190110|weatherkit\.apple\.com/);
    scenarios.push("failed warning request passes through with safe diagnostics");
    const { default: WeatherKit2 } = await import(new URL("../src/class/WeatherKit2.mjs", import.meta.url));
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
    const recovered = await run(
        responseCode,
        { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?dataSets=currentWeather,forecastHourly", method: "GET", headers: {} },
        { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw },
        (_, callback) => callback("timeout", {}, ""),
        { LogLevel: "ERROR", DataSets: "currentWeather,forecastHourly", "Weather.Provider": "QWeather", "Region.Fallback": "Auto", "RequestCache.Diagnostics": true },
        true,
    );
    assert.equal(recovered.nativeRequests, 2, `Region fix and both provider paths must run: ${[...recovered.errors, ...recovered.messages.filter(line => /Error|Failed|失败|Unreplaced|country:|FORMAT:/.test(line))].join("\n")}`);
    const { ByteBuffer } = await import("flatbuffers");
    const decoded = WeatherKit2.decode(new ByteBuffer(recovered.output.body), ["currentWeather"]);
    assert.equal(decoded.currentWeather.temperature, 27);
    const recoverySummary = JSON.parse(recovered.messages.find(line => line.startsWith("[WeatherKit]")).slice("[WeatherKit] ".length));
    assert.equal(recoverySummary.fallbacks, 2, "An undefined provider result must still count as a fallback");
    scenarios.push("binary weather response retains Apple values and completes after native failures");
    storage.clear();
    const empty = WeatherKit2.encode(undefined, {});
    const nativeMinute = WeatherKit2.encode(undefined, { forecastNextHour: { metadata: { providerName: "Apple", temporarilyUnavailable: false }, condition: [], summary: [], minutes: [] } });
    const keptMinute = await run(responseCode, { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?country=CN&dataSets=forecastNextHour", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: nativeMinute }, noNetwork, {
        DataSets: "forecastNextHour",
        "NextHour.Provider": "ColorfulClouds",
    });
    assert.deepEqual(Array.from(keptMinute.output.body), Array.from(nativeMinute));
    assert.equal(keptMinute.messages.length, 0, "LogLevel OFF suppresses startup, provider and completion logs");
    scenarios.push("existing Apple minute table is preserved without provider work or routine logs");
    const disabled = await run(responseCode, { url: "https://weatherkit.apple.com/api/v2/weather/en-US/31.2/121.5?country=CN&dataSets=currentWeather,forecastHourly", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw }, noNetwork, {
        DataSets: "currentWeather,forecastHourly",
        "Weather.Provider": "WeatherKit",
    });
    assert.deepEqual(Array.from(disabled.output.body), Array.from(raw));
    scenarios.push("Apple-only provider preserves original binary weather without a decoder round trip");
    const large = new Uint8Array(4 * 1024 * 1024 + 1);
    const bounded = await run(responseCode, { url: "https://weatherkit.apple.com/api/v2/weather/en-US/31.2/121.5?country=CN&dataSets=forecastHourly", method: "GET", headers: {} }, { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: large }, noNetwork);
    assert.strictEqual(bounded.output.body, large);
    scenarios.push("oversized binary input retains the original view without decoding or provider work");
    const hourlyRaw = WeatherKit2.encode(undefined, { forecastHourly: { metadata: { providerName: "Apple", temporarilyUnavailable: false }, hours: [0, 1].map(i => ({ forecastStart: 1792368000 + i * 3600, temperature: 20 + i, precipitationAmountByType: [] })) } });
    const replacedHourly = await run(
        responseCode,
        { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/31.2/121.5?country=CN&dataSets=forecastHourly", method: "GET", headers: {} },
        { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: hourlyRaw },
        (_, callback) =>
            callback(
                null,
                { status: 200, headers: {} },
                JSON.stringify({ code: "200", updateTime: "2026-10-19T00:00:00Z", hourly: [{ fxTime: new Date(1792368000000).toISOString(), temp: "30", text: "晴", cloud: "20", humidity: "50", precip: "0", pop: "10", pressure: "1000", dew: "10", wind360: "90", windSpeed: "2" }] }),
            ),
        { DataSets: "forecastHourly", "Weather.Provider": "QWeather" },
    );
    const hours = WeatherKit2.decode(new ByteBuffer(replacedHourly.output.body), ["forecastHourly"]).forecastHourly.hours;
    assert.equal(replacedHourly.nativeRequests, 1);
    assert.equal(hours[0].temperature, 30);
    assert.equal(hours[1].temperature, 21);
    assert.equal(WeatherKit2.decode(new ByteBuffer(hourlyRaw), ["forecastHourly"]).forecastHourly.hours[0].temperature, 20);
    scenarios.push("partial hourly replacement changes only a matching row and leaves source binary intact");
    const backup = await run(
        responseCode,
        { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?dataSets=forecastNextHour", method: "GET", headers: {} },
        { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: empty },
        (request, callback) => {
            if (request.url.includes("caiyunapp.com")) callback("timeout", {}, "");
            else {
                assert.equal(request.headers["X-QW-Api-Key"], "fixture-account");
                callback(null, { status: 200, headers: { "Content-Type": "application/json" } }, JSON.stringify({ code: "200", updateTime: "2026-10-19T08:00:00+08:00", summary: "Fixture rain", minutely: [{ fxTime: "2026-10-19T08:05:00+08:00", precip: "0.1" }] }));
            }
        },
        { LogLevel: "ERROR", DataSets: "forecastNextHour", "NextHour.Provider": "ColorfulClouds", "API.QWeather.Token": "fixture-account", "Region.Fallback": "Auto", "RequestCache.Diagnostics": true },
        true,
    );
    assert.equal(backup.nativeRequests, 2);
    const backedUp = WeatherKit2.decode(new ByteBuffer(backup.output.body), ["forecastNextHour"]);
    assert.ok(backedUp.forecastNextHour, [...backup.errors, ...backup.messages].join("\n"));
    assert.equal(backedUp.forecastNextHour.metadata.temporarilyUnavailable, false);
    scenarios.push("missing minute data uses one configured backup after primary failure");
    for (const [status, temperature, reason] of [
        [502, "99", "http"],
        [200, "not-a-number", "invalid"],
    ]) {
        storage.clear();
        const guarded = await run(
            responseCode,
            { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?dataSets=currentWeather", method: "GET", headers: {} },
            { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: raw },
            (_, callback) => callback(null, { status, headers: { "Content-Type": "application/json" } }, JSON.stringify({ code: "200", now: { temp: temperature } })),
            { DataSets: "currentWeather", "Weather.Provider": "QWeather", "Region.Fallback": "Auto", "RequestCache.Diagnostics": true },
            true,
        );
        assert.equal(guarded.nativeRequests, 1);
        assert.deepEqual(Array.from(guarded.output.body), Array.from(raw));
        const summary = JSON.parse(guarded.messages.find(line => line.startsWith("[WeatherKit]")).slice("[WeatherKit] ".length));
        assert.equal(summary.fallbacks, 1);
        assert.equal(summary.failureReasons[reason], 1);
        scenarios.push(`HTTP ${status} provider body with ${reason} failure cannot overwrite Apple weather`);
    }
    storage.clear();
    const mixedRaw = WeatherKit2.encode(undefined, {
        currentWeather: WeatherKit2.decode(new ByteBuffer(raw), ["currentWeather"]).currentWeather,
        weatherAlerts: { metadata: { providerName: "National Early Warning Center", temporarilyUnavailable: false }, detailsUrl: "https://weatherkit.apple.com/alertDetails/index.html?ids=32.390,119.499", alerts: [] },
    });
    const mixed = await run(
        responseCode,
        { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/32.390/119.499?dataSets=weatherAlerts,currentWeather", method: "GET", headers: {} },
        { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: mixedRaw },
        (_, callback) =>
            callback(
                null,
                { status: 200, headers: { "Content-Type": "application/json" } },
                JSON.stringify({
                    status: "ok",
                    location: [32.39, 119.499],
                    result: { server_time: 1792368000, alert: { status: "error" }, realtime: { status: "ok", temperature: 23, apparent_temperature: 24, cloudrate: 0.2, skycon: "CLEAR_DAY", humidity: 0.8, precipitation: { local: { intensity: 0 } }, pressure: 100000, visibility: 10, wind: { direction: 90, speed: 1 } } },
                }),
            ),
        { DataSets: "weatherAlerts,currentWeather", "Weather.Provider": "ColorfulClouds", "WeatherAlerts.Provider": "ColorfulClouds", "Region.Fallback": "Auto", "RequestCache.Diagnostics": true },
        true,
    );
    assert.equal(mixed.nativeRequests, 1);
    const mixedDecoded = WeatherKit2.decode(new ByteBuffer(mixed.output.body), ["currentWeather", "weatherAlerts"]);
    assert.equal(mixedDecoded.currentWeather.temperature, 23);
    assert.equal(mixedDecoded.weatherAlerts.metadata.providerName, "National Early Warning Center");
    const mixedSummary = JSON.parse(mixed.messages.find(line => line.startsWith("[WeatherKit]")).slice("[WeatherKit] ".length));
    assert.equal(mixedSummary.fallbacks, 1);
    scenarios.push("one shared Caiyun callback can replace healthy weather while preserving failed Apple alerts");
    storage.clear();
    const { futureHourlyFixture, futureHourlyText, readFutureHourly, weatherFixture, weatherNow } = await import("../tests/fixtures/processingMemoryFixture.mjs");
    const futureRaw = futureHourlyFixture();
    const partial = await run(
        responseCode,
        { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/32.39/119.499?country=CN&dataSets=currentWeather,forecastHourly", method: "GET", headers: {} },
        { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: futureRaw },
        (request, callback) => callback(null, { status: request.url.includes("/weather/now") ? 200 : 503, headers: {} }, request.url.includes("/weather/now") ? JSON.stringify(weatherNow) : "{}"),
        { DataSets: "currentWeather,forecastHourly", "Weather.Provider": "QWeather" },
        true,
    );
    assert.equal(partial.nativeRequests, 2);
    assert.equal(WeatherKit2.decode(new ByteBuffer(partial.output.body), ["currentWeather"]).currentWeather.temperature, 23);
    assert.equal(readFutureHourly(partial.output.body), futureHourlyText);
    scenarios.push("partial replacement preserves future fields inside an unchanged selected hourly table");
    storage.clear();
    const alertsRaw = weatherFixture(0, 48);
    const failedAlerts = await run(
        responseCode,
        { url: "https://weatherkit.apple.com/api/v2/weather/zh-Hans-CN/32.39/119.499?country=CN&dataSets=weatherAlerts", method: "GET", headers: {} },
        { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer" }, body: alertsRaw },
        (_, callback) => callback(null, { status: 503, headers: {} }, "{}"),
        { DataSets: "weatherAlerts", "WeatherAlerts.Provider": "ColorfulClouds" },
        true,
    );
    assert.equal(failedAlerts.nativeRequests, 1);
    assert.strictEqual(failedAlerts.output.body, alertsRaw);
    scenarios.push("failed alert replacement retains the complete original binary response");
    return { pass: scenarios.length, fail: 0, scenarios, nativeRewrites, withoutNodeWebCryptoHostTextEncoder: true, providedWebAPIs: ["URL", "URLSearchParams", "TextDecoder"], doneExactlyOnce: true, liveWeatherRequests: false, deviceVPNValidation: false };
}
