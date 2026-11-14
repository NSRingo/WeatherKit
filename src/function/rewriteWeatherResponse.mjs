// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Validators describe Apple's original entity, not the newly encoded body.
export default function rewriteWeatherResponse(response, body) {
    const headers = { ...response.headers };
    for (const name of Object.keys(headers)) {
        if (["etag", "last-modified", "content-md5", "digest", "content-length", "content-encoding", "transfer-encoding", "cache-control", "expires"].includes(name.toLowerCase())) delete headers[name];
    }
    headers["Cache-Control"] = "no-store";
    const { bodyBytes: _originalBytes, ...result } = response;
    return { ...result, headers, body };
}
