import { $app, Console, done, Lodash as _ } from "@nsnanocat/util";
import { Request } from "./process/Request.js";
/***************** Processing *****************/
!(async () => {
    ({ $request, $response } = await Request($request));
})()
    .catch(e => Console.error(e))
    .finally(() => {
        switch (typeof $response) {
            case "object": // 有构造回复数据，返回构造的回复数据
                //Console.debug("finally", `echo $response: ${JSON.stringify($response, null, 2)}`);
                if ($response.headers?.["Content-Encoding"]) $response.headers["Content-Encoding"] = "identity";
                if ($response.headers?.["content-encoding"]) $response.headers["content-encoding"] = "identity";
                switch ($app) {
                    default:
                        done({ response: $response });
                        break;
                    case "Quantumult X":
                        if (!$response.status) $response.status = "HTTP/1.1 200 OK";
                        delete $response.headers?.["Content-Length"];
                        delete $response.headers?.["content-length"];
                        delete $response.headers?.["Transfer-Encoding"];
                        done($response);
                        break;
                }
                break;
            case "undefined": // 无构造回复数据，发送修改的请求数据
                //Console.debug("finally", `$request: ${JSON.stringify($request, null, 2)}`);
                done($request);
                break;
            default:
                Console.error(`不合法的 $response 类型: ${typeof $response}`);
                break;
        }
    });
