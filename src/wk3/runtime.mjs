// Shared HTTP/header adapter for normalized platform contexts.
// Each bundled invocation owns its runtime; client APIs are supplied by the platform entry.
export function headerObject(headers = {}) {
    const result = {};
    const add = (name, value) => {
        if (value !== undefined && value !== null) result[String(name).toLowerCase()] = value;
    };
    if (typeof headers.forEach === "function") headers.forEach((value, name) => add(name, value));
    else if (typeof headers.entries === "function") for (const [name, value] of headers.entries()) add(name, value);
    else for (const [name, value] of Object.entries(headers)) if (typeof value !== "function") add(name, value);
    // Egern documents get/property access, but does not promise iteration.
    for (const name of ["content-type", "content-encoding", "etag", "user-agent", "x-schema-version"]) {
        add(name, typeof headers.get === "function" ? headers.get(name) : headers[name]);
    }
    return result;
}

export function responseHeaders(original = {}, updates = {}) {
    const removable = new Set(["content-length", "transfer-encoding", "content-encoding", "etag", "content-md5"]);
    if (typeof original.set === "function" && typeof original.delete === "function") {
        for (const [name, value] of Object.entries(updates)) {
            if (!removable.has(name.toLowerCase()) && value !== undefined) original.set(name, value);
        }
        for (const name of removable) original.delete(name);
        return original;
    }
    const headers = { ...headerObject(original), ...headerObject(updates) };
    for (const name of removable) delete headers[name];
    return headers;
}

export function createRuntime(ctx) {
    const configuredTimeout = Number(ctx.env?.HTTP_TIMEOUT_MS);
    const defaultTimeout = configuredTimeout > 0 ? configuredTimeout : 8000;
    async function send(resource, options = {}, legacy = false) {
        const request = typeof resource === "string" || resource instanceof URL
            ? { url: String(resource), ...options } : { ...options, ...resource };
        const method = (request.method || (request.body !== undefined || request.bodyBytes !== undefined ? "POST" : "GET")).toLowerCase();
        const headers = headerObject(request.headers);
        for (const name of ["host", ":authority", "content-length"]) delete headers[name];
        let timeout = Number(request.timeout) || defaultTimeout;
        if (legacy && request.timeout && timeout <= 500) timeout *= 1000;
        const nativeOptions = { headers, timeout, credentials: request.credentials ?? "omit" };
        for (const name of ["policy", "policyDescriptor", "redirect", "insecureTls"]) {
            if (request[name] !== undefined) nativeOptions[name] = request[name];
        }
        if (method !== "get" && method !== "head") {
            const body = request.bodyBytes ?? request.body;
            if (body !== undefined && body !== null) nativeOptions.body = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
        }
        if (typeof ctx.http?.[method] !== "function") throw new TypeError(`Unsupported HTTP method: ${method}`);
        return ctx.http[method](request.url, nativeOptions);
    }
    return {
        webFetch: (resource, options) => send(resource, options),
        async fetch(resource, options) {
            const response = await send(resource, options, true);
            const headers = headerObject(response.headers);
            const status = response.status;
            const binary = /flatbuffer|protobuf|octet-stream/i.test(headers["content-type"] ?? "");
            return {
                ok: status >= 200 && status < 300, status, statusCode: status,
                statusText: response.statusText ?? "", headers,
                body: binary ? "" : await response.text(),
                bodyBytes: binary ? await response.arrayBuffer() : undefined,
            };
        },
    };
}
