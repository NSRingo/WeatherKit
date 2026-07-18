import assert from "node:assert/strict";
import { Builder, ByteBuffer } from "flatbuffers";
import WeatherKit2 from "../src/class/WeatherKit2.mjs";
import * as WK2 from "@nsringo/weatherkit";

const uuidBytesMap = new Map([
    ["c3c8fd10-dbc6-5ad5-a042-47b30db85c4b", { bytes: [195, 200, 253, 16, 219, 198, 90, 213, 160, 66, 71, 179, 13, 184, 92, 75] }],
    ["4cc28d08-ad7f-56ff-aee9-ec80320b1197", { bytes: [76, 194, 141, 8, 173, 127, 86, 255, 174, 233, 236, 128, 50, 11, 17, 151] }],
    ["ae6edb49-8c68-5c48-886b-16fd5f83b933", { bytes: [174, 110, 219, 73, 140, 104, 92, 72, 136, 107, 22, 253, 95, 131, 185, 51] }],
]);

function bytesToUuidString(bytes) {
    assert.equal(bytes?.length, 16, "UUID bytes length must be 16");
    const hex = Array.from(bytes)
        .map(n => n.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

for (const [uuid, bytesObject] of uuidBytesMap) {
    const { bytes } = bytesObject;
    const canonicalUuid = uuid.toLowerCase();
    const expectedEntry = [canonicalUuid, bytesObject];

    // Forward: compare whole key-value entry
    const forwardEntry = [canonicalUuid, WeatherKit2.uuidStringToBytesObject(canonicalUuid)];
    assert.deepStrictEqual(forwardEntry, expectedEntry);

    // Forward: UUID string -> bytes
    assert.deepStrictEqual(Array.from(WeatherKit2.toUuidBytes(canonicalUuid) || []), bytes);

    // Reverse: compare whole key-value entry
    const reverseEntryByHelper = [WeatherKit2.uuidBytesObjectToString(bytesObject), { bytes: Array.from(WeatherKit2.toUuidBytes(bytesObject) || []) }];
    assert.deepStrictEqual(reverseEntryByHelper, expectedEntry);
    const reverseEntryByLocal = [bytesToUuidString(bytes), { bytes }];
    assert.deepStrictEqual(reverseEntryByLocal, expectedEntry);

    // toUuidBytes should accept all bytes input forms
    assert.deepStrictEqual(Array.from(WeatherKit2.toUuidBytes(bytes) || []), bytes);
    assert.deepStrictEqual(Array.from(WeatherKit2.toUuidBytes({ bytes }) || []), bytes);
    assert.deepStrictEqual(Array.from(WeatherKit2.toUuidBytes(new Uint8Array(bytes)) || []), bytes);

    // decodeUuid should normalize UUID container to UUID string
    assert.equal(WeatherKit2.decodeUuid(bytesObject), canonicalUuid);
    assert.equal(WeatherKit2.decodeUuid(new Uint8Array(bytes)), canonicalUuid);

    // FlatBuffer round-trip from UUID string
    const builderFromUuid = new Builder(64);
    const uuidOffset = WeatherKit2.createUuidOffset(builderFromUuid, canonicalUuid);
    assert.ok(uuidOffset, `UUID offset should be created for ${canonicalUuid}`);
    builderFromUuid.finish(uuidOffset);
    const byteBufferFromUuid = new ByteBuffer(builderFromUuid.asUint8Array());
    const uuidFromBuffer = WK2.UUID.getRootAsUUID(byteBufferFromUuid);
    const roundtripBytesFromUuid = Array.from(uuidFromBuffer.bytesArray() || []);
    const roundtripEntryFromUuid = [bytesToUuidString(roundtripBytesFromUuid), { bytes: roundtripBytesFromUuid }];
    assert.deepStrictEqual(roundtripEntryFromUuid, expectedEntry);

    // FlatBuffer round-trip from bytes object
    const builderFromBytes = new Builder(64);
    const uuidOffsetFromBytes = WeatherKit2.createUuidOffset(builderFromBytes, { bytes });
    assert.ok(uuidOffsetFromBytes, `UUID offset should be created from bytes for ${canonicalUuid}`);
    builderFromBytes.finish(uuidOffsetFromBytes);
    const byteBufferFromBytes = new ByteBuffer(builderFromBytes.asUint8Array());
    const uuidFromBytesBuffer = WK2.UUID.getRootAsUUID(byteBufferFromBytes);
    const roundtripBytesFromBytes = Array.from(uuidFromBytesBuffer.bytesArray() || []);
    const roundtripEntryFromBytes = [bytesToUuidString(roundtripBytesFromBytes), { bytes: roundtripBytesFromBytes }];
    assert.deepStrictEqual(roundtripEntryFromBytes, expectedEntry);
}

console.log("UUID conversion test passed ✔️");
