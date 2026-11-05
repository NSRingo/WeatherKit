// Imported only by the four-platform builder; shared/Egern alerts stay native.
export function readAlertHeader(headers, name) {
    if (typeof headers?.get === "function") return headers.get(name);
    const key = Object.keys(headers ?? {}).find(key => key.toLowerCase() === name.toLowerCase());
    return key === undefined ? undefined : headers[key];
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function encodeAlertBase64(bytes) {
    let output = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const value = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
        output += alphabet[value >>> 18] + alphabet[(value >>> 12) & 63]
            + (i + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : "=")
            + (i + 2 < bytes.length ? alphabet[value & 63] : "=");
    }
    return output;
}

// NativeAlertDetails already validates base64url and adds standard padding.
// Its existing re-encode check still rejects noncanonical unused bits.
export function decodeAlertBase64(value) {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new TypeError("Invalid alert base64");
    let output = "", buffer = 0, bits = 0;
    for (const character of value.replace(/=+$/, "")) {
        buffer = (buffer << 6) | alphabet.indexOf(character);
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            output += String.fromCharCode((buffer >>> bits) & 255);
        }
    }
    return output;
}
