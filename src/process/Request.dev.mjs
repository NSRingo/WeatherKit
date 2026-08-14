import { Lodash as _, Console, Storage } from "@nsnanocat/util";
import AirQualityScale from "../class/AirQualityScale.mjs";
import ColorfulClouds from "../class/ColorfulClouds.mjs";
import QWeather from "../class/QWeather.mjs";
import WeatherAlerts from "../class/WeatherAlerts.mjs";
import WeatherKit2 from "../class/WeatherKit2.mjs";
import database from "../function/database.mjs";
import parseWeatherKitURL from "../function/parseWeatherKitURL.mjs";
import setENV from "../function/setENV.mjs";
/***************** Processing *****************/
export async function Request($request) {
    // 构造回复数据
    let $response = undefined;
    // 解构URL
    const url = new URL($request.url);
    Console.info(`url: ${url.toJSON()}`);
    const parameters = parseWeatherKitURL(url);
    // 解析格式
    const FORMAT = ($request.headers?.["Content-Type"] ?? $request.headers?.["content-type"])?.split(";")?.[0];
    Console.info(`FORMAT: ${FORMAT}`);
    /**
     * 设置
     * @type {{Settings: import('./types').Settings}}
     */
    const { Settings, Caches } = setENV("iRingo", "WeatherKit", database);
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
                    switch (url.pathname) {
                        case "/api/v1/weatherAlerts": {
                            const identifier = url.searchParams.get("ids");
                            const isQWeatherPage = QWeather.IsWeatherAlertPageIdentifier(identifier);
                            let body;
                            try {
                                switch (Settings?.WeatherAlerts?.Provider) {
                                    case "WeatherKit": {
                                        break;
                                    }
                                    case "ColorfulClouds": {
                                        Console.info("☑️ ColorfulClouds.WeatherAlert", `ids: ${identifier}`);
                                        const colorfulClouds = new ColorfulClouds(parameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ==");
                                        const source = await colorfulClouds.WeatherAlert();
                                        body = WeatherAlerts.Build(source, {
                                            attributionUrl: source?.metadata?.attributionUrl ?? "https://www.caiyunapp.com/h5",
                                            identifier: `${parameters.latitude},${parameters.longitude}`,
                                            language: parameters.language,
                                            countryCode: parameters.country,
                                        });
                                        break;
                                    }
                                    case "QWeather": {
                                        Console.info("☑️ QWeather.WeatherAlert", `ids: ${identifier}`);
                                        const qWeather = new QWeather(parameters, Settings?.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", Settings?.API?.QWeather?.Host);
                                        body = WeatherAlerts.Build(await qWeather.WeatherAlert(), {
                                            attributionUrl: "https://www.12379.cn/",
                                            identifier: `${parameters.latitude},${parameters.longitude}`,
                                            language: parameters.language,
                                            countryCode: parameters.country,
                                        });
                                        break;
                                    }
                                    case "QWeatherWeb":
                                    default: {
                                        if (isQWeatherPage) {
                                            Console.info("☑️ QWeather.FetchWeatherAlertPage", `ids: ${identifier}`);
                                            const source = await QWeather.FetchWeatherAlertPage(identifier, parameters.language, $request.headers);
                                            body = WeatherAlerts.Build(source, {
                                                attributionUrl: QWeather.BuildWeatherAlertPageURL(identifier, parameters.language, false),
                                                identifier,
                                                language: parameters.language,
                                                countryCode: identifier.match(/-([0-9]+)$/)?.[1]?.startsWith("101") ? "CN" : "",
                                            });
                                        }
                                        break;
                                    }
                                }
                            } catch (error) {
                                Console.error("WeatherAlerts", error?.stack ?? error?.message ?? String(error));
                                body = [];
                            }
                            if (body !== undefined) {
                                if (!Array.isArray(body)) {
                                    Console.warn("WeatherAlerts", `unexpectedBodyType: ${typeof body}`);
                                    body = [];
                                }
                                Console.info("✅ WeatherAlerts", `alerts: ${body.length}`, "status: 200");
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
                            }
                            break;
                        }
                        default:
                            if (url.pathname.startsWith("/api/v1/airQualityScale/")) {
                                const pathParts = url.pathname.split("/").filter(Boolean);
                                const language = pathParts[3] ?? "en";
                                const scaleName = (pathParts[4] ?? "").replace(/\.\d+$/, "");
                                pathParts[4] = scaleName;
                                url.pathname = `/${pathParts.join("/")}`;
                                switch (url.pathname) {
                                    case `/api/v1/airQualityScale/${language}/HK.AQHI`:
                                    case `/api/v1/airQualityScale/${language}/CN.AQHI`:
                                        $response = new AirQualityScale().Build(language, scaleName);
                                        break;
                                }
                            } else if (url.pathname.startsWith("/api/v2/weather/")) {
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
                            }
                            break;
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
