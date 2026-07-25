import { Hono } from "hono/tiny";
import { fetch } from "@nsnanocat/util";
import HonoWorkerAdapter from "./class/HonoWorkerAdapter.mjs";
// import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";
/***************** Processing *****************/

export default new Hono()
    .get("/", c => c.text("OK"))
    .all("/:rest{.*}", async c => {
        let $request = await HonoWorkerAdapter.buildRequest(c.req);
        let $response;
        // ({ $request, $response } = await Request($request, KV));
        $request = await HonoWorkerAdapter.buildRequest(c.req);
        if (new URL($request.url).hostname !== "weatherkit.apple.com") {
            return c.body("Forbidden", 403);
        }
        $response = await fetch($request);
        $response = await Response($request, $response);
        return HonoWorkerAdapter.writeResponse(c, $response);
    })
    .onError((e, c) => {
        console.error(e);
        return c.body(e.message, 500);
    });
