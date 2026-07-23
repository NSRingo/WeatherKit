import { Builder, ByteBuffer } from "flatbuffers";

const ROOT_OFFSET_SIZE = 4;
const VTABLE_HEADER_SIZE = 4;
const VTABLE_ENTRY_SIZE = 2;
const OFFSET_FIELD_SIZE = 4;
const MAX_SCALAR_ALIGNMENT = 8;

/**
 * @typedef {object} SlotBinary
 * @property {Uint8Array} bytes 二进制 arena / Binary arena.
 * @property {number} tablePosition 产品表相对 arena 起点的位置 / Product table position relative to the arena start.
 */

/**
 * @typedef {object} RootSlotFailure
 * @property {number} id 根 slot ID / Root slot ID.
 * @property {Error} error 读取失败 / Read failure.
 */

/**
 * @typedef {object} RootSlotDictionary
 * @property {number} slotCount 根表声明的 slot 数量 / Slot count declared by the root table.
 * @property {number} presentSlotCount 根表中实际存在的 slot 数量 / Number of physically present root slots.
 * @property {Map<number, SlotBinary>} slots 有效 slot 字典 / Valid slot dictionary.
 * @property {RootSlotFailure[]} failures 可隔离的 slot 读取失败 / Isolated slot read failures.
 */

/**
 * 顺序读取 FlatBuffer 根表并生成共享二进制 arena 的 slot 字典。
 * Read a FlatBuffer root table sequentially into a slot dictionary sharing one binary arena.
 * @param {import("flatbuffers").ByteBuffer} source - 原始 FlatBuffer / Source FlatBuffer.
 * @returns {RootSlotDictionary} 根 slot 字典与逐 slot 失败报告 / Root slot dictionary and per-slot failure report.
 */
export function readFlatBufferRootSlots(source) {
    const sourceStart = source.position();
    const sourceEnd = source.capacity();
    ensureRange(sourceStart, ROOT_OFFSET_SIZE, sourceStart, sourceEnd, "root offset");

    const rootPosition = sourceStart + source.readUint32(sourceStart);
    const rootTable = inspectTable(source, rootPosition, sourceStart, sourceEnd, "root table");
    const slotCount = (rootTable.vtableLength - VTABLE_HEADER_SIZE) / VTABLE_ENTRY_SIZE;
    const bytes = source.bytes().subarray(sourceStart, sourceEnd);
    const slots = new Map();
    const failures = [];
    let presentSlotCount = 0;

    for (let id = 0; id < slotCount; id++) {
        const fieldOffset = source.readUint16(rootTable.vtablePosition + VTABLE_HEADER_SIZE + id * VTABLE_ENTRY_SIZE);
        if (fieldOffset === 0) continue;
        presentSlotCount++;

        try {
            if (fieldOffset < ROOT_OFFSET_SIZE || fieldOffset + OFFSET_FIELD_SIZE > rootTable.objectLength) {
                throw new Error(`root slot ${id} has an invalid field offset: ${fieldOffset}`);
            }

            const fieldPosition = rootPosition + fieldOffset;
            ensureRange(fieldPosition, OFFSET_FIELD_SIZE, sourceStart, sourceEnd, `root slot ${id}`);
            const relativeOffset = source.readUint32(fieldPosition);
            if (relativeOffset === 0) throw new Error(`root slot ${id} has a null table offset`);

            const tablePosition = fieldPosition + relativeOffset;
            inspectTable(source, tablePosition, sourceStart, sourceEnd, `root slot ${id} table`);
            slots.set(id, { bytes, tablePosition: tablePosition - sourceStart });
        } catch (error) {
            failures.push({ id, error: error instanceof Error ? error : new Error(String(error)) });
        }
    }

    return { failures, presentSlotCount, slotCount, slots };
}

/**
 * 将多个 SlotBinary arena 去重嵌入并重新组装为完整根表。
 * Embed unique SlotBinary arenas and reassemble them into a complete root table.
 * @param {RootSlotDictionary} dictionary - 待组装的根 slot 字典 / Root slot dictionary to assemble.
 * @param {number} [schemaSlotCount=0] - 当前 schema 的根 slot 数 / Current schema root slot count.
 * @returns {Uint8Array} 完整 FlatBuffer / Complete FlatBuffer.
 */
export function writeFlatBufferRootSlots(dictionary, schemaSlotCount = 0) {
    if (!dictionary || !(dictionary.slots instanceof Map)) throw new TypeError("FlatBuffer root slot dictionary must contain a slots Map");
    if (!Number.isSafeInteger(dictionary.slotCount) || dictionary.slotCount < 0) throw new RangeError(`Invalid FlatBuffer root slot count: ${dictionary.slotCount}`);
    if (!Number.isSafeInteger(schemaSlotCount) || schemaSlotCount < 0) throw new RangeError(`Invalid FlatBuffer schema slot count: ${schemaSlotCount}`);

    const builder = new Builder();
    const arenaOffsets = new Map();
    const tableOffsets = new Map();
    let slotCount = Math.max(dictionary.slotCount, schemaSlotCount);

    for (const [id, frame] of [...dictionary.slots].sort(([left], [right]) => left - right)) {
        if (!Number.isSafeInteger(id) || id < 0) throw new RangeError(`Invalid FlatBuffer root slot: ${id}`);
        if (!frame || !(frame.bytes instanceof Uint8Array)) throw new TypeError(`FlatBuffer root slot ${id} must contain Uint8Array bytes`);
        if (!Number.isSafeInteger(frame.tablePosition)) throw new RangeError(`Invalid FlatBuffer root slot ${id} table position: ${frame.tablePosition}`);

        const frameBuffer = new ByteBuffer(frame.bytes);
        inspectTable(frameBuffer, frame.tablePosition, 0, frame.bytes.length, `root slot ${id} table`);

        let arenaStartOffset = arenaOffsets.get(frame.bytes);
        if (arenaStartOffset === undefined) {
            builder.startVector(1, frame.bytes.length, MAX_SCALAR_ALIGNMENT);
            for (let index = frame.bytes.length - 1; index >= 0; index--) builder.writeInt8(frame.bytes[index]);
            arenaStartOffset = builder.endVector() - OFFSET_FIELD_SIZE;
            arenaOffsets.set(frame.bytes, arenaStartOffset);
        }

        tableOffsets.set(id, arenaStartOffset - frame.tablePosition);
        slotCount = Math.max(slotCount, id + 1);
    }

    builder.startObject(slotCount);
    for (const [id, offset] of [...tableOffsets].sort(([left], [right]) => left - right)) builder.addFieldOffset(id, offset, 0);
    const root = builder.endObject();
    builder.finish(root);
    return builder.asUint8Array();
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
