import { Console, done } from "@nsnanocat/util";
import { Response } from "./process/Response.dev.js";
/***************** Processing *****************/
!(async () => {
    $response = await Response($request, $response);
})()
    .catch(e => Console.error(e))
    .finally(() => done($response));
