import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildPlatform } from "../scripts/build-wk3-platform.mjs";
import { runPlatform } from "../src/platform/wk3-adapter.mjs";
import { localParameters } from "../src/wk3/parameters.mjs";

const bundles = new Map();
async function bundle(platform) {
    if (!bundles.has(platform)) bundles.set(platform, buildPlatform(platform, { minify: false }));
    return bundles.get(platform);
}
async function execute(code, values) {
    const logs = [], requests = [];
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    const globals = {
        URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Response, Headers,
        console: Object.fromEntries(["debug", "info", "warn", "error", "log"].map(key => [key, (...args) => logs.push([key, ...args])])),
        $environment: { HTTP_TIMEOUT_MS: "9999", LogLevel: "ALL" },
        $request: { url: "https://weatherkit.apple.com/api/v2/airQualityScale/en/HJ6332012", headers: {} },
        $response: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
        $httpClient: { get(options, callback) {
            requests.push(options);
            callback(null, { status: 200, headers: { "content-type": "application/json" } }, "{}");
        } },
        $task: { async fetch(options) {
            requests.push(options);
            return { statusCode: 200, headers: { "content-type": "application/json" }, body: "{}" };
        } },
        $done(value) { finish(value); },
        ...values,
    };
    vm.runInNewContext(code, globals, { timeout: 30000 });
    const result = await completed;
    return { result, logs, requests, globals };
}

for (const platform of ["surge", "loon", "stash", "quantumultx"]) {
    test(`${platform}: generated bundle consumes argument timeout and OFF`, async () => {
        const files = await bundle(platform);
        const values = localParameters.map(parameter => parameter.key === "HTTP_TIMEOUT_MS" ? "1234" : parameter.key === "LogLevel" ? "OFF" : parameter.value);
        const argument = platform === "loon" ? JSON.stringify(values)
            : platform === "stash" ? { HTTP_TIMEOUT_MS: "1234", LogLevel: "OFF" }
            : platform === "quantumultx" ? '{"HTTP_TIMEOUT_MS":"1234","LogLevel":"OFF"}'
            : 'HTTP_TIMEOUT_MS="1234"&LogLevel="OFF"';
        const options = { $argument: argument, ...(platform === "quantumultx" ? { $httpClient: undefined } : {}) };
        const request = await execute(files.request.code, options);
        assert.equal(request.requests.length, 1);
        const response = await execute(files.response.code, {
            ...options,
            $request: { url: "https://weatherkit.apple.com/api/v2/availability/en", headers: {} },
        });
        assert.equal(response.logs.length, 0, JSON.stringify(response.logs));
        const visible = await execute(files.response.code, {
            ...options, $argument: { LogLevel: "INFO" },
            $request: { url: "https://weatherkit.apple.com/api/v2/availability/en", headers: {} },
        });
        assert.ok(visible.logs.length > 0, "INFO control must exercise the logger");
        assert.equal(request.requests[0].timeout, 1234);
        assert.equal(request.globals.fetch, undefined, "native fetch must not be patched");
        assert.equal(request.globals.$environment.HTTP_TIMEOUT_MS, "9999");
    });
}

for (const platform of ["surge", "loon", "stash"]) {
    test(`${platform}: generated binary response keeps bodyBytes over empty body`, async () => {
        const files = await bundle(platform);
        const bytes = new Uint8Array([0, 1, 127, 128, 255]);
        const result = await execute(files.response.code, {
            $argument: { DataSets: [], LogLevel: "OFF" },
            $request: { url: "https://weatherkit.apple.com/api/v3/weather/en/31/121?country=CN&dataSets=airQuality", headers: {} },
            $response: { status: 200, headers: { "content-type": "application/vnd.apple.flatbuffer" }, body: "", bodyBytes: bytes },
        });
        assert.deepEqual(Array.from(result.result.body, c => typeof c === "number" ? c : c.charCodeAt(0)), Array.from(bytes));
        assert.equal(result.logs.length, 0);
        assert.equal(result.requests.length, 0);
    });
}

for (const platform of ["surge", "loon", "stash"]) {
    for (const stage of ["request", "response"]) {
        test(`${platform}: ${stage} $done has documented shape and preserves bytes`, async () => {
            let returned;
            const bytes = new Uint8Array([0, 1, 127, 128, 255]);
            await runPlatform(async ctx => {
                if (stage === "response") assert.deepEqual(new Uint8Array(await ctx.response.arrayBuffer()), bytes);
                return { status: 201, headers: { "Content-Type": "application/octet-stream" }, body: bytes };
            }, stage, {
                $request: { url: "https://example.invalid", headers: {} },
                $response: { status: 200, headers: { "Content-Type": "application/octet-stream" }, body: "", bodyBytes: bytes },
                $done(value) { returned = value; },
            }, platform);
            const result = stage === "request" ? returned.response : returned;
            assert.equal(result.status, 201);
            assert.deepEqual(Array.from(result.body, c => typeof c === "number" ? c : c.charCodeAt(0)), Array.from(bytes));
        });
    }
}

test("Quantumult X binary response remains untouched", async () => {
    let called = false, returned = "pending";
    await runPlatform(async () => { called = true; }, "response", {
        $response: { headers: { "content-type": "application/octet-stream" }, bodyBytes: new Uint8Array([128, 255]) },
        $done(value) { returned = value; },
    }, "Quantumult X");
    assert.equal(called, false);
    assert.equal(returned, undefined);
});
