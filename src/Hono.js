import { Hono } from "hono/tiny";
import { fetch } from "@nsnanocat/util";
import HonoWorkerAdapter from "./class/HonoWorkerAdapter.mjs";
import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";
/***************** Processing *****************/

export default new Hono()
    .get("/", c => c.text("OK"))
    .all("/:rest{.*}", async c => {
        let $request = await HonoWorkerAdapter.buildRequest(c.req);
        if ($request.headers.$argument) {
            globalThis.$argument = $request.headers.$argument;
            delete $request.headers.$argument;
        } else {
            const url = new URL($request.url);
            globalThis.$argument = url.search.slice(1);
            [...url.searchParams.keys()].filter(k => /^[A-Z]/.test(k)).forEach(k => url.searchParams.delete(k));
            $request.url = url.toString();
        }
        let $response;
        ({ $request, $response } = await Request($request));
        switch (typeof $response) {
            case "undefined":
                $response = await fetch($request);
                $response = await Response($request, $response);
                break;
            case "object":
                break;
            default:
                throw new TypeError(`Invalid response type: ${typeof $response}`);
        }
        return HonoWorkerAdapter.writeResponse(c, $response);
    })
    .onError((e, c) => {
        console.error(e);
        return c.body(e.message, 500);
    });
