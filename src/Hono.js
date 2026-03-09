import { Hono } from "hono";
import { fetch } from "@nsnanocat/util";
// import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";
/***************** Processing *****************/
export default new Hono().all("/:rest{.*}", async c => {
    const url = new URL(c.req.url);
    switch (true) {
        case url.hostname.startsWith("weatherkit."): {
            url.hostname = "weatherkit.apple.com";
            break;
        }
        default: {
            url.protocol = "https:";
            url.hostname = "weatherkit.apple.com";
            url.port = "443";
            url.pathname = c.req.param("rest");
        }
    }
    let $request = {
        method: c.req.method,
        url: url.toString(),
        headers: c.req.header(),
        bodyBytes: await c.req.arrayBuffer().catch(error => {
            console.info(error);
            return undefined;
        }),
    };
    let $response;
    // ({ $request, $response } = await Request($request));
    // if ($response) {
    //     Object.keys($response.headers).map(k => c.header(k, $response.headers[k]));
    //     return c.body($response.body);
    // }
    $response = await fetch($request);
    delete $response.headers["content-length"];

    /* todo */
    // globalThis.$arguments = url.searchParams.get("Weather_Provider");

    $response = await Response($request, $response);
    Object.keys($response.headers).map(k => c.header(k, $response.headers[k]));
    return c.body($response.body);
});
