// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import AirQualityScale from "../class/AirQualityScale.mjs";

let result = $request;
try {
    const url = new URL($request.url);
    const match = url.pathname.match(/^\/api\/v1\/airQualityScale\/([A-Z0-9]+(?:-[A-Z0-9]+)*)\/((?:HK|CN)\.AQHI)(?:\.\d+)?$/i);
    if (url.hostname === "weatherkit.apple.com" && match && (!$request.method || ["GET", "HEAD", "OPTIONS"].includes($request.method))) {
        url.pathname = `/api/v1/airQualityScale/${match[1]}/${match[2]}`;
        const response = new AirQualityScale().Build(match[1], match[2]);
        result = response ? { response } : { ...$request, url: url.toString() };
    }
} catch {
    /* Unknown requests preserve the caller's data. */
}
$done(result);
