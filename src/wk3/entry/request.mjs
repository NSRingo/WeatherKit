import { configuration } from "./index.mjs";
import { webFetch } from "wk3:runtime";
import WeatherAlerts from "../class/WeatherAlerts.mjs";
import AirQualityScale from "../class/AirQualityScale.mjs";
import { headerObject, responseHeaders } from "../runtime.mjs";
import { isNativeAlertDetailsID, resolveNativeAlertDetails } from "../class/NativeAlertDetails.mjs";

export async function handleRequest(ctx) {
    const url = new URL(ctx.request.url);
    if (url.hostname !== "weatherkit.apple.com") return;
    if (/^\/api\/v[12]\/airQualityScale\//.test(url.pathname)) {
        const parts = url.pathname.split("/").filter(Boolean);
        const scaleName = decodeURIComponent(parts[4] ?? "");
        // Upstream dev requests EAQI's native, versionless Apple scale.
        if (/^EU\.EAQI(?:\.\d+)?$/.test(scaleName)) {
            url.pathname = `/api/${parts[1]}/airQualityScale/${parts[3]}/EU.EAQI`;
            const headers = ctx.request.headers;
            if (typeof headers?.delete === "function") headers.delete("if-none-match");
            else for (const key of Object.keys(headers ?? {})) if (key.toLowerCase() === "if-none-match") delete headers[key];
            return { url: url.toString(), headers };
        }
        // Other standards retain their existing Apple-first behavior.
        try {
            const upstream = await webFetch(url.toString(), { headers: headerObject(ctx.request.headers) });
            const parts = url.pathname.split("/").filter(Boolean);
            if (upstream.status === 200) {
                let body = await upstream.text();
                return ctx.respond({ status: 200, headers: responseHeaders(upstream.headers), body });
            }
            const fallback = AirQualityScale.buildScale(parts[3] ?? "en", parts[4] ?? "");
            if (fallback) return ctx.respond(fallback);
            return ctx.respond({ status: upstream.status, headers: responseHeaders(upstream.headers), body: await upstream.text() });
        } catch {
            // A failed script-side request lets the ordinary Apple request proceed.
            return;
        }
    }
    if (!/^\/api\/v[12]\/weatherAlerts$/.test(url.pathname)) return;
    const { Settings } = configuration(ctx);
    if (!Settings.DataSets.includes("weatherAlerts")) return;
    const ids = url.searchParams.get("ids") ?? "";
    const language = url.searchParams.get("lang") ?? "zh-CN";
    const native = isNativeAlertDetailsID(ids);
    if (!native && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{9}$/.test(ids)) return;
    try {
        const alerts = native
            ? await resolveNativeAlertDetails(ids, language, webFetch)
            : await WeatherAlerts.DetailsForQWeather(ids, language, webFetch);
        return ctx.respond({ status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(alerts) });
    } catch {
        // Reserved locators must never be forwarded to Apple; region IDs retain
        // the cloud route's pass-through behavior on public provider failure.
        if (native) return ctx.respond({ status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: "[]" });
    }
}
