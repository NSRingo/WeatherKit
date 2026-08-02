import { Lodash as _, Console, Storage } from "@nsnanocat/util";
import QWeather from "../class/QWeather.mjs";
import WeatherAlerts from "../class/WeatherAlerts.mjs";
import WeatherKit2 from "../class/WeatherKit2.mjs";
import database from "../function/database.mjs";
import setENV from "../function/setENV.mjs";
/***************** Processing *****************/
export async function Request($request) {
    // 构造回复数据
    let $response = undefined;
    // 解构URL
    const url = new URL($request.url);
    Console.info(`url: ${url.toJSON()}`);
    // 解析格式
    const FORMAT = ($request.headers?.["Content-Type"] ?? $request.headers?.["content-type"])?.split(";")?.[0];
    Console.info(`FORMAT: ${FORMAT}`);
    /**
     * 设置
     * @type {{Settings: import('./types').Settings}}
     */
    const { Settings, Caches, Configs } = setENV("iRingo", "WeatherKit", database);
    // 方法判断
    switch ($request.method) {
        case "POST":
        case "PUT":
        case "PATCH":
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
        case "DELETE":
            // 格式判断
            switch (FORMAT) {
                case undefined: // 视为无body
                    break;
                case "application/x-www-form-urlencoded":
                case "text/plain":
                default:
                    break;
                case "application/x-mpegURL":
                case "application/x-mpegurl":
                case "application/vnd.apple.mpegurl":
                case "audio/mpegurl":
                    //body = M3U8.parse($request.body);
                    //Console.debug(`body: ${JSON.stringify(body)}`);
                    //$request.body = M3U8.stringify(body);
                    break;
                case "text/xml":
                case "text/html":
                case "text/plist":
                case "application/xml":
                case "application/plist":
                case "application/x-plist":
                    //body = XML.parse($request.body);
                    //Console.debug(`body: ${JSON.stringify(body)}`);
                    //$request.body = XML.stringify(body);
                    break;
                case "text/vtt":
                case "application/vtt":
                    //body = VTT.parse($request.body);
                    //Console.debug(`body: ${JSON.stringify(body)}`);
                    //$request.body = VTT.stringify(body);
                    break;
                case "text/json":
                case "application/json":
                    //body = JSON.parse($request.body ?? "{}");
                    //Console.debug(`body: ${JSON.stringify(body)}`);
                    //$request.body = JSON.stringify(body);
                    break;
                case "application/protobuf":
                case "application/x-protobuf":
                case "application/vnd.google.protobuf":
                case "application/grpc":
                case "application/grpc+proto":
                case "application/octet-stream": {
                    //Console.debug(`$request: ${JSON.stringify($request, null, 2)}`);
                    let rawBody = $request.bodyBytes ? new Uint8Array($request.bodyBytes) : ($request.body ?? new Uint8Array());
                    //Console.debug(`isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody, null, 2)}`);
                    // 写入二进制数据
                    $request.body = rawBody;
                    break;
                }
            }
        //break; // 不中断，继续处理URL
        case "GET":
        case "HEAD":
        case "OPTIONS":
        default:
            delete $request?.headers?.["If-None-Match"];
            delete $request?.headers?.["if-none-match"];
            // 主机判断
            switch (url.hostname) {
                case "weatherkit.apple.com":
                    // 路径判断
                    switch (true) {
                        case url.pathname === "/api/v1/weatherAlerts": {
                            const identifier = url.searchParams.get("ids");
                            const language = url.searchParams.get("lang")?.trim() || "zh-CN";
                            const country = url.searchParams.get("country")?.toUpperCase() || "CN";
                            const isQWeatherPage = WeatherAlerts.IsQWeatherPageIdentifier(identifier);
                            const coordinates = WeatherAlerts.ParseQWeatherCoordinateIdentifier(identifier);
                            if (!isQWeatherPage && !coordinates) break;
                            const handlerName = coordinates ? "QWeather.WeatherAlert" : "WeatherAlerts.GetQWeatherFromPage";
                            Console.info(`☑️ ${handlerName}`, `ids: ${identifier}`);
                            let body;
                            try {
                                if (coordinates) {
                                    const qWeather = new QWeather({ ...coordinates, country, language }, Settings?.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", Settings?.API?.QWeather?.Host);
                                    body = WeatherAlerts.Build(await qWeather.WeatherAlert(), {
                                        attributionUrl: "https://www.12379.cn/",
                                        identifier: `${coordinates.latitude},${coordinates.longitude}`,
                                        language,
                                        countryCode: country,
                                    });
                                } else {
                                    body = await WeatherAlerts.GetQWeatherFromPage(identifier, language, $request.headers);
                                }
                            } catch (error) {
                                Console.error(handlerName, error?.stack ?? error?.message ?? String(error));
                                body = [];
                            }
                            if (!Array.isArray(body)) {
                                Console.warn(handlerName, `unexpectedBodyType: ${typeof body}`);
                                body = [];
                            }
                            Console.info(`✅ ${handlerName}`, `alerts: ${body.length}`, "status: 200");
                            $response = {
                                status: 200,
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin": "*",
                                    "Cache-Control": "max-age=0",
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(body),
                            };
                            break;
                        }
                        case url.pathname.startsWith("/api/v2/weather/"): {
                            // 解决 macOS 天气 app 如果使用国际版 Maps 时，country 丢失不显示未来一小时降水的问题
                            switch (true) {
                                case $request.headers["User-Agent"]?.startsWith("WeatherKit_Weather_macOS_Version"):
                                case $request.headers["user-agent"]?.startsWith("WeatherKit_Weather_macOS_Version"):
                                    if (url.searchParams.has("country")) {
                                        //if (url.searchParams.get("country") === "CN") url.searchParams.set("country", "TW");
                                    } else {
                                        const gcc = Storage.getItem("@iRingo.Location.Caches")?.pep?.gcc;
                                        if (gcc) url.searchParams.set("country", gcc);
                                    }
                                    break;
                            }
                            let dataSets = url.searchParams.get("dataSets")?.split(",");
                            if (dataSets) {
                                dataSets = WeatherKit2.filterRootNames(dataSets, Settings.DataSets);
                                url.searchParams.set("dataSets", dataSets?.join(","));
                            }
                            break;
                        }
                    }
                    break;
                case "weather-map2.apple.com": {
                    // 路径判断
                    switch (url.pathname) {
                        case "/v1/mapOverlay/precipitationRadarMap":
                        case "/v1/mapOverlay/precipitationForecastByFrameTime": {
                            /*
							switch (true) {
								case $request.headers["User-Agent"]?.startsWith("Weather_macOS_Version"):
								case $request.headers["user-agent"]?.startsWith("Weather_macOS_Version"):
									switch (true) {
										case $request?.headers?.geocountrycode === "CN":
											$request.headers.geocountrycode = "US";
											break;
										case $request?.headers?.GeoCountryCode === "CN":
											$request.headers.GeoCountryCode = "US";
											break;
									}
									break;
							}
							*/
                            break;
                        }
                    }
                    break;
                }
            }
            break;
        case "CONNECT":
        case "TRACE":
            break;
    }
    $request.url = url.toString();
    Console.debug(`$request.url: ${$request.url}`);
    return { $request, $response };
}
