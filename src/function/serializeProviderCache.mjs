// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
const EMPTY_CACHE_LENGTH = '{"version":1,"entries":[]}'.length;

// Count JSON string content in UTF-16 units without allocating an escaped copy.
// JSON.stringify escapes lone surrogates, but preserves valid surrogate pairs.
function escapedLength(value, maximum) {
    let length = value.length;
    for (let index = 0; index < value.length && length <= maximum; index++) {
        const code = value.charCodeAt(index);
        if (code === 0x22 || code === 0x5c) length++;
        else if (code < 0x20) length += code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 1 : 5;
        else if (code >= 0xd800 && code <= 0xdbff) {
            const next = value.charCodeAt(index + 1);
            if (next >= 0xdc00 && next <= 0xdfff) index++;
            else length += 5;
        } else if (code >= 0xdc00 && code <= 0xdfff) length += 5;
    }
    return length;
}

// Entries are the cache's already validated, ordered plain records. Keep the
// same prefix as serialize-and-pop, without materializing oversized snapshots.
export default function serializeProviderCache(entries, maximum) {
    const metadataLengths = entries.map(entry => JSON.stringify({ ...entry, body: "" }).length);
    const upperBound = entries.reduce((length, entry, index) => length + metadataLengths[index] + entry.body.length * 6 + (index ? 1 : 0), EMPTY_CACHE_LENGTH);
    if (upperBound > maximum) {
        let length = EMPTY_CACHE_LENGTH,
            count = 0;
        for (const entry of entries) {
            const metadataLength = metadataLengths[count] + (count ? 1 : 0),
                remaining = maximum - length - metadataLength;
            if (entry.body.length > remaining) break;
            const bodyLength = escapedLength(entry.body, remaining);
            if (bodyLength > remaining) break;
            length += metadataLength + bodyLength;
            count++;
        }
        entries.length = count;
    }
    return JSON.stringify({ version: 1, entries });
}
