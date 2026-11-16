import { Common } from "@nsringo/weatherkit";

/**
 * 将 UUID 的多种表示（字符串、字节数组、字节对象）归一化为 16 字节数组。 / Normalize UUID representations (string, byte array, bytes object) to a 16-byte array.
 * @param {string|Uint8Array|Array|object} uuid - UUID 输入 / UUID input.
 * @returns {Uint8Array|Array|null} 16 字节数组 / 16-byte array.
 */
function toUuidBytes(uuid) {
    if (uuid === null || uuid === undefined) return null;
    if (uuid instanceof Uint8Array || Array.isArray(uuid)) return uuid;
    if (typeof uuid === "string") {
        const bytesObject = uuidStringToBytesObject(uuid);
        return bytesObject ? bytesObject.bytes : null;
    }
    if (typeof uuid === "object") {
        if (uuid.bytes instanceof Uint8Array || Array.isArray(uuid.bytes)) return uuid.bytes;
        if (typeof uuid.bytesArray === "function") return uuid.bytesArray();
    }
    return null;
}

/**
 * 将带连字符的 UUID 字符串解析为字节对象。 / Parse a hyphenated UUID string into a bytes object.
 * @param {string} uuidString - UUID 输入 / UUID input.
 * @returns {object|null} 字节对象 / Bytes object.
 */
function uuidStringToBytesObject(uuidString) {
    if (typeof uuidString !== "string") return null;
    const hex = uuidString.replace(/-/g, "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(hex)) return null;
    const bytes = [];
    for (let index = 0; index < hex.length; index += 2) bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
    return { bytes };
}

/**
 * 将 16 字节 UUID 格式化为带连字符的字符串。 / Format a 16-byte UUID as a hyphenated string.
 * @param {Uint8Array|Array|object} uuid - UUID 输入 / UUID input.
 * @returns {string|null} UUID 字符串 / UUID string.
 */
function uuidBytesObjectToString(uuid) {
    const bytes = toUuidBytes(uuid);
    if (!bytes || bytes.length !== 16) return null;
    const hex = Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 构建 Common.UUID 子表偏移；无有效字节时返回 0。 / Build the Common.UUID child table offset; returns 0 without valid bytes.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {*} uuid - UUID 输入 / UUID input.
 * @returns {number} 子表偏移 / Table offset.
 */
export function createUuidOffset(builder, uuid) {
    const bytes = toUuidBytes(uuid);
    if (!bytes || bytes.length === 0) return 0;
    const idBytesOffset = Common.UUID.createBytesVector(builder, bytes);
    return Common.UUID.createUUID(builder, idBytesOffset);
}

/**
 * 解码 UUID 子表为带连字符的字符串。 / Decode a UUID child table into a hyphenated string.
 * @param {object} uuid - UUID 输入 / UUID input.
 * @returns {string|null} UUID 字符串 / UUID string.
 */
export function decodeUuid(uuid) {
    return uuidBytesObjectToString(uuid);
}
