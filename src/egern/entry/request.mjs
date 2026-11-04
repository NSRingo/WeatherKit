import { configuration } from "./index.mjs";
import { webFetch } from "egern:runtime";
import WeatherAlerts from "../wk3/class/WeatherAlerts.mjs";
import AirQualityScale from "../wk3/class/AirQualityScale.mjs";
import { headerObject, responseHeaders } from "./runtime.mjs";
import { isNativeAlertDetailsID, resolveNativeAlertDetails } from "../wk3/class/NativeAlertDetails.mjs";

export async function handleRequest(ctx) {
    const url = new URL(ctx.request.url);
    if (url.hostname !== "weatherkit.apple.com") return;
    if (/^\/api\/v[12]\/airQualityScale\//.test(url.pathname)) {
        // Keep the existing Apple-first behavior while moving this responsibility
        // to the upstream request category. Native ctx.http does not re-enter scripts.
        try {
            const upstream = await webFetch(url.toString(), { headers: headerObject(ctx.request.headers) });
            if (upstream.status === 200) return ctx.respond({ status: 200, headers: responseHeaders(upstream.headers), body: await upstream.text() });
            const parts = url.pathname.split("/").filter(Boolean);
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
