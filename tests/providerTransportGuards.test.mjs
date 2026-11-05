// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import Cache from "../src/class/ProviderRequestCache.mjs";
const request = { url: "https://provider.example/realtime", headers: { Authorization: "fixture-private" } };
const successful = (body = { status: "ok", temperature: 23 }) => ({ status: 200, ok: true, headers: {}, body: JSON.stringify(body) });
const storage = () => {
    let value;
    return {
        read: () => value,
        write: next => {
            value = next;
            return true;
        },
        value: () => value,
    };
};
const valid = body => body.status === "ok";

for (const [status, code] of [
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [500, "http"],
    [302, "http"],
    [undefined, "invalid"],
]) {
    test(`HTTP ${status} cannot deliver a success-looking body to weather adapters`, async () => {
        const cache = new Cache({ store: storage(), failureStore: storage() });
        await assert.rejects(cache.fetch(request, { validate: valid, fetcher: async () => ({ ...successful(), status, ok: false }) }), error => error.code === code);
        assert.equal(cache.stats.failures, 1);
    });
}

test("coalesced failed HTTP responses count once and never reach any of six consumers", async () => {
    let calls = 0;
    const cache = new Cache({ store: storage(), failureStore: storage() });
    const pending = Array.from({ length: 6 }, () =>
        cache.fetch(request, {
            validate: valid,
            fetcher: async () => {
                calls++;
                return { ...successful(), status: 500 };
            },
        }),
    );
    const result = await Promise.allSettled(pending);
    assert.equal(calls, 1);
    assert.ok(result.every(item => item.status === "rejected" && item.reason.code === "http"));
    assert.equal(cache.stats.failures, 1);
});

for (const order of ["alerts-first", "current-first"]) {
    test(`coalesced callers validate their own product independently (${order})`, async () => {
        const body = { status: "ok", current: { temperature: 23 }, alerts: { status: "error" } };
        const cache = new Cache({ store: storage(), failureStore: storage() });
        let calls = 0;
        const fetcher = async () => {
            calls++;
            return successful(body);
        };
        const current = () => cache.fetch(request, { product: "realtime", kind: "current", validate: value => value.current?.temperature === 23, fetcher });
        const alerts = () => cache.fetch(request, { product: "realtime", kind: "alerts", validate: value => value.alerts?.status === "ok", fetcher });
        const results = await Promise.allSettled(order === "alerts-first" ? [alerts(), current()] : [current(), alerts()]);
        const [alertResult, currentResult] = order === "alerts-first" ? results : results.toReversed();
        assert.equal(alertResult.status, "rejected");
        assert.equal(alertResult.reason.code, "invalid");
        assert.equal(currentResult.status, "fulfilled");
        assert.equal(JSON.parse(currentResult.value.body).current.temperature, 23);
        assert.equal(calls, 1);
        assert.equal(cache.stats.failures, 1);
    });
}

test("uncached credentials participate in cooldown without persisting or sharing token responses", async () => {
    const failures = storage(),
        responses = storage();
    let calls = 0;
    const make = () => new Cache({ store: responses, failureStore: failures, cooldownSeconds: 30 });
    const auth = { ...request, body: "token=account-one-private&id=123" };
    const options = {
        cacheable: false,
        validate: valid,
        fetcher: async () => {
            calls++;
            return { ...successful(), status: 401 };
        },
    };
    await assert.rejects(make().fetch(auth, options), error => error.code === "auth");
    await assert.rejects(make().fetch(auth, options), error => error.code === "cooldown");
    assert.equal(calls, 1);
    await make().fetch(
        { ...auth, body: "token=account-two-private&id=123" },
        {
            ...options,
            fetcher: async () => {
                calls++;
                return successful();
            },
        },
    );
    assert.equal(calls, 2);
    assert.equal(responses.value(), undefined);
    assert.doesNotMatch(failures.value(), /account-one-private|account-two-private|fixture-private|provider\.example/);
});

test("each coalesced consumer enforces its own response-size boundary", async () => {
    let calls = 0;
    const cache = new Cache({ store: storage(), failureStore: storage() });
    const fetcher = async () => {
        calls++;
        return successful({ status: "ok", text: "x".repeat(2048) });
    };
    const result = await Promise.allSettled([cache.fetch(request, { validate: valid, fetcher, maximumResponseCharacters: 1024 }), cache.fetch(request, { validate: valid, fetcher, maximumResponseCharacters: 4096 })]);
    assert.equal(calls, 1);
    assert.equal(result[0].status, "rejected");
    assert.equal(result[0].reason.code, "invalid");
    assert.equal(result[1].status, "fulfilled");
});

test("semantic failure cooldown for alerts does not suppress healthy current weather", async () => {
    const failures = storage();
    const cache = new Cache({ ttlSeconds: 0, store: storage(), failureStore: failures, cooldownSeconds: 30 });
    let calls = 0;
    const fetcher = async () => {
        calls++;
        return successful({ current: true, alerts: false });
    };
    for (let i = 0; i < 2; i++) await assert.rejects(cache.fetch(request, { product: "realtime", kind: "alerts", validate: value => value.alerts, fetcher }), error => error.code === "invalid");
    await assert.rejects(cache.fetch(request, { product: "realtime", kind: "alerts", validate: value => value.alerts, fetcher }), error => error.code === "cooldown");
    await cache.fetch(request, { product: "realtime", kind: "current", validate: value => value.current, fetcher });
    assert.equal(calls, 3);
});

test("a conditional 304 can reuse its existing grid without being treated as provider failure", async () => {
    const cache = new Cache({ store: storage(), failureStore: storage(), cooldownSeconds: 30 });
    const result = await cache.fetch(request, { cacheable: false, allowNotModified: true, format: "text", validate: () => true, fetcher: async () => ({ status: 304, ok: false, headers: {}, body: "" }) });
    assert.equal(result.status, 304);
    assert.equal(cache.stats.failures, 0);
    assert.equal(cache.stats.stores, 0);
    await assert.rejects(cache.fetch(request, { cacheable: false, format: "text", validate: () => true, fetcher: async () => ({ status: 304, ok: false, headers: {}, body: "" }) }), error => error.code === "http");
});
