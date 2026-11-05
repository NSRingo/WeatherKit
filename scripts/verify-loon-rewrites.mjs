// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Checks the emitted expressions and jq program. This is not a Loon parser or device test.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

export function readLoonRules(plugin) {
    const lines = plugin.split("\n");
    const availability = lines.find(line => line.startsWith("response if ") && line.includes("response.json.jq("));
    const scale = lines.find(line => line.startsWith("request if ") && line.includes("url.replace("));
    const jsonTransport = lines.find(line => line.startsWith("request if ") && line.includes('request.header.set("Accept", "application/json")'));
    assert.ok(jsonTransport, "v3 must negotiate Apple's JSON representation without a request script");
    assert.ok(jsonTransport.startsWith('request if ${request.method} == "GET" && '));
    const transportGuard = jsonTransport.match(/\$\{url\} ~= \/((?:\\.|[^/])*)\/ then /);
    assert.ok(transportGuard);
    const transportRegex = new RegExp(transportGuard[1]);
    const userAgentGuard = /\$\{request\.header\['User-Agent'\]\} ~= \/((?:\\.|[^/])*)\//;
    const transportAgent = jsonTransport.match(userAgentGuard);
    assert.ok(transportAgent, "Background clients must retain Apple's original transport");
    const appAgentRegex = new RegExp(transportAgent[1]);
    assert.ok(availability && scale, "Both native Rewrite actions must be present");
    const jq = JSON.parse(availability.slice(availability.indexOf("response.json.jq(") + "response.json.jq(".length, -1));
    const expression = scale.match(/\$\{url\} ~= \/((?:\\.|[^/])*)\/([i]*) as scale then url\.replace\("\$\{scale\.1\}"\)$/);
    assert.ok(expression, "Use the documented named capture and a unique required URL guard");
    assert.ok(scale.startsWith(`request if (\${request.method} == "GET" || \${request.method} == "HEAD" || \${request.method} == "OPTIONS") && `));
    const regex = new RegExp(expression[1], expression[2]);
    const scripts = lines
        .filter(line => /^http-(request|response) /.test(line))
        .map(line => {
            const [stage, pattern] = line.split(" ");
            return { stage, regex: new RegExp(pattern), line };
        });
    const v3Script = lines.find(line => line.startsWith("response if ") && line.includes(" then script(") && line.includes("api.v3.weather.json.response"));
    assert.ok(v3Script);
    const v3Guard = v3Script.match(/\$\{url\} ~= \/((?:\\.|[^/])*)\//);
    const v3Agent = v3Script.match(userAgentGuard);
    const v3Format = v3Script.match(/\$\{response\.header\['Content-Type'\]\} ~= \/((?:\\.|[^/])*)\/i/);
    assert.ok(v3Guard && v3Agent && v3Format);
    assert.ok(v3Script.includes('${request.method} == "GET"') && v3Script.includes("${response.status} == 200"));
    const v3AgentRegex = new RegExp(v3Agent[1]), v3FormatRegex = new RegExp(v3Format[1], "i");
    scripts.push({ stage: "http-response", regex: new RegExp(v3Guard[1]), line: v3Script, accepts: ({ method = "GET", status = 200, contentType, userAgent } = {}) => method === "GET" && status === 200 && v3FormatRegex.test(contentType ?? "") && v3AgentRegex.test(userAgent ?? "") });
    const declared = lines.filter(line => /^[\w.]+ = (input|select|switch),/.test(line)).map(line => line.split(" = ")[0]);
    // Template declarations are generated later; actual imports must bind every parameter.
    if (declared.length) assert.deepEqual([...v3Script.matchAll(/\$\{([\w.]+)\}/g)].map(match => match[1]).filter(name => !["url", "request.method", "response.status"].includes(name)), declared);
    return {
        jq,
        scripts,
        negotiatesJSON(url, method = "GET", userAgent = "") { return method === "GET" && transportRegex.test(url) && appAgentRegex.test(userAgent); },
        normalizeScale(url, method = "GET") {
            return ["GET", "HEAD", "OPTIONS"].includes(method) ? url.replace(regex, (_match, prefix) => prefix) : url;
        },
        mergeAvailability(value) {
            return JSON.parse(execFileSync("jq", ["-c", jq], { input: JSON.stringify(value), encoding: "utf8", maxBuffer: 1024 * 1024 }));
        },
        matchingScripts(url, stage = "http-request", context) {
            return scripts.filter(script => script.stage === stage && script.regex.test(url) && (!script.accepts || script.accepts(context)));
        },
    };
}

export default function verifyLoonRewrites(plugin) {
    const rules = readLoonRules(plugin),
        scenarios = [];
    assert.equal(rules.scripts.length, 5);
    const v3URL = "https://weatherkit.apple.com/api/v3/weather/en-GB/53.38/-1.47?dataSets=airQuality";
    const appAgent = "WeatherKit_Weather_iOS_Version 27.3 (Build fixture)", context = { userAgent: appAgent, contentType: "application/json" };
    assert.ok(rules.negotiatesJSON(v3URL, "GET", appAgent));
    const macAgent = "WeatherKit_Weather_macOS_Version 27.3 (Build fixture)";
    assert.ok(rules.negotiatesJSON(v3URL, "GET", macAgent));
    assert.equal(rules.matchingScripts(v3URL, "http-response", { ...context, userAgent: macAgent }).length, 1);
    scenarios.push("iOS and macOS main Weather app fixtures select the same guarded v3 transport");
    for (const [url, method] of [[v3URL, "POST"], [v3URL.replace("https:", "http:"), "GET"], [v3URL.replace("weatherkit.apple.com", "example.com"), "GET"], [v3URL.replace("/v3/", "/v2/"), "GET"]]) assert.equal(rules.negotiatesJSON(url, method, appAgent), false);
    scenarios.push("native v3 JSON negotiation changes only HTTPS Apple weather GET requests");
    const [v3] = rules.matchingScripts(v3URL, "http-response", context);
    assert.ok(v3?.line.includes("requires_body=true"));
    assert.ok(v3.line.includes("${DataSets}") && v3.line.includes("${Region.Fallback}"));
    assert.doesNotMatch(v3.line, /binary_body_mode=true/);
    assert.equal(rules.matchingScripts(v3URL, "http-response", context).length, 1);
    assert.match(rules.matchingScripts(v3URL.replace("/v3/", "/v2/"), "http-response")[0].line, /binary-body-mode=1/);
    scenarios.push("v3 text and v2 binary weather select exactly one body script each");
    for (const userAgent of ["", "WeatherKit_destinationd_iOS_Version 27.3", "WeatherKit_nanoweatherd_watchOS_Version 27.3", "WeatherKit_WidgetExtension_iOS_Version 27.3"]) {
        assert.equal(rules.negotiatesJSON(v3URL, "GET", userAgent), false);
        assert.equal(rules.matchingScripts(v3URL, "http-response", { ...context, userAgent }).length, 0);
    }
    for (const contentType of [undefined, "application/vnd.apple.flatbuffer;messageType=WK3.Weather", "text/html"]) assert.equal(rules.matchingScripts(v3URL, "http-response", { ...context, contentType }).length, 0);
    assert.equal(rules.matchingScripts(v3URL, "http-response", { ...context, status: 503 }).length, 0);
    scenarios.push("background, watch, non-JSON and failed v3 responses start no body script");
    const base = "https://weatherkit.apple.com/api/v1/airQualityScale/zh-Hans-CN/";
    for (const [suffix, expected] of [
        ["EU.EAQI.2604", "EU.EAQI"],
        ["US.AQI.12?lang=en-US&v=1#s", "US.AQI?lang=en-US&v=1#s"],
        ["HK.AQHI.8", "HK.AQHI"],
        ["CN.AQHI.8", "CN.AQHI"],
        ["EU.EAQI", "EU.EAQI"],
        ["EU.EAQI.preview", "EU.EAQI.preview"],
    ]) {
        assert.equal(rules.normalizeScale(base + suffix), base + expected);
        scenarios.push(`native scale URL: ${suffix}`);
    }
    assert.equal(rules.normalizeScale(`${base}EU.EAQI.12`, "POST"), `${base}EU.EAQI.12`);
    assert.equal(rules.normalizeScale(`${base.replace("weatherkit.apple.com", "example.com")}EU.EAQI.12`), `${base.replace("weatherkit.apple.com", "example.com")}EU.EAQI.12`);
    scenarios.push("URL normalization preserves POST and unrelated hosts");
    for (const suffix of ["EU.EAQI.2604", "US.AQI.12", "HK.AQHI.8", "CN.AQHI.8"]) {
        const url = rules.normalizeScale(base + suffix);
        assert.equal(rules.matchingScripts(url).length, /^(HK|CN)/.test(suffix) ? 1 : 0);
    }
    assert.equal(rules.matchingScripts("https://weatherkit.apple.com/api/v1/availability/en-US/31.2/121.5", "http-response").length, 0);
    scenarios.push("availability and ordinary scales start no JavaScript; custom scales use the small entry");
    for (const prefix of ["", "lang=zh-CN&"]) {
        for (const ids of ["fixture-101190110", "31.2,121.5", "-31.2,-121.5"]) assert.equal(rules.matchingScripts(`https://weatherkit.apple.com/api/v1/weatherAlerts?${prefix}ids=${ids}`).length, 1);
    }
    scenarios.push("alert routes accept first or subsequent ids parameters");
    const merged = rules.mergeAvailability(["currentWeather", "weatherMaps", "currentWeather"]);
    assert.deepEqual(merged.slice(0, 2), ["currentWeather", "weatherMaps"]);
    assert.equal(new Set(merged).size, merged.length);
    assert.ok(merged.includes("forecastNextHour") && merged.includes("weatherAlerts"));
    scenarios.push("native jq keeps Apple ordering and unknown capabilities without duplicates");
    for (const value of [{ error: "fixture" }, ["currentWeather", { future: true }], null, 7]) assert.deepEqual(rules.mergeAvailability(value), value);
    assert.ok(rules.mergeAvailability([]).includes("airQuality"));
    scenarios.push("native jq preserves unknown shapes and handles an empty capability list");
    return { pass: scenarios.length, fail: 0, scenarios, validation: "emitted expressions, JavaScript regex fixtures and system jq; not a Loon parser", deviceValidation: false };
}
