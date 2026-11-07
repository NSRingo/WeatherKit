import database from "../function/database.mjs";
import buildSettings from "../function/buildSettings.mjs";
import { get, set, merge } from "../utils/object.mjs";
import { moduleOptionLabels, normalizeModuleOption } from "../option-values.mjs";

export function configuration(ctx) {
    // SETTINGS is the same nested Settings object accepted by buildSettings.
    const overrides = ctx.env?.SETTINGS ? JSON.parse(ctx.env.SETTINGS) : {};
    const dotted = {};
    for (const [key, value] of Object.entries(ctx.env ?? {})) {
        if (key.includes(".") || key === "DataSets" || key === "LogLevel") set(dotted, key, value);
    }
    merge(overrides, dotted);
    for (const key of Object.keys(moduleOptionLabels)) {
        const value = get(overrides, key);
        if (value !== undefined) set(overrides, key, normalizeModuleOption(key, value));
    }
    // The existing merge deliberately preserves defaults for an empty array.
    // Its string "[]" convention clears them during buildSettings normalization.
    function emptyArrays(value) {
        if (Array.isArray(value)) return value.length ? value : "[]";
        if (value && typeof value === "object") for (const key of Object.keys(value)) value[key] = emptyArrays(value[key]);
        return value;
    }
    const result = buildSettings(database, emptyArrays(overrides));
    // Module parameters are strings. Normalize only list-valued settings here;
    // never split tokens/hosts or change the shared cloud settings parser.
    for (const path of ["DataSets", "Weather.Replace", "AirQuality.Current.Index.Replace", "AirQuality.Current.Pollutants.Units.Replace"]) {
        const value = get(dotted, path) ?? get(overrides, path);
        if (value === undefined) continue;
        let list = value;
        if (typeof list === "string") {
            const text = list.trim();
            list = text.startsWith("[") ? JSON.parse(text) : text.split(",").map(v => v.trim()).filter(Boolean);
        }
        if (!Array.isArray(list) || list.some(v => typeof v !== "string" || !v.trim())) throw new TypeError(`Invalid list setting: ${path}`);
        set(result.Settings, path, list.map(v => v.trim()));
    }
    for (const path of ["API.ColorfulClouds.Token", "API.QWeather.Token", "API.QWeather.Host"]) {
        const value = get(dotted, path) ?? get(overrides, path);
        if (value !== undefined) set(result.Settings, path, String(value) || (path.endsWith(".Host") ? "devapi.qweather.com" : null));
    }
    if (result.Settings.WeatherAlerts?.Provider === "WeatherKit") {
        result.Settings.DataSets = result.Settings.DataSets.filter(name => name !== "weatherAlerts");
    }
    return result;
}
