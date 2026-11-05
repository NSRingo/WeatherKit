// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import ProviderRequestCache, { REQUEST_CACHE_LIMITS, requestCacheTTL } from "../src/class/ProviderRequestCache.mjs";

const request = { url: "https://provider.example/weather/31.2/121.5?token=test-secret", headers: { "X-API-Key": "header-secret", Accept: "application/json" } };
const valid = body => body?.status === "ok";
const response = (body = { status: "ok", temperature: 23 }, headers = {}, status = 200) => ({ status, ok: status >= 200 && status < 300, headers, body: JSON.stringify(body) });

function storage(initial) {
    let value = initial;
    return {
        read: () => value,
        write: next => {
            value = next;
            return true;
        },
        value: () => value,
    };
}

function setup({ ttlSeconds = 60, store = storage(), fetcher = async () => response() } = {}) {
    let now = 100_000;
    let calls = 0;
    const cache = new ProviderRequestCache({ ttlSeconds, store, now: () => now });
    const options = {
        partition: ["provider", "zh-CN", "CN"],
        product: "weather",
        validate: valid,
        fetcher: async value => {
            calls++;
            return fetcher(value);
        },
    };
    return {
        cache,
        options,
        store,
        fetch: (value = request, overrides = {}) => cache.fetch(value, { ...options, ...overrides }),
        calls: () => calls,
        setTime: value => {
            now = value;
        },
    };
}

test("six simultaneous consumers issue one native request and receive separate response objects", async () => {
    let complete;
    const state = setup({
        fetcher: () =>
            new Promise(resolve => {
                complete = resolve;
            }),
    });
    const pending = Array.from({ length: 6 }, () => state.fetch());
    assert.equal(state.calls(), 1);
    complete(response(undefined, { Test: "unchanged" }));
    const results = await Promise.all(pending);
    assert.equal(state.cache.stats.coalesced, 5);
    results[0].headers.Test = "mutated";
    assert.equal(results[1].headers.Test, "unchanged");
    assert.equal(JSON.parse(results[5].body).temperature, 23);
});

test("a cache hit does not extend its lifetime and expiration refreshes once", async () => {
    const state = setup();
    await state.fetch();
    state.setTime(159_999);
    await state.fetch();
    assert.equal(state.calls(), 1);
    state.setTime(160_000);
    await Promise.all([state.fetch(), state.fetch(), state.fetch()]);
    assert.equal(state.calls(), 2);
});

test("a new execution can reuse Loon storage without plaintext credentials or request URLs", async () => {
    const first = setup();
    await first.fetch();
    const raw = first.store.value();
    for (const secret of ["test-secret", "header-secret", "provider.example", "Set-Cookie"]) assert.equal(raw.includes(secret), false);
    const next = setup({ store: first.store });
    await next.fetch();
    assert.equal(next.calls(), 0);
    assert.equal(next.cache.stats.persistentHits, 1);
});

test("six persisted products read one snapshot per execution and still recheck expiration", async () => {
    const store = storage();
    let reads = 0,
        now = 100000,
        calls = 0;
    const counted = {
        read: () => {
            reads++;
            return store.read();
        },
        write: store.write,
    };
    const options = {
        product: "weather",
        validate: valid,
        fetcher: async () => {
            calls++;
            return response();
        },
    };
    const requests = Array.from({ length: 6 }, (_, i) => ({ ...request, url: `${request.url}&item=${i}` }));
    const seed = new ProviderRequestCache({ store, now: () => now });
    for (const item of requests) await seed.fetch(item, options);
    const next = new ProviderRequestCache({ store: counted, now: () => now });
    for (const item of requests) await next.fetch(item, options);
    assert.equal(reads, 1);
    assert.equal(calls, 6);
    now += 60000;
    await next.fetch(requests[0], options);
    assert.equal(calls, 7);
    assert.equal(reads, 2, "A successful refresh rereads storage before merging its write");
});

test("a delayed execution merges another execution's newly persisted products", async () => {
    const store = storage();
    const first = setup({ store }),
        second = setup({ store });
    let complete;
    const delayed = first.fetch(request, {
        fetcher: () =>
            new Promise(resolve => {
                complete = resolve;
            }),
    });
    await second.fetch({ ...request, url: `${request.url}&other=1` });
    complete(response());
    await delayed;
    const next = setup({ store });
    await next.fetch(request);
    await next.fetch({ ...request, url: `${request.url}&other=1` });
    assert.equal(next.calls(), 0, "A cached read snapshot cannot overwrite a later independent write");
});

