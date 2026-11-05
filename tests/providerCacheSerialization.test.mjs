// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import ProviderRequestCache, { REQUEST_CACHE_LIMITS } from "../src/class/ProviderRequestCache.mjs";
import serializeProviderCache from "../src/function/serializeProviderCache.mjs";

const record = (body, index = 0) => ({ key: String(index).padStart(64, "a"), storedAt: 100000 + index, lastUsedAt: 100000 + index, expiresAt: 160000 + index, status: 200, body, group: "b".repeat(64) });
function legacy(entries, maximum) {
    let text = JSON.stringify({ version: 1, entries });
    while (entries.length && text.length > maximum) {
        entries.pop();
        text = JSON.stringify({ version: 1, entries });
    }
    return text;
}

test("every UTF-16 code unit fits exactly at the same JSON boundary as serialize-and-pop", () => {
    for (let code = 0; code <= 0xffff; code++) {
        const entries = [record(String.fromCharCode(code))],
            length = JSON.stringify({ version: 1, entries }).length;
        for (const maximum of [length - 1, length, length + 1]) assert.equal(serializeProviderCache([...entries], maximum), legacy([...entries], maximum), `code unit ${code}, budget ${maximum}`);
    }
});

test("mixed control characters, quotes and paired or lone surrogates preserve the exact retained prefix", () => {
    let seed = 17;
    const next = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed;
    };
    const units = ['"', "\\", "\n", "\b", "\t", "\r", "\f", "\0", "\u001f", "中", "😀", "\ud800", "\udc00", "\ud800\ud800\udc00", "\udc00\ud800", "a", "\u2028"];
    for (let sample = 0; sample < 300; sample++) {
        const entries = Array.from({ length: 8 }, (_, index) => record(Array.from({ length: next() % 120 }, () => units[next() % units.length]).join(""), index));
        const cutoff = next() % 9,
            boundary = JSON.stringify({ version: 1, entries: entries.slice(0, cutoff) }).length;
        for (const maximum of [Math.max(25, boundary - 1), boundary, boundary + 1, REQUEST_CACHE_LIMITS.storageCharacters]) {
            const selected = [...entries],
                expected = [...entries];
            assert.equal(serializeProviderCache(selected, maximum), legacy(expected, maximum));
            assert.deepEqual(selected, expected);
        }
    }
});

test("a large highest-priority entry cannot be skipped in favour of smaller later entries", () => {
    const entries = [record("\0".repeat(90000)), record("small", 1)];
    assert.equal(serializeProviderCache(entries, REQUEST_CACHE_LIMITS.storageCharacters), '{"version":1,"entries":[]}');
    assert.equal(entries.length, 0);
});

test("oversized cache candidates produce one bounded snapshot while keeping all in-memory responses usable", async () => {
    let raw,
        requests = 0,
        snapshots = 0,
        largestSnapshot = 0;
    const stringify = JSON.stringify,
        store = {
            read: () => raw,
            write: value => {
                raw = value;
                return true;
            },
        },
        cache = new ProviderRequestCache({ store, now: () => 100000 });
    const body = "x".repeat(90000);
    JSON.stringify = (value, ...rest) => {
        const result = stringify(value, ...rest);
        if (value?.version === 1 && Array.isArray(value.entries)) {
            snapshots++;
            largestSnapshot = Math.max(largestSnapshot, result.length);
        }
        return result;
    };
    try {
        const options = {
            format: "text",
            validate: value => value === body,
            fetcher: async () => {
                requests++;
                return { status: 200, headers: {}, body };
            },
        };
        for (let index = 0; index < 8; index++) await cache.fetch({ url: `https://memory.invalid/${index}` }, options);
        assert.equal(snapshots, 8, "Each write serializes the final snapshot once");
        assert.ok(largestSnapshot <= REQUEST_CACHE_LIMITS.storageCharacters);
        assert.equal(JSON.parse(raw).entries.length, 2);
        for (let index = 0; index < 8; index++) assert.equal((await cache.fetch({ url: `https://memory.invalid/${index}` }, options)).body, body);
        assert.equal(requests, 8, "Memory capacity and hit behaviour are preserved");
    } finally {
        JSON.stringify = stringify;
    }
});

test("highly escaped text keeps the response and memory hit even when no disk entry fits", async () => {
    let stored,
        requests = 0;
    const body = "\0".repeat(90000),
        cache = new ProviderRequestCache({
            store: {
                read: () => stored,
                write: value => {
                    stored = value;
                    return true;
                },
            },
        }),
        options = {
            format: "text",
            validate: value => value === body,
            fetcher: async () => {
                requests++;
                return { status: 200, headers: {}, body };
            },
        };
    for (let count = 0; count < 2; count++) assert.equal((await cache.fetch({ url: "https://memory.invalid/escaped" }, options)).body, body);
    assert.equal(requests, 1);
    assert.equal(stored, '{"version":1,"entries":[]}');
});
