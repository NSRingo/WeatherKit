import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";
import { readFlatBufferRootSlots, writeFlatBufferRootSlots } from "../src/function/flatBufferRootSlots.mjs";

test("root slot dictionary shares source bytes and assembles mixed arenas", () => {
    const originalBuilder = new Builder(256);
    const originalKnown = createLeaf(originalBuilder, 11, "known-old");
    const opaquePeriodic = createLeaf(originalBuilder, 66, "opaque-periodic");
    const opaqueLeaf = createLeaf(originalBuilder, 77, "opaque-nested-string");
    const opaqueTable = createContainer(originalBuilder, opaqueLeaf);
    originalBuilder.startObject(16);
    originalBuilder.addFieldOffset(0, originalKnown, 0);
    originalBuilder.addFieldOffset(12, opaquePeriodic, 0);
    originalBuilder.addFieldOffset(15, opaqueTable, 0);
    const originalRoot = originalBuilder.endObject();
    originalBuilder.finish(originalRoot);
    const originalBytes = originalBuilder.asUint8Array().slice();

    const dictionary = readFlatBufferRootSlots(new ByteBuffer(originalBytes));
    assert.equal(dictionary.slotCount, 16);
    assert.equal(dictionary.presentSlotCount, 3);
    assert.deepEqual(dictionary.failures, []);
    assert.deepEqual([...dictionary.slots.keys()], [0, 12, 15]);
    assert.equal(dictionary.slots.get(0).bytes, dictionary.slots.get(12).bytes);
    assert.equal(dictionary.slots.get(12).bytes, dictionary.slots.get(15).bytes);

    dictionary.slots.set(0, createLeafFrame(22, "known-new"));
    dictionary.slots.set(4, createLeafFrame(33, "added-slot"));
    const outputBytes = writeFlatBufferRootSlots(dictionary, 10);

    assert.notEqual(Buffer.from(outputBytes).indexOf(originalBytes), -1);
    const output = new ByteBuffer(outputBytes);
    const outputRoot = output.__indirect(output.position());
    const known = tableAt(output, outputRoot, 0);
    const added = tableAt(output, outputRoot, 4);
    const periodic = tableAt(output, outputRoot, 12);
    const opaque = tableAt(output, outputRoot, 15);
    const nestedOpaque = tableAt(output, opaque, 0);

    assert.deepEqual(readLeaf(output, known), { text: "known-new", value: 22 });
    assert.deepEqual(readLeaf(output, added), { text: "added-slot", value: 33 });
    assert.deepEqual(readLeaf(output, periodic), { text: "opaque-periodic", value: 66 });
    assert.deepEqual(readLeaf(output, nestedOpaque), { text: "opaque-nested-string", value: 77 });
});

test("root slot dictionary isolates a malformed slot and keeps readable slots", () => {
    const builder = new Builder(64);
    const valid = createLeaf(builder, 11, "valid");
    builder.startObject(2);
    builder.addFieldOffset(0, valid, 0);
    builder.addFieldInt32(1, 123, 0);
    const root = builder.endObject();
    builder.finish(root);

    const dictionary = readFlatBufferRootSlots(new ByteBuffer(builder.asUint8Array()));
    assert.equal(dictionary.presentSlotCount, 2);
    assert.deepEqual([...dictionary.slots.keys()], [0]);
    assert.equal(dictionary.failures.length, 1);
    assert.equal(dictionary.failures[0].id, 1);
    assert.match(dictionary.failures[0].error.message, /root slot 1 table/);

    const output = new ByteBuffer(writeFlatBufferRootSlots(dictionary, 2));
    const outputRoot = output.__indirect(output.position());
    assert.deepEqual(readLeaf(output, tableAt(output, outputRoot, 0)), { text: "valid", value: 11 });
    assert.equal(tableAt(output, outputRoot, 1), 0);
});

test("root slot dictionary rejects an unreadable root table", () => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setUint32(0, 64, true);
    assert.throws(() => readFlatBufferRootSlots(new ByteBuffer(bytes)), /root table is outside/);
});

function createLeafFrame(value, text) {
    const builder = new Builder(64);
    const root = createLeaf(builder, value, text);
    builder.finish(root);
    const bytes = builder.asUint8Array();
    const byteBuffer = new ByteBuffer(bytes);
    return {
        bytes,
        tablePosition: byteBuffer.position() + byteBuffer.readUint32(byteBuffer.position()),
    };
}

function createLeaf(builder, value, text) {
    const textOffset = builder.createString(text);
    builder.startObject(2);
    builder.addFieldInt32(0, value, 0);
    builder.addFieldOffset(1, textOffset, 0);
    return builder.endObject();
}

function createContainer(builder, nestedOffset) {
    builder.startObject(1);
    builder.addFieldOffset(0, nestedOffset, 0);
    return builder.endObject();
}

function tableAt(byteBuffer, table, slot) {
    const fieldOffset = byteBuffer.__offset(table, 4 + slot * 2);
    return fieldOffset ? byteBuffer.__indirect(table + fieldOffset) : 0;
}

function readLeaf(byteBuffer, table) {
    const valueOffset = byteBuffer.__offset(table, 4);
    const textOffset = byteBuffer.__offset(table, 6);
    return {
        text: textOffset ? byteBuffer.__string(table + textOffset) : null,
        value: valueOffset ? byteBuffer.readInt32(table + valueOffset) : 0,
    };
}
