// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import utf8Length from "./utf8Length.mjs";

// FlatBuffers constructs a TextEncoder even when it only writes numbers.
// Supply its used encode() operation when a script host omits the Web API.
// Keep native implementations intact and bound the allocation before encoding.
if (typeof globalThis.TextEncoder !== "function") {
    globalThis.TextEncoder = class TextEncoder {
        get encoding() {
            return "utf-8";
        }
        encode(input = "") {
            const value = String(input),
                maximum = 2 * 1024 * 1024;
            const size = utf8Length(value, maximum);
            if (size > maximum) throw new RangeError("Weather string exceeds UTF-8 encoding limit");
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (let index = 0; index < value.length; index++) {
                let code = value.charCodeAt(index);
                if (code >= 0xd800 && code <= 0xdbff) {
                    const next = value.charCodeAt(index + 1);
                    if (next >= 0xdc00 && next <= 0xdfff) {
                        code = 0x10000 + ((code - 0xd800) << 10) + next - 0xdc00;
                        index++;
                    } else code = 0xfffd;
                } else if (code >= 0xdc00 && code <= 0xdfff) code = 0xfffd;
                if (code < 0x80) bytes[offset++] = code;
                else if (code < 0x800) {
                    bytes[offset++] = 0xc0 | (code >> 6);
                    bytes[offset++] = 0x80 | (code & 0x3f);
                } else if (code < 0x10000) {
                    bytes[offset++] = 0xe0 | (code >> 12);
                    bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
                    bytes[offset++] = 0x80 | (code & 0x3f);
                } else {
                    bytes[offset++] = 0xf0 | (code >> 18);
                    bytes[offset++] = 0x80 | ((code >> 12) & 0x3f);
                    bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
                    bytes[offset++] = 0x80 | (code & 0x3f);
                }
            }
            return bytes;
        }
    };
}
