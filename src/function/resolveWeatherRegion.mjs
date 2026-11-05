// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0

import { fingerprint } from "../class/ProviderRequestCache.mjs";
import getProviderRegions from "../data/providerRegions.mjs";
export const REGION_HINT_KEY = "WeatherKit.RegionHints.v1";
let polygonBounds;
function getPolygons() {
    return (polygonBounds ??= Object.entries(getProviderRegions()).flatMap(([country, polygons]) => polygons.map(rings => ({ country, rings, bounds: rings[0].reduce((box, [x, y]) => [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)], [180, 90, -180, -90]) }))));
}
function distanceSquared(x, y, a, b) {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length)) : 0;
    return (x - a[0] - t * dx) ** 2 + (y - a[1] - t * dy) ** 2;
}
function ringContains(ring, x, y) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i],
            b = ring[j];
        if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
}
export function countryFromCoordinates(latitude, longitude) {
    if (latitude === undefined || longitude === undefined || latitude === "" || longitude === "") return undefined;
    const y = Number(latitude),
        x = Number(longitude);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) return undefined;
    for (const { country, rings, bounds: b } of getPolygons()) {
        if (x < b[0] || x > b[2] || y < b[1] || y > b[3] || !ringContains(rings[0], x, y) || rings.slice(1).some(r => ringContains(r, x, y))) continue;
        // A generous exclusion exceeds simplification error; uncertain edges use other hints.
        if (rings.some(r => r.some((a, i) => i > 0 && distanceSquared(x, y, a, r[i - 1]) <= (country === "CN" ? 0.05 : 0.01) ** 2))) return undefined;
        return country;
    }
    return undefined;
}
export default function resolveWeatherRegion({ latitude, longitude, explicitCountry, localeCountry, fallback = "Auto", now = Date.now, store } = {}) {
    const normalize = value => (typeof value === "string" && /^[A-Z]{2}$/i.test(value.trim()) ? value.trim().toUpperCase() : undefined);
    const explicit = normalize(explicitCountry),
        locale = normalize(localeCountry);
    const valid = latitude !== undefined && longitude !== undefined && latitude !== "" && longitude !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;
    if (!valid) return explicit ?? locale;
    const key = fingerprint(JSON.stringify([Number(latitude), Number(longitude)])),
        timestamp = now();
    if (!store && typeof $loon === "string" && typeof $persistentStore !== "undefined") store = { read: () => $persistentStore.read(REGION_HINT_KEY), write: value => $persistentStore.write(value, REGION_HINT_KEY) };
    let entries = [];
    try {
        const raw = store?.read();
        if (typeof raw === "string" && raw.length <= 8192) {
            const parsed = JSON.parse(raw);
            if (parsed?.version === 1 && Array.isArray(parsed.entries) && parsed.entries.length <= 32)
                entries = parsed.entries.filter(e => /^[a-f0-9]{64}$/.test(e.key) && normalize(e.country) && Number.isFinite(e.at) && timestamp >= e.at && timestamp - e.at < 7 * 86400000).map(e => ({ key: e.key, country: normalize(e.country), at: e.at }));
        }
    } catch {}
    if (explicit) {
        // Re-confirm stable coordinates at most hourly, not on every weather refresh.
        if (entries.some(entry => entry.key === key && entry.country === explicit && timestamp - entry.at < 3600000)) return explicit;
        try {
            store?.write(JSON.stringify({ version: 1, entries: [{ key, country: explicit, at: timestamp }, ...entries.filter(e => e.key !== key)].slice(0, 32) }));
        } catch {}
        return explicit;
    }
    if (fallback === "Locale") return locale;
    if (["CN", "HK", "MO", "TW"].includes(fallback)) return fallback;
    return entries.find(e => e.key === key)?.country ?? countryFromCoordinates(latitude, longitude) ?? locale;
}
