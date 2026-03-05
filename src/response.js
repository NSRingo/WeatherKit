import { Console, done } from "@nsnanocat/util";
import { Response } from "./process/response.js";
/***************** Processing *****************/
!(async () => {
    Object.assign(globalThis, await Response($request, $response));
})()
    .catch(e => Console.error(e))
    .finally(() => done($response));
