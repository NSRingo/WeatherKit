// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
globalThis.$loon = "simulated native Loon";
const { default: fetchProvider } = await import("../src/function/fetchProvider.mjs");
for (const timeout of [250, 499, 500, 501, 999, 1499, 5000]) {
    test(`Loon provider timeout ${timeout} ms reaches the native API unchanged`, async () => {
        globalThis.$httpClient = {
            get(request, callback) {
                assert.equal(request.timeout, timeout);
                callback(null, { status: 200, headers: {} }, "{}");
            },
        };
        assert.equal((await fetchProvider({ url: "https://provider.example/weather", timeout })).status, 200);
    });
}

test("native provider POST bodies and copied headers keep their values and leave caller inputs intact", async () => {
    const input = { url: "https://provider.example/auth", body: "token=fixture", headers: { Host: "old-host", "Content-Length": "1", Authorization: "fixture-private" }, timeout: 800 };
    globalThis.$httpClient = {
        post(request, callback) {
            assert.equal(request.body, input.body);
            assert.equal(request.timeout, 800);
            assert.deepEqual(request.headers, { Authorization: "fixture-private" });
            callback(null, { status: 200, headers: { "Content-Type": "application/json" } }, "{}");
        },
    };
    assert.equal((await fetchProvider(input)).ok, true);
    assert.equal(input.headers.Host, "old-host");
    assert.equal(input.headers["Content-Length"], "1");
});

test("native conditional responses normalize an omitted 304 body without treating it as success JSON", async () => {
    globalThis.$httpClient = {
        get(_request, callback) {
            callback(null, { status: 304, headers: {} });
        },
    };
    const response = await fetchProvider("https://provider.example/grid");
    assert.equal(response.status, 304);
    assert.equal(response.ok, false);
    assert.equal(response.body, "");
});

test("native request failures reject and a repeated callback cannot replace the first result", async () => {
    globalThis.$httpClient = {
        get(_request, callback) {
            callback("native timeout");
            callback(null, { status: 200 }, "{}");
        },
    };
    await assert.rejects(fetchProvider("https://provider.example/weather"), value => value === "native timeout");
});