test("invalid persistent storage is parsed at most once until an actual write", async () => {
    let reads = 0;
    const cache = new ProviderRequestCache({
        store: {
            read: () => {
                reads++;
                return "not JSON";
            },
            write: () => false,
        },
    });
    for (let i = 0; i < 4; i++)
        await assert.rejects(
            cache.fetch(
                { ...request, url: `${request.url}&item=${i}` },
                {
                    product: "weather",
                    validate: valid,
                    fetcher: async () => {
                        throw new Error("offline");
                    },
                },
            ),
        );
    assert.equal(reads, 1);
});

test("location, credential, host, language, product, and transport policy stay isolated", async () => {
    const state = setup();
    await state.fetch();
    await state.fetch({ ...request, url: request.url.replace("31.2", "31.3") });
    await state.fetch({ ...request, url: request.url.replace("test-secret", "another-secret") });
    await state.fetch({ ...request, headers: { ...request.headers, "X-API-Key": "new-key" } });
    await state.fetch({ ...request, url: request.url.replace("provider.example", "other.example") });
    await state.fetch(request, { partition: ["provider", "en-US", "CN"] });
    await state.fetch(request, { product: "air-quality" });
    await state.fetch({ ...request, node: "another-policy" });
    assert.equal(state.calls(), 8);
});

test("header case and insertion order do not create duplicate requests", async () => {
    const state = setup();
    await state.fetch();
    await state.fetch({ headers: { accept: "application/json", "x-api-key": "header-secret" }, url: request.url });
    assert.equal(state.calls(), 1);
});

test("zero TTL preserves pending-request coalescing and disables completed-result reuse", async () => {
    const state = setup({ ttlSeconds: 0 });
    await Promise.all([state.fetch(), state.fetch()]);
    assert.equal(state.calls(), 1);
    await state.fetch();
    assert.equal(state.calls(), 2);
    assert.equal(state.store.value(), undefined);
});

test("lowering the configured TTL invalidates previously longer-lived entries", async () => {
    const state = setup({ ttlSeconds: 300 });
    await state.fetch();
    state.setTime(145_000);
    const cache = new ProviderRequestCache({ store: state.store, ttlSeconds: 30, now: () => 145_000 });
    await cache.fetch(request, state.options);
    assert.equal(state.calls(), 2);
});

test("minute products expire at 30 seconds even when general TTL is higher", async () => {
    const state = setup({ ttlSeconds: 300 });
    await state.fetch(request, { maximumTTLSeconds: 30 });
    state.setTime(130_000);
    await state.fetch(request, { maximumTTLSeconds: 30 });
    assert.equal(state.calls(), 2);
});

for (const [label, upstream] of [
    ["HTTP 429", response({ status: "ok" }, {}, 429)],
    ["HTTP 500", response({ status: "ok" }, {}, 500)],
    ["provider error", response({ status: "error" })],
    ["partial provider failure", response({ status: "partial" })],
    ["malformed JSON", { status: 200, body: "not JSON", headers: {} }],
]) {
    test(`${label} is never cached and the next request can recover`, async () => {
        let first = true;
        const state = setup({
            fetcher: async () => {
                if (first) {
                    first = false;
                    return upstream;
                }
                return response();
            },
        });
        await assert.rejects(state.fetch());
        assert.equal(state.store.value(), undefined);
        await state.fetch();
        await state.fetch();
        assert.equal(state.calls(), 2);
    });
}

test("a rejected shared request is removed so later calls retry normally", async () => {
    const state = setup({
        fetcher: async () => {
            throw new Error("native timeout");
        },
    });
    const failures = await Promise.allSettled([state.fetch(), state.fetch(), state.fetch()]);
    assert.equal(state.calls(), 1);
    assert.equal(
        failures.every(item => item.status === "rejected"),
        true,
    );
    await state.fetch(request, { fetcher: async () => response() });
    assert.equal(state.cache.stats.requests, 2);
});

for (const headers of [{ "Cache-Control": "no-store" }, { "cache-control": "private, no-cache" }, { Vary: "*" }, { "Cache-Control": "max-age=0" }]) {
    test(`upstream cache prohibition is respected: ${JSON.stringify(headers)}`, async () => {
        const state = setup({ fetcher: async () => response(undefined, headers) });
        await state.fetch();
        await state.fetch();
        assert.equal(state.calls(), 2);
        assert.equal(state.store.value(), undefined);
    });
}

test("max-age and Age shorten the lifetime", async () => {
    const state = setup({ fetcher: async () => response(undefined, { "Cache-Control": "max-age=20", Age: "15" }) });
    await state.fetch();
    state.setTime(104_999);
    await state.fetch();
    state.setTime(105_000);
    await state.fetch();
    assert.equal(state.calls(), 2);
});

for (const corrupt of ["{", "x".repeat(REQUEST_CACHE_LIMITS.storageCharacters + 1), JSON.stringify({ version: 99, entries: [] }), JSON.stringify({ version: 1, entries: [null, {}] })]) {
    test(`invalid persistent data is ignored (${corrupt.length} characters)`, async () => {
        const state = setup({ store: storage(corrupt) });
        await state.fetch();
        assert.equal(state.calls(), 1);
        assert.equal(JSON.parse(state.store.value()).version, 1);
    });
}

