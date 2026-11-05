// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";

test("browser bundle works with Loon callbacks and storage, without Node, WebCrypto or TextEncoder", async () => {
    const bundle = await rollup({ input: new URL("./fixtures/cacheRuntimeEntry.mjs", import.meta.url).pathname, plugins: [nodeResolve({ browser: true })] });
    const { output } = await bundle.generate({ format: "iife", name: "CacheTestRuntime" });
    await bundle.close();
    const code = output[0].code;
    assert.doesNotMatch(code, /node:crypto|node:fs|require\s*\(/);
    const values = new Map();
    let calls = 0;
    const callbacks = [];
    const makeContext = () =>
        vm.createContext({
            $loon: "Mac simulated Loon 3.5.1",
            $persistentStore: {
                read: key => values.get(key),
                write: (value, key) => {
                    values.set(key, value);
                    return true;
                },
            },
            $httpClient: {
                get(request, callback) {
                    assert.equal(request.timeout, 5000);
                    calls++;
                    callbacks.push(() => callback(null, { status: 200, headers: {} }, JSON.stringify({ status: "ok", data: { city: { name: "Fixture", geo: [31.2, 121.5] }, aqi: "42", dominentpol: "pm25", time: { v: 1_790_000_000 }, idx: 123 } })));
                },
            },
            console: { log() {}, error() {}, warn() {} },
        });
    const context = makeContext();
    vm.runInContext(code, context);
    assert.equal(context.process, undefined);
    assert.equal(context.crypto, undefined);
    assert.equal(context.TextEncoder, undefined);
    const source = `const provider = new CacheTestRuntime.WAQI({latitude:31.2,longitude:121.5,country:"CN",language:"zh-CN",version:"v2"}, "fixture-token");
        globalThis.result = Promise.all(Array.from({length:6}, () => provider.AQI2()));`;
    vm.runInContext(source, context);
    assert.equal(calls, 1);
    const done = callbacks.shift();
    done();
    done(); // A duplicate native callback must not produce an extra cache write or completion.
    const results = await context.result;
    assert.equal(results.length, 6);
    assert.ok(results.every(product => product.index === 42));

    const next = makeContext();
    vm.runInContext(code, next);
    vm.runInContext(source, next);
    assert.ok((await next.result).every(product => product.index === 42));
    assert.equal(calls, 1);
    assert.equal([...values.values()].join("").includes("fixture-token"), false);
});
