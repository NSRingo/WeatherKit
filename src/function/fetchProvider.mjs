// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import { fetch as sharedFetch } from "@nsnanocat/util";
import { hasNativeProviderRuntime, isSurgeRuntime } from "./nativeProviderRuntime.mjs";

// Internal budgets are milliseconds. Loon uses milliseconds and Surge seconds;
// convert only at this native boundary, without the shared utility's rounding.
export default function fetchProvider(request, options = {}) {
    if (!hasNativeProviderRuntime()) return sharedFetch(request, options);
    const input = typeof request === "string" ? { ...options, url: request } : { ...options, ...request };
    const method = String(input.method ?? (input.body !== undefined || input.bodyBytes !== undefined ? "POST" : "GET")).toLowerCase();
    const timeout = Number(input.timeout);
    const milliseconds = Number.isFinite(timeout) && timeout > 0 ? Math.max(1, Math.min(5000, Math.floor(timeout))) : 5000;
    const surge = isSurgeRuntime() && typeof globalThis.$loon !== "string";
    const outgoing = { url: input.url, timeout: surge ? milliseconds / 1000 : milliseconds };
    if (input.headers) {
        outgoing.headers = { ...input.headers };
        for (const key of Object.keys(outgoing.headers)) if (["host", ":authority", "content-length"].includes(key.toLowerCase())) delete outgoing.headers[key];
    }
    const fields = surge ? ["body", "policy", "binary-mode", "auto-redirect", "auto-cookie", "insecure"] : ["body", "body-base64", "node", "binary-mode", "auto-redirect", "auto-cookie", "insecure", "alpn"];
    for (const key of fields) if (input[key] !== undefined) outgoing[key] = input[key];
    if (outgoing.body === undefined && input.bodyBytes !== undefined) outgoing.body = input.bodyBytes instanceof ArrayBuffer ? new Uint8Array(input.bodyBytes) : input.bodyBytes;
    return new Promise((resolve, reject) => {
        if (!["get", "post", "head", "delete", "put", "options", "patch"].includes(method) || typeof $httpClient?.[method] !== "function") {
            reject(new TypeError("Unsupported provider HTTP method"));
            return;
        }
        $httpClient[method](outgoing, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }
            const status = Number(response?.status);
            resolve({ ...response, status, statusCode: status, ok: status >= 200 && status < 300, headers: { ...response?.headers }, body: status === 304 ? "" : (body ?? "") });
        });
    });
}