test("clock rollback invalidates cache timestamps", async () => {
    const state = setup();
    await state.fetch();
    state.setTime(99_000);
    await state.fetch();
    assert.equal(state.calls(), 2);
});

test("read and write failures do not prevent successful network responses", async () => {
    const state = setup({
        store: {
            read() {
                throw new Error("unavailable");
            },
            write() {
                throw new Error("full");
            },
        },
    });
    assert.equal(JSON.parse((await state.fetch()).body).status, "ok");
    await state.fetch();
    assert.equal(state.calls(), 1);
});

test("stored responses obey both entry count and serialized-size limits", async () => {
    const state = setup({ fetcher: async () => response({ status: "ok", content: "x".repeat(70_000) }) });
    for (let index = 0; index < 20; index++) await state.fetch({ ...request, url: `${request.url}&city=${index}` });
    const raw = state.store.value();
    assert.ok(raw.length <= REQUEST_CACHE_LIMITS.storageCharacters);
    assert.ok(JSON.parse(raw).entries.length <= REQUEST_CACHE_LIMITS.entries);
    assert.ok(JSON.parse(raw).entries.length > 0);
});

test("cache-size overflow leaves a normal response usable but does not retain it", async () => {
    const state = setup({ fetcher: async () => response({ status: "ok", content: "x".repeat(REQUEST_CACHE_LIMITS.bodyCharacters) }) });
    assert.ok((await state.fetch()).body.length > REQUEST_CACHE_LIMITS.bodyCharacters);
    await state.fetch();
    assert.equal(state.calls(), 2);
    assert.equal(state.store.value(), undefined);
});

test("binary and oversized provider responses are rejected without persisting them", async () => {
    for (const body of [new Uint8Array([1, 2]), "x".repeat(REQUEST_CACHE_LIMITS.responseCharacters + 1)]) {
        const state = setup({ fetcher: async () => ({ status: 200, body }) });
        await assert.rejects(state.fetch(), /Unsupported or oversized/);
        assert.equal(state.store.value(), undefined);
    }
});

test("distinct requests use at most three native slots and queued duplicates still coalesce", async () => {
    const completions = [];
    let active = 0;
    let peak = 0;
    const state = setup({
        fetcher: () =>
            new Promise(resolve => {
                active++;
                peak = Math.max(peak, active);
                completions.push(() => {
                    active--;
                    resolve(response());
                });
            }),
    });
    const pending = Array.from({ length: 10 }, (_, index) => state.fetch({ ...request, url: `${request.url}&city=${index}` }));
    pending.push(state.fetch({ ...request, url: `${request.url}&city=9` }));
    assert.equal(active, 3);
    for (let done = 0; done < 10; done++) {
        assert.ok(completions.length > 0);
        completions.shift()();
        await new Promise(resolve => setImmediate(resolve));
    }
    await Promise.all(pending);
    assert.equal(peak, 3);
    assert.equal(state.calls(), 10);
    assert.equal(state.cache.stats.coalesced, 1);
});

test("pending-queue overflow fails without starting an extra native request", async () => {
    const completions = [];
    const state = setup({ fetcher: () => new Promise(resolve => completions.push(() => resolve(response()))) });
    const pending = Array.from({ length: REQUEST_CACHE_LIMITS.pending }, (_, index) => state.fetch({ ...request, url: `${request.url}&city=${index}` }));
    await assert.rejects(state.fetch({ ...request, url: `${request.url}&city=overflow` }), /queue is full/);
    for (const _pending of pending) {
        completions.shift()();
        await new Promise(resolve => setImmediate(resolve));
    }
    await Promise.all(pending);
    assert.equal(state.calls(), REQUEST_CACHE_LIMITS.pending);
});

test("TTL input is bounded and invalid input falls back to 60 seconds", () => {
    for (const value of [undefined, null, false, {}, "invalid", -1, Number.POSITIVE_INFINITY, "", "   "]) assert.equal(requestCacheTTL(value), 60);
    assert.equal(requestCacheTTL(0), 0);
    assert.equal(requestCacheTTL("30"), 30);
    assert.equal(requestCacheTTL(1000), 300);
});

test("requests with a method or a body that is not a read-only GET bypass the cache", async () => {
    for (const extra of [{ method: "POST" }, { body: "payload" }, { bodyBytes: new Uint8Array([1]) }]) {
        const state = setup();
        await Promise.all([state.fetch({ ...request, ...extra }), state.fetch({ ...request, ...extra })]);
        assert.equal(state.calls(), 2);
        assert.equal(state.store.value(), undefined);
    }
});
