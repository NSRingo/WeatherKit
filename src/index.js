import { Hono } from "hono";
import { Response } from "./process/response.js";
/***************** Processing *****************/
export default new Hono().all("/:rest{.*}", async c => {
    const url = new URL(c.req.url);
    url.protocol = "https:";
    url.hostname = "weatherkit.apple.com";
    url.port = "443";
    url.pathname = c.req.param("rest");
    globalThis.$request = {
        url: url.toString(),
        method: c.req.method,
        headers: c.req.header(),
        body: ["GET", "HEAD"].includes(c.req.method) ? undefined : await c.req.arrayBuffer(),
    };
    globalThis.$response = await fetch(url.toString(), {
        method: $request.method,
        headers: $request.headers,
        body: $request.body,
    }).then(async r => ({
        status: r.status,
        headers: Object.fromEntries(new Headers(r.headers).entries()),
        body: new Uint8Array(await r.arrayBuffer()),
    }));
    delete $response.headers["content-length"];

    /* todo */
    // globalThis.$arguments = url.searchParams.get("Weather_Provider");

    Object.assign(globalThis, await Response($request, $response));
    Object.keys($response.headers).forEach(k => c.header(k, $response.headers[k]));
    return c.body($response.body);
});
