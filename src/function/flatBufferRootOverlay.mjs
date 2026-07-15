const ROOT_OFFSET_SIZE = 4;
const VTABLE_HEADER_SIZE = 4;
const VTABLE_ENTRY_SIZE = 2;
const OFFSET_FIELD_SIZE = 4;
const MAX_SCALAR_ALIGNMENT = 8;

/**
 * Seed a FlatBuffers Builder with an existing buffer and return a root-table
 * copy-on-write context.
 *
 * The source bytes stay together in an aligned Builder payload, so their
 * relative offsets remain valid. Encode replacement tables with the same
 * Builder, then pass their offsets to createRoot as
 * Map<rootSlot, builderOffset>.
 *
 * @param {import("flatbuffers").Builder} builder
 * @param {import("flatbuffers").ByteBuffer} source
 */
export default function seedFlatBufferRootOverlay(builder, source) {
    if (builder.offset() !== 0) throw new Error("FlatBuffer root overlay must seed an empty Builder");

    const root = inspectOffsetTableRoot(source);
    const sourceBytes = source.bytes().subarray(root.sourceStart).slice();
    const sourceLength = sourceBytes.length;

    // Store the original buffer as an aligned byte vector. The vector prefix is
    // intentionally unreachable; its payload is an opaque object graph whose
    // internal relative offsets remain valid after the constant relocation.
    builder.startVector(1, sourceLength, MAX_SCALAR_ALIGNMENT);
    for (let index = sourceLength - 1; index >= 0; index--) builder.writeInt8(sourceBytes[index]);
    const sourceVectorOffset = builder.endVector();
    const sourceStartOffset = sourceVectorOffset - OFFSET_FIELD_SIZE;

    const opaqueOffsets = new Map(root.presentSlots.map(({ slot, tablePosition }) => [slot, sourceStartOffset - (tablePosition - root.sourceStart)]));

    return {
        presentSlots: new Set(opaqueOffsets.keys()),
        sourceSlotCount: root.slotCount,

        /**
         * Create a new root table that points to the untouched source tables
         * unless a replacement Builder offset is provided for that slot.
         *
         * @param {Map<number, number>} replacements
         * @returns {number} root table offset for Builder.finish()
         */
        createRoot(replacements = new Map()) {
            if (!(replacements instanceof Map)) throw new TypeError("FlatBuffer root replacements must be a Map");

            let slotCount = root.slotCount;
            for (const [slot, offset] of replacements) {
                if (!Number.isSafeInteger(slot) || slot < 0) throw new RangeError(`Invalid FlatBuffer root slot: ${slot}`);
                if (!Number.isSafeInteger(offset) || offset <= 0 || offset > builder.offset()) throw new RangeError(`Invalid Builder offset for root slot ${slot}: ${offset}`);
                slotCount = Math.max(slotCount, slot + 1);
            }

            builder.startObject(slotCount);
            for (let slot = 0; slot < slotCount; slot++) {
                const offset = replacements.get(slot) ?? opaqueOffsets.get(slot);
                if (offset) builder.addFieldOffset(slot, offset, 0);
            }
            return builder.endObject();
        },
    };
}

function inspectOffsetTableRoot(source) {
    const sourceStart = source.position();
    const sourceEnd = source.capacity();
    ensureRange(sourceStart, ROOT_OFFSET_SIZE, sourceStart, sourceEnd, "root offset");

    const rootPosition = sourceStart + source.readUint32(sourceStart);
    const rootTable = inspectTable(source, rootPosition, sourceStart, sourceEnd, "root table");
    const slotCount = (rootTable.vtableLength - VTABLE_HEADER_SIZE) / VTABLE_ENTRY_SIZE;
    const presentSlots = [];

    for (let slot = 0; slot < slotCount; slot++) {
        const fieldOffset = source.readUint16(rootTable.vtablePosition + VTABLE_HEADER_SIZE + slot * VTABLE_ENTRY_SIZE);
        if (fieldOffset === 0) continue;
        if (fieldOffset < ROOT_OFFSET_SIZE || fieldOffset + OFFSET_FIELD_SIZE > rootTable.objectLength) {
            throw new Error(`FlatBuffer root slot ${slot} has an invalid field offset: ${fieldOffset}`);
        }

        const fieldPosition = rootPosition + fieldOffset;
        ensureRange(fieldPosition, OFFSET_FIELD_SIZE, sourceStart, sourceEnd, `root slot ${slot}`);
        const relativeOffset = source.readUint32(fieldPosition);
        if (relativeOffset === 0) throw new Error(`FlatBuffer root slot ${slot} has a null table offset`);

        const tablePosition = fieldPosition + relativeOffset;
        inspectTable(source, tablePosition, sourceStart, sourceEnd, `root slot ${slot} table`);
        presentSlots.push({ slot, tablePosition });
    }

    return { presentSlots, slotCount, sourceStart };
}

function inspectTable(source, tablePosition, sourceStart, sourceEnd, label) {
    ensureRange(tablePosition, ROOT_OFFSET_SIZE, sourceStart, sourceEnd, label);
    const vtablePosition = tablePosition - source.readInt32(tablePosition);
    ensureRange(vtablePosition, VTABLE_HEADER_SIZE, sourceStart, sourceEnd, `${label} vtable`);

    const vtableLength = source.readUint16(vtablePosition);
    const objectLength = source.readUint16(vtablePosition + VTABLE_ENTRY_SIZE);
    if (vtableLength < VTABLE_HEADER_SIZE || vtableLength % VTABLE_ENTRY_SIZE !== 0) {
        throw new Error(`${label} has an invalid vtable length: ${vtableLength}`);
    }
    if (objectLength < ROOT_OFFSET_SIZE) throw new Error(`${label} has an invalid object length: ${objectLength}`);

    ensureRange(vtablePosition, vtableLength, sourceStart, sourceEnd, `${label} vtable`);
    ensureRange(tablePosition, objectLength, sourceStart, sourceEnd, label);
    return { objectLength, vtableLength, vtablePosition };
}

function ensureRange(position, length, start, end, label) {
    if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < start || length < 0 || position + length > end) {
        throw new Error(`${label} is outside the FlatBuffer`);
    }
}
