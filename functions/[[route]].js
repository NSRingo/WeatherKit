import { handle } from "hono/cloudflare-pages";
import WeatherAlerts from "../src/class/WeatherAlerts.mjs";
import app from "../src/Hono.js";

const handleApp = handle(app);

/**
 * 处理 Apple alertDetails 发出的数组接口，其余请求继续进入 Hono。
 * Handle the array endpoint used by Apple alertDetails and pass remaining requests to Hono.
 * @param {Parameters<typeof handleApp>[0]} context Pages Functions 请求上下文 / Pages Functions request context.
 * @returns {Promise<Response>} WeatherAlert JSON 或 Hono 响应 / WeatherAlert JSON or Hono response.
 */
export const onRequest = async context => {
    const url = new URL(context.request.url);
    switch (url.pathname) {
        case "/api/v1/weatherAlerts":
        case "/weatherkit.apple.com/api/v1/weatherAlerts": {
            const ids = url.searchParams.get("ids")?.trim();
            if (!WeatherAlerts.IsQWeatherIdentifier(ids)) return Response.json([], { status: 400 });

            try {
                const alerts = await WeatherAlerts.GetQWeather(url, Object.fromEntries(context.request.headers));
                return Response.json(alerts, {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "max-age=0",
                    },
                });
            } catch (error) {
                console.error(JSON.stringify({ event: "qweather_alert_error", message: error instanceof Error ? error.message : String(error) }));
                return Response.json([], {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "max-age=0",
                    },
                });
            }
        }
        default:
            return await handleApp(context);
    }
};
