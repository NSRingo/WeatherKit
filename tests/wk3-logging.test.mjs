import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { buildEgern } from "../scripts/build-egern.mjs";
import { buildPlatform } from "../scripts/build-wk3-platform.mjs";

const source = await readFile(new URL("../src/wk3/utils/Console.mjs", import.meta.url), "utf8");
function capture(logOnly = false) {
    const logs = [];
    const console = Object.fromEntries((logOnly ? ["log"] : ["debug", "info", "warn", "error", "log"]).map(method => [method, (...args) => logs.push([method, ...args])]));
    return { logs, console };
}
function logger(logOnly = false) {
    const output = capture(logOnly);
    const context = vm.createContext({ console: output.console });
    vm.runInContext(`${source.replace(/export /g, "")}\nglobalThis.logger={Console,setLogEnv};`, context);
    return { ...output, ...context.logger };
}
const secret = "private-token-unique";
const payload = { Token: secret, nested: [{ apiKey: secret, Authorization: `Bearer ${secret}`, password: secret }], url: `https://example.invalid/?token=${secret}&key=${secret}&keep=yes`, summary: "provider summary intact" };

test("shared levels, defaults, SETTINGS precedence and console.log fallback", () => {
    const { Console, setLogEnv, logs } = logger(true);
    const methods = ["debug", "info", "warn", "error", "log", "exception"];
    for (const [LogLevel, count] of [["OFF", 0], ["ERROR", 3], ["WARN", 4], ["INFO", 5], ["DEBUG", 6], ["ALL", 6], ["invalid", 5]]) {
        logs.length = 0;
        setLogEnv({ LogLevel });
        for (const method of methods) Console[method](method);
        assert.equal(logs.length, count, LogLevel);
        assert.ok(logs.every(([method]) => method === "log"));
    }
    logs.length = 0;
    setLogEnv({ SETTINGS: '{"LogLevel":"OFF"}' }); Console.info("hidden");
    setLogEnv({ LogLevel: "INFO", SETTINGS: '{"LogLevel":"OFF"}' }); Console.info("visible");
    setLogEnv({ SETTINGS: "invalid json" }); Console.info("default");
    setLogEnv(); Console.info("default again");
    assert.equal(logs.length, 3);
});

test("formatter redacts objects, JSON strings, prefixed JSON, nested JSON and query keys without mutating inputs", () => {
    const { Console, logs } = logger();
    const before = JSON.stringify(payload);
    Console.info(payload, before, `body: ${before}`, { body: before });
    Console.info("[buildSettings] Settings:", JSON.stringify({ privateHost: "private-host-unique", ...payload }));
    const output = JSON.stringify(logs);
    assert.ok(!output.includes(secret), output);
    assert.ok(!output.includes("private-host-unique"), output);
    assert.match(output, /provider summary intact/);
    assert.match(output, /keep=yes/);
    assert.equal(JSON.stringify(payload), before);
});

const bundles = new Map();
async function files(platform) {
    if (!bundles.has(platform)) bundles.set(platform, platform === "egern" ? buildEgern({ minify: false }) : buildPlatform(platform, { minify: false }));
    return bundles.get(platform);
}
async function execute(platform, code, stage, { env = {}, body = "{}", logOnly = false, invalid = false } = {}) {
    const output = capture(logOnly);
    const url = invalid ? "invalid URL" : "https://weatherkit.apple.com/api/v2/airQualityScale/en/HJ6332012?token=private-token-unique&key=private-token-unique";
    const globals = { URL, Headers, Response, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, console: output.console };
    if (platform === "egern") {
        const context = vm.createContext(globals);
        const handler = vm.runInContext(code.replace("export default async function(ctx)", "(async function(ctx)") + ")", context);
        const ctx = { env, request: { url, headers: {} }, response: new Response(body, { headers: { "content-type": "application/json" } }), http: { async get() { return new Response(body, { headers: { "content-type": "application/json" } }); } }, respond: value => value };
        let result, error;
        try { result = await handler(ctx); } catch (caught) { error = caught; }
        return { ...output, result, error, handler, ctx };
    }
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    Object.assign(globals, {
        $environment: { LogLevel: "ALL" }, // Parsed script arguments must override host env.
        $argument: { LogLevel: "INFO", ...env },
        $request: { url, headers: {} },
        $response: { status: 200, headers: { "content-type": "application/json" }, body },
        $httpClient: platform === "quantumultx" ? undefined : { get(options, callback) { callback(null, { status: 200, headers: { "content-type": "application/json" } }, body); } },
        $task: { async fetch() { return { statusCode: 200, headers: { "content-type": "application/json" }, body }; } },
        $done(value) { finish(value); },
    });
    vm.runInNewContext(code, globals, { timeout: 30000 });
    const result = await Promise.race([completed, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("bundle did not finish")), 5000); timer.unref(); })]);
    return { ...output, result };
}

