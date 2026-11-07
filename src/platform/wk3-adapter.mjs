import { localParameters } from "../wk3/parameters.mjs";

export async function runPlatform(handler, stage, globals = globalThis, platformOverride) {
    const platform = platformOverride ?? (typeof globals.$platform === "string" ? globals.$platform : "generic");
    const request = globals.$request ?? {};
    const sourceResponse = globals.$response ?? {};
    const headers = value => {
        const result = {};
        if (value && typeof value.forEach === "function") value.forEach((v, k) => { result[k] = v; });
        else for (const [key, v] of Object.entries(value ?? {})) if (typeof v !== "function") result[key] = v;
        return result;
    };
    const bytesFromBinaryString = value => Uint8Array.from(value, char => char.charCodeAt(0) & 255);
    const binaryStringFromBytes = value => {
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        let out = "";
        for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return out;
    };
    const statusOf = response => {
        const raw = response.status ?? response.statusCode ?? 200;
        if (typeof raw === "number") return raw;
        const match = String(raw).match(/\b(\d{3})\b/);
        return match ? Number(match[1]) : 200;
    };
    const argument = globals.$argument;
    let argumentValues = {};
    const parameterKeys = localParameters.map(parameter => parameter.key);
    const assignArgument = value => {
        if (Array.isArray(value)) {
            const booleanKeys = new Set(localParameters.filter(parameter => parameter.boolean).map(parameter => parameter.key));
            for (let i = 0; i < Math.min(value.length, parameterKeys.length); i++) if (value[i] !== undefined) argumentValues[parameterKeys[i]] = booleanKeys.has(parameterKeys[i]) ? value[i] === true || value[i] === "true" : value[i];
        } else if (value && typeof value === "object") Object.assign(argumentValues, value);
    };
    if (argument && typeof argument === "object") assignArgument(argument);
    else if (typeof argument === "string") {
        try { assignArgument(JSON.parse(argument)); } catch {
            const query = argument.match(/(?:^|&)\s*([^=&]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^&]*))/g);
            if (query?.length) {
                for (const field of query) {
                    const match = field.replace(/^&/, "").match(/^([^=]+)=(?:\"([^\"]*)\"|'([^']*)'|([^&]*))$/);
                    if (match) {
                        const key = decodeURIComponent(match[1]).trim();
                        const raw = match[2] ?? match[3] ?? match[4] ?? "";
                        argumentValues[key] = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1).split(",").map(v => v.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean) : raw === "true" ? true : raw === "false" ? false : decodeURIComponent(raw);
                    }
                }
            } else {
            const pairs = [];
            let start = 0, depth = 0, quote = "";
            for (let i = 0; i <= argument.length; i++) {
                const char = argument[i];
                if (quote) { if (char === quote && argument[i - 1] !== "\\\\") quote = ""; }
                else if (char === "\"" || char === "'") quote = char;
                else if (char === "[" || char === "{") depth++;
                else if (char === "]" || char === "}") depth--;
                else if ((char === "," || i === argument.length) && depth === 0) { pairs.push(argument.slice(start, i)); start = i + 1; }
            }
            for (const pair of pairs) {
                const index = pair.indexOf(":");
                if (index <= 0) continue;
                const key = pair.slice(0, index).trim();
                const raw = pair.slice(index + 1).trim();
                if (raw.startsWith("[") && raw.endsWith("]")) {
                    const values = raw.slice(1, -1).split(",").map(value => value.trim()).filter(Boolean);
                    argumentValues[key] = values.map(value => value.replace(/^['\"]|['\"]$/g, ""));
                }
                else if (raw === "true" || raw === "false") argumentValues[key] = raw === "true";
                else argumentValues[key] = raw.replace(/^(?:\"([\\s\\S]*)\"|'([\\s\\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
            }
            }
        }
    }
    const ctx = {
        env: { ...(globals.$environment ?? globals.$env ?? {}), ...argumentValues },
        request: { ...request, headers: headers(request.headers) },
        respond(value) { return value; },
    };
    if (stage === "response") {
        const body = sourceResponse.bodyBytes ?? sourceResponse.body ?? "";
        const contentType = headers(sourceResponse.headers)["content-type"] ?? headers(sourceResponse.headers)["Content-Type"] ?? "";
        const isBinary = /flatbuffer|protobuf|octet-stream/i.test(contentType);
        const binaryInput = typeof body === "string" ? (isBinary ? bytesFromBinaryString(body) : new TextEncoder().encode(body)) : body instanceof ArrayBuffer ? new Uint8Array(body) : ArrayBuffer.isView(body) ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : body;
        const binary = binaryInput instanceof Uint8Array ? binaryInput : new TextEncoder().encode(String(body));
        ctx.response = {
            status: statusOf(sourceResponse), headers: headers(sourceResponse.headers),
            body,
            bodyBytes: isBinary ? binary : undefined,
            async text() { return new TextDecoder().decode(binary); },
            async arrayBuffer() { return binary.slice().buffer; },
        };
    }
    const done = globals.$done;
    if (stage === "response" && platform === "Quantumult X" && /(?:flatbuffer|protobuf|octet-stream)/i.test(headers(sourceResponse.headers)["content-type"] ?? headers(sourceResponse.headers)["Content-Type"] ?? "")) return done?.();
    let result;
    try { result = await handler(ctx); }
    catch (error) { (globals.console ?? console).error(error); result = undefined; }
    if (typeof done !== "function") return result;
    if (result === undefined || result === null) return done();
    const bodyToPlatform = body => {
        const bytes = body instanceof ArrayBuffer ? new Uint8Array(body)
            : ArrayBuffer.isView(body) ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : null;
        if (!bytes) return body;
        // Surge and Loon binary-body-mode consume Uint8Array; strings are text.
        return platform === "surge" || platform === "loon" ? bytes : binaryStringFromBytes(bytes);
    };
    const response = {
        status: platform === "Quantumult X" ? `HTTP/1.1 ${result.status ?? 200} ${result.statusText ?? "OK"}` : result.status ?? 200,
        headers: { ...headers(result.headers) }, body: bodyToPlatform(result.body ?? ""),
    };
    for (const key of Object.keys(response.headers)) if (key.toLowerCase() === "content-length" || key.toLowerCase() === "content-encoding" || key.toLowerCase() === "transfer-encoding") delete response.headers[key];
    if (platform === "Quantumult X") {
        delete response.statusText;
        return done(response);
    }
    // Request scripts synthesize a response; response scripts return modifications directly.
    return done(stage === "request" ? { response } : response);
}
