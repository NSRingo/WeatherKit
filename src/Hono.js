import { Hono } from "hono";
import { Response } from "./process/Response.js";
// import { Request } from "./process/Request.js";
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
        body: ["GET", "HEAD"].includes(c.req.method) ? undefined : new Uint8Array(await c.req.arrayBuffer()),
    };
    // Object.assign(globalThis, await Request($request));
    // if ($response) return c.body($response.body);
    globalThis.$response = await fetch($request.url, $request).then(async r => ({
        status: r.status,
        headers: Object.fromEntries(new Headers(r.headers).entries()),
        body: new Uint8Array(await r.arrayBuffer()),
    }));
    delete $response.headers["content-length"];

    /* todo */
    // globalThis.$arguments = url.searchParams.get("Weather_Provider");

    Object.assign(globalThis, await Response($request, $response));
    Object.keys($response.headers).map(k => c.header(k, $response.headers[k]));
    return c.body($response.body);
});
