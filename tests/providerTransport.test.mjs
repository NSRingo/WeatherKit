// Stateless transport regressions: validation is retained, request policy is removed.
import assert from "node:assert/strict";
import test from "node:test";
import ProviderTransport, { PROVIDER_RESPONSE_LIMITS, readProviderJSON } from "../src/class/ProviderTransport.mjs";

const request = { url: "https://fixture.example/weather", headers: { Authorization: "fixture" } };
const valid = value => Number.isFinite(value?.temperature);
const response = (temperature = 18) => ({ status: 200, headers: { ETag: "fixture" }, body: JSON.stringify({ temperature, nested: { value: 1 } }) });
const errorCode = code => error => error.code === code;

test("identical sequential requests always fetch and never reuse response objects", async () => {
    const transport = new ProviderTransport();
    let calls = 0;
    const options = { fetcher: async () => response(++calls), validate: valid, includeJSON: true };
    const first = await transport.fetch(request, options);
    const second = await transport.fetch(request, options);
    assert.equal(calls, 2);
    assert.equal(readProviderJSON(first).temperature, 1);
    assert.equal(readProviderJSON(second).temperature, 2);
});

test("identical parallel requests remain independent and each waits for its own fetch", async () => {
    const transport = new ProviderTransport();
    const callbacks = [];
    const options = { fetcher: () => new Promise(resolve => callbacks.push(resolve)), validate: valid };
    const first = transport.fetch(request, options);
    const second = transport.fetch(request, options);
    assert.equal(callbacks.length, 2);
    let firstFinished = false;
    first.then(() => {
        firstFinished = true;
    });
    callbacks[1](response(22));
    assert.equal(JSON.parse((await second).body).temperature, 22);
    assert.equal(firstFinished, false);
    callbacks[0](response(18));
    assert.equal(JSON.parse((await first).body).temperature, 18);
});

test("a shared native response does not share mutable headers or parsed JSON between requests", async () => {
    const native = response();
    const transport = new ProviderTransport();
    const options = { fetcher: async () => native, validate: valid, includeJSON: true };
    const first = await transport.fetch(request, options);
    first.headers.ETag = "changed";
    readProviderJSON(first).nested.value = 9;
    const second = await transport.fetch(request, options);
    assert.equal(native.headers.ETag, "fixture");
    assert.equal(second.headers.ETag, "fixture");
    assert.equal(readProviderJSON(second).nested.value, 1);
});

for (const [status, code] of [
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [500, "http"],
    [304, "http"],
]) {
    test(`HTTP ${status} is rejected and repeated failures never create a cooldown`, async () => {
        const transport = new ProviderTransport();
        let calls = 0;
        const options = {
            fetcher: async () => {
                calls++;
                return { ...response(), status: calls < 4 ? status : 200 };
            },
            validate: valid,
        };
        for (let i = 0; i < 3; i++) await assert.rejects(transport.fetch(request, options), errorCode(code));
        assert.equal((await transport.fetch(request, options)).status, 200);
        assert.equal(calls, 4);
    });
}

for (const [failure, code] of [
    [new Error("timeout"), "timeout"],
    [new Error("network changed"), "network"],
]) {
    test(`${code} failures never suppress the next request`, async () => {
        const transport = new ProviderTransport();
        let calls = 0;
        const options = {
            fetcher: async () => {
                if (++calls < 4) throw failure;
                return response();
            },
            validate: valid,
        };
        for (let i = 0; i < 3; i++) await assert.rejects(transport.fetch(request, options), errorCode(code));
        await transport.fetch(request, options);
        assert.equal(calls, 4);
    });
}

for (const status of [undefined, "bad", 200.5, Infinity])
    test(`invalid HTTP status ${String(status)} cannot replace Apple data`, async () => {
        await assert.rejects(new ProviderTransport().fetch(request, { fetcher: async () => ({ ...response(), status }), validate: valid }), errorCode("invalid"));
    });

for (const body of ["", "null", "[]", "{broken", new Uint8Array([123, 125]), "x".repeat(PROVIDER_RESPONSE_LIMITS.responseCharacters + 1)])
    test(`invalid provider body (${typeof body}, ${body?.length}) is rejected`, async () => {
        await assert.rejects(new ProviderTransport().fetch(request, { fetcher: async () => ({ ...response(), body }), validate: valid }), errorCode("invalid"));
    });

test("a consumer validation exception is contained as an invalid provider response", async () => {
    await assert.rejects(
        new ProviderTransport().fetch(request, {
            fetcher: async () => response(),
            validate: () => {
                throw new Error("fixture");
            },
        }),
        errorCode("invalid"),
    );
});

test("native ok=false cannot turn an HTTP 200 body into a successful provider result", async () => {
    await assert.rejects(new ProviderTransport().fetch(request, { fetcher: async () => ({ ...response(), ok: false }), validate: valid }), errorCode("http"));
});

test("conditional 304 reuse is opt-in, never parses or validates an empty body", async () => {
    const options = {
        fetcher: async () => ({ status: 304, ok: false, headers: { ETag: "unchanged" }, body: null }),
        validate: () => {
            throw new Error("304 is not JSON");
        },
    };
    const transport = new ProviderTransport();
    await assert.rejects(transport.fetch(request, options), errorCode("http"));
    const notModified = await transport.fetch(request, { ...options, allowNotModified: true });
    assert.equal(notModified.status, 304);
    assert.equal(notModified.body, "");
    assert.equal(notModified.headers.ETag, "unchanged");
});

test("text responses retain explicit validation and size bounds", async () => {
    const transport = new ProviderTransport();
    const options = { fetcher: async () => ({ status: 200, body: "<html>fixture</html>" }), format: "text", validate: text => text.includes("fixture") };
    assert.equal((await transport.fetch(request, options)).body, "<html>fixture</html>");
    await assert.rejects(transport.fetch(request, { ...options, maximumResponseCharacters: 3 }), errorCode("invalid"));
});

test("every provider request must supply a fetch function and data validator", async () => {
    await assert.rejects(new ProviderTransport().fetch(request), TypeError);
    await assert.rejects(new ProviderTransport().fetch(request, { fetcher: async () => response() }), TypeError);
});
