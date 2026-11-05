// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Count UTF-8 bytes without allocating another full body or requiring TextEncoder.
export default function utf8Length(value, maximum = Number.POSITIVE_INFINITY) {
    let size = 0;
    for (let index = 0; index < value.length; index++) {
        const code = value.charCodeAt(index);
        if (code < 128) size++;
        else if (code < 2048) size += 2;
        else if (code >= 0xd800 && code <= 0xdbff && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
            size += 4;
            index++;
        } else size += 3;
        if (size > maximum) return size;
    }
    return size;
}
