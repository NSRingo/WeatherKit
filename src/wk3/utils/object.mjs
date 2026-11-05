// 按点路径（如 "a.b.c" 或 ["a","b","c"]）拆分为数组
function toPath(value) {
    if (Array.isArray(value)) return value;
    return value.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}

// 深度合并多个对象到 target（数组做浅拷贝，避免共享引用）
export function merge(target, ...sources) {
    if (target === null || target === undefined) return target;
    for (const source of sources) {
        if (source === null || source === undefined) continue;
        for (const key of Object.keys(source)) {
            const src = source[key];
            const dst = target[key];
            if (isPlainObject(src)) {
                target[key] = merge(isPlainObject(dst) ? dst : {}, src);
            } else if (Array.isArray(src)) {
                target[key] = src.length > 0 ? [...src] : (dst !== undefined ? dst : []);
            } else if (src !== undefined) {
                target[key] = src;
            }
        }
    }
    return target;
}

// 按点路径读取对象属性
export function get(object, path, defaultValue) {
    const keys = toPath(path);
    const result = keys.reduce((acc, key) => Object(acc)[key], object);
    return result === undefined ? defaultValue : result;
}

// 按点路径写入对象属性
export function set(object, path, value) {
    const keys = toPath(path);
    keys.slice(0, -1).reduce((acc, key, i) => {
        if (Object(acc[key]) !== acc[key]) {
            acc[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        }
        return acc[key];
    }, object)[keys[keys.length - 1]] = value;
    return object;
}
