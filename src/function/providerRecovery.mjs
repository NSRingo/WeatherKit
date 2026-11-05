// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
export function providerProductAvailable(value) {
    return Boolean(value && typeof value === "object" && value.metadata && value.metadata.temporarilyUnavailable !== true);
}
export function cloneWeatherProduct(value, seen = new Map(), depth = 0) {
    if (!value || typeof value !== "object") return value;
    if (depth > 64 || seen.size > 100000) throw new RangeError("Weather product exceeds clone bounds");
    if (seen.has(value)) return seen.get(value);
    if (ArrayBuffer.isView(value)) return value instanceof DataView ? new DataView(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)) : new value.constructor(value);
    if (value instanceof ArrayBuffer) return value.slice(0);
    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof Map) return new Map([...value].map(([key, item]) => [key, cloneWeatherProduct(item, seen, depth + 1)]));
    if (value instanceof Set) return new Set([...value].map(item => cloneWeatherProduct(item, seen, depth + 1)));
    const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    seen.set(value, copy);
    for (const key of Object.keys(value)) copy[key] = cloneWeatherProduct(value[key], seen, depth + 1);
    return copy;
}

export function activeProviderAlerts(alerts, now = Date.now()) {
    return (Array.isArray(alerts) ? alerts : []).filter(alert => {
        const value = alert?.expireTime ?? alert?.eventEndTime;
        if (!value || value === "9999-12-31T23:59:59Z") return true;
        const timestamp = typeof value === "number" ? (value < 1e12 ? value * 1000 : value) : Date.parse(value);
        return Number.isFinite(timestamp) && timestamp > now;
    });
}

export function weatherProductsEqual(left, right, seen = new Map(), depth = 0) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object" || depth > 64) return false;
    if (seen.get(left) === right) return true;
    seen.set(left, right);
    if (left instanceof Date || right instanceof Date) return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
    if (ArrayBuffer.isView(left) || left instanceof ArrayBuffer || ArrayBuffer.isView(right) || right instanceof ArrayBuffer) {
        const bytes = value => (ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : value instanceof ArrayBuffer ? new Uint8Array(value) : undefined);
        const a = bytes(left),
            b = bytes(right);
        return Boolean(a && b && a.length === b.length && a.every((value, index) => value === b[index]));
    }
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    return keys.every(key => Object.hasOwn(right, key) && weatherProductsEqual(left[key], right[key], seen, depth + 1));
}
