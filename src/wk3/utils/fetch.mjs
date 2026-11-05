import { requestContext } from "./context.mjs";

export async function fetch(resource, options = {}) {
    if (typeof resource === "string") {
        resource = { url: resource, ...options };
    } else {
        resource = { ...options, ...resource };
    }
    if (!resource.method) {
        resource.method = "GET";
        if (resource.body || resource.bodyBytes) {
            resource.method = "POST";
        }
    }
    const { url, headers, method, body, bodyBytes, timeout } = resource;
    const fetchOptions = {
        method,
        headers: headers ? { ...headers } : {},
    };
    const methodUpper = (method || "GET").toUpperCase();
    if (methodUpper !== "GET" && methodUpper !== "HEAD") {
        if (bodyBytes) {
            fetchOptions.body = bodyBytes;
        } else if (body) {
            fetchOptions.body = body;
        }
    }
    // 移除不必要的 header
    delete fetchOptions.headers?.Host;
    delete fetchOptions.headers?.[":authority"];
    delete fetchOptions.headers?.["Content-Length"];
    delete fetchOptions.headers?.["content-length"];

    let timeoutId;
    if (timeout) {
        const controller = new AbortController();
        fetchOptions.signal = controller.signal;
        const ms = timeout > 500 ? timeout : timeout * 1000;
        timeoutId = setTimeout(() => controller.abort(), ms);
    }

    const isCF = typeof globalThis.caches !== "undefined" && typeof globalThis.caches.default !== "undefined";
    const isGet = methodUpper === "GET" || methodUpper === "HEAD";
    const isThirdPartyWeather = isGet && (url.includes("api.caiyunapp.com") || url.includes("qweather.com") || url.includes("qweather"));

    let cacheKey;
    let cache;

    const store = requestContext.getStore();
    const settings = store && typeof store === "object" && "Settings" in store ? store.Settings : undefined;
    const isEdgeCacheEnabled = settings?.EdgeCache === true;

    if (isCF && isThirdPartyWeather && isEdgeCacheEnabled) {
        try {
            cache = globalThis.caches.default;
            cacheKey = new Request(url, { method: "GET" });
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
                const responseHeaders = {};
                cachedResponse.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                const cachedContentType = cachedResponse.headers.get("content-type") || "";
                const isBinary = cachedContentType.includes("flatbuffer") || cachedContentType.includes("protobuf") || cachedContentType.includes("octet-stream");

                let cachedBody = "";
                let cachedBodyBytes = null;
                if (isBinary) {
                    cachedBodyBytes = await cachedResponse.arrayBuffer();
                } else {
                    cachedBody = await cachedResponse.text();
                }

                if (timeoutId) clearTimeout(timeoutId);
                return {
                    ok: cachedResponse.ok,
                    status: cachedResponse.status,
                    statusCode: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    body: cachedBody,
                    bodyBytes: cachedBodyBytes,
                    headers: { ...responseHeaders, "x-ir-cache": "HIT" },
                };
            }
        } catch (cacheErr) {
            console.error("Cache match error:", cacheErr);
        }
    }

    try {
        const response = await globalThis.fetch(url, fetchOptions);
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        const contentType = response.headers.get("content-type") || "";
        const isBinary = contentType.includes("flatbuffer") || contentType.includes("protobuf") || contentType.includes("octet-stream");

        let responseBody = "";
        let responseBodyBytes = null;

        if (isBinary) {
            responseBodyBytes = await response.arrayBuffer();
        } else {
            responseBody = await response.text();
        }

        const result = {
            ok: response.ok,
            status: response.status,
            statusCode: response.status,
            statusText: response.statusText,
            body: responseBody,
            bodyBytes: responseBodyBytes,
            headers: { ...responseHeaders, "x-ir-cache": "MISS" },
        };

        if (cache && cacheKey && response.ok) {
            try {
                const cacheBody = isBinary ? responseBodyBytes : responseBody;
                const cfResponse = new globalThis.Response(cacheBody, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: {
                        ...responseHeaders,
                        "Cache-Control": "public, max-age=180",
                    },
                });
                const cachePromise = cache.put(cacheKey, cfResponse).catch(putErr => console.error("Cache put error:", putErr));
                const ctx = store?.executionCtx;
                if (ctx && typeof ctx.waitUntil === "function") {
                    ctx.waitUntil(cachePromise);
                }
            } catch (putErr) {
                console.error("Cache put error:", putErr);
            }
        }

        return result;
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
