// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Per-request validation only. No response storage, merging, queue or retry policy.
export const PROVIDER_RESPONSE_LIMITS = Object.freeze({ responseCharacters: 1024 * 1024, maximumResponseCharacters: 2 * 1024 * 1024 });
export class ProviderRequestError extends Error {
    constructor(code) {
        super(`WeatherKit provider request: ${code}`);
        this.name = "ProviderRequestError";
        this.code = code;
    }
}
export function providerErrorCode(error) {
    if (error instanceof ProviderRequestError) return error.code;
    return /timeout|timed out|超时/i.test(String(error?.message ?? error ?? "")) ? "timeout" : "network";
}
const parsedJSON = Symbol("validated provider JSON");
export function readProviderJSON(response) {
    return response && Object.hasOwn(response, parsedJSON) ? response[parsedJSON] : JSON.parse(response?.body ?? "{}");
}

export default class ProviderTransport {
    async fetch(request, { fetcher, validate, format = "json", maximumResponseCharacters = PROVIDER_RESPONSE_LIMITS.responseCharacters, allowNotModified = false, includeJSON = false } = {}) {
        if (typeof fetcher !== "function" || typeof validate !== "function") throw new TypeError("Provider transport requires fetch and validation functions");
        let response;
        try {
            response = await fetcher(request);
        } catch (error) {
            throw new ProviderRequestError(providerErrorCode(error));
        }
        const status = Number(response?.statusCode ?? response?.status);
        if (!Number.isInteger(status)) throw new ProviderRequestError("invalid");
        const output = { ...response, headers: { ...response?.headers } };
        // Only the owner of an existing entity may opt into conditional reuse.
        if (status === 304 && allowNotModified) return { ...output, body: "" };
        if (response?.ok === false || status < 200 || status >= 300) throw new ProviderRequestError(status === 429 ? "rate_limit" : status === 401 || status === 403 ? "auth" : "http");
        const maximum = Number.isFinite(maximumResponseCharacters) ? Math.max(1, Math.min(PROVIDER_RESPONSE_LIMITS.maximumResponseCharacters, maximumResponseCharacters)) : PROVIDER_RESPONSE_LIMITS.responseCharacters;
        if (typeof response.body !== "string" || response.body.length > maximum) throw new ProviderRequestError("invalid");
        let value;
        try {
            value = format === "text" ? response.body : JSON.parse(response.body);
            if (validate(value) !== true) throw new Error("Invalid provider data");
        } catch {
            throw new ProviderRequestError("invalid");
        }
        if (includeJSON && format !== "text") Object.defineProperty(output, parsedJSON, { value });
        return output;
    }
}