for (const platform of ["egern", "surge", "loon", "stash", "quantumultx"]) {
    test(`${platform}: generated request/response INFO progress, OFF silence, redaction and error fallback`, async () => {
        const bundle = await files(platform);
        for (const stage of ["request", "response"]) {
            const code = bundle[stage].code;
            const visible = await execute(platform, code, stage, { body: JSON.stringify(payload), env: { SETTINGS: JSON.stringify({ API: { QWeather: { Token: secret, Host: "private-host-unique" } } }) } });
            const text = JSON.stringify(visible.logs);
            assert.equal(visible.logs[0][1], `☑️ ${stage}`);
            assert.equal(visible.logs.at(-1)[1], `✅ ${stage}`);
            assert.ok(!text.includes(secret), text);
            assert.ok(!text.includes("private-host-unique"), text);
            assert.ok(visible.logs.every(([method, message, ...rest]) => method === "log" && typeof message === "string" && rest.length === 0), `${platform} must write one string per console.log call`);
            if (stage === "response") {
                assert.match(text, /provider summary intact/);
                assert.match(text, /parseWeatherKitURL/);
                assert.match(text, /airQualityScale Apple/);
            }
            const off = await execute(platform, code, stage, { env: { LogLevel: "OFF" }, invalid: true, logOnly: true });
            assert.deepEqual(off.logs, []);
            const failed = await execute(platform, code, stage, { env: { LogLevel: "ERROR" }, invalid: true, logOnly: true });
            assert.equal(failed.logs.length, 1);
            assert.equal(failed.logs[0][0], "log");
            assert.match(JSON.stringify(failed.logs), /Invalid URL/);
        }
    });
}

test("Egern INFO reaches console.log even when console.info exists", async () => {
    const bundle = await files("egern");
    for (const stage of ["request", "response"]) {
        const visible = await execute("egern", bundle[stage].code, stage);
        const logMessages = visible.logs.filter(([method]) => method === "log").map(([, message]) => message);
        assert.equal(logMessages[0], `☑️ ${stage}`);
        assert.equal(logMessages.at(-1), `✅ ${stage}`);
    }
});

test("Loon INFO reaches console.log even when console.info exists", async () => {
    const bundle = await files("loon");
    for (const stage of ["request", "response"]) {
        const visible = await execute("loon", bundle[stage].code, stage);
        const logMessages = visible.logs.filter(([method]) => method === "log").map(([, message]) => message);
        assert.equal(logMessages[0], `☑️ ${stage}`);
        assert.equal(logMessages.at(-1), `✅ ${stage}`);
        assert.ok(logMessages.every(message => typeof message === "string"));
    }
});

test("Egern overlapping invocations keep their own ctx log level", async () => {
    const bundle = await files("egern");
    const first = await execute("egern", bundle.request.code, "request");
    first.logs.length = 0;
    let release;
    const waiting = first.handler({ ...first.ctx, http: { get: () => new Promise(resolve => { release = resolve; }) } });
    await first.handler({ ...first.ctx, env: { LogLevel: "OFF" } });
    release(new Response("{}"));
    await waiting;
    assert.deepEqual(first.logs.map(row => row[1]), ["☑️ request", "✅ request"]);
});
