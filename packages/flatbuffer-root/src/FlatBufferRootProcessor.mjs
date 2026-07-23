import { Console } from "@nsnanocat/util";
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
 * @typedef {object} FlatBufferRootCodec
 * @property {new () => {__init(position: number, byteBuffer: ByteBuffer): unknown}} tableClass 产品表生成类 / Generated product table class.
 * @property {(table: unknown) => unknown} decode 产品表解码器 / Product table decoder.
 * @property {(builder: Builder, json: unknown) => number} encode 产品表编码器 / Product table encoder.
 */

/**
 * @typedef {object} FlatBufferRootProcessorOptions
 * @property {string} name 处理器名称和日志前缀 / Processor name and log prefix.
 * @property {Function} rootClass FlatBuffers 生成的根表类 / Generated FlatBuffers root table class.
 * @property {Readonly<Record<string, FlatBufferRootCodec>>} codecs 按根 accessor 名称注册的 codec / Codecs keyed by root accessor name.
 * @property {readonly string[]} configurableRootNames 受业务开关控制的根名称 / Root names controlled by business settings.
 */

/**
 * 使用生成的根表类配置 FlatBuffer 根 slot 编解码流程。
 * Configure FlatBuffer root-slot encoding and decoding with a generated root table class.
 */
export class FlatBufferRootProcessor {
    #name;
    #fields;
    #fieldsById;
    #fieldsByName;
    #configurableRootNames;

    /**
     * 创建并验证根表处理器配置。
     * Create and validate a root table processor configuration.
     * @param {FlatBufferRootProcessorOptions} options - 根表模型、codec 和运行期策略 / Root model, codecs, and runtime policy.
     */
    constructor(options) {
        if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("FlatBufferRootProcessor options must be an object");

        try {
            if (typeof options.name !== "string" || options.name.length === 0) throw new TypeError("FlatBufferRootProcessor name must be a non-empty string");
            if (typeof options.rootClass !== "function" || !options.rootClass.prototype || typeof options.rootClass.prototype.__init !== "function") {
                throw new TypeError(`${options.name} rootClass must be a generated FlatBuffers table class`);
            }
            if (!options.codecs || typeof options.codecs !== "object" || Array.isArray(options.codecs)) {
                throw new TypeError(`${options.name} codecs must be an object`);
            }
            if (!Array.isArray(options.configurableRootNames)) throw new TypeError(`${options.name} configurableRootNames must be an array`);

            const rootNames = Object.getOwnPropertyNames(options.rootClass.prototype).filter(name => !["constructor", "__init"].includes(name));
            for (const rootName of rootNames) {
                if (typeof options.rootClass.prototype[rootName] !== "function") throw new TypeError(`${options.name} root accessor ${rootName} must be a function`);
                const suffix = `${rootName[0].toUpperCase()}${rootName.slice(1)}`;
                if (typeof options.rootClass[`add${suffix}`] !== "function") throw new TypeError(`${options.name} root accessor ${rootName} has no matching add${suffix}`);
            }

            const rootNameSet = new Set(rootNames);
            const codecs = new Map();
            for (const rootName of Object.keys(options.codecs)) {
                if (!rootNameSet.has(rootName)) throw new RangeError(`${options.name} codec ${rootName} is not a root accessor`);
                const codec = options.codecs[rootName];
                if (!codec || typeof codec !== "object" || Array.isArray(codec)) throw new TypeError(`${options.name} codec ${rootName} must be an object`);
                if (typeof codec.tableClass !== "function" || !codec.tableClass.prototype || typeof codec.tableClass.prototype.__init !== "function") {
                    throw new TypeError(`${options.name} codec ${rootName} tableClass must be a generated FlatBuffers table class`);
                }
                if (typeof codec.decode !== "function") throw new TypeError(`${options.name} codec ${rootName} must provide decode`);
                if (typeof codec.encode !== "function") throw new TypeError(`${options.name} codec ${rootName} must provide encode`);
                codecs.set(rootName, Object.freeze({ decode: codec.decode, encode: codec.encode, tableClass: codec.tableClass }));
            }

            const configurableRootNames = new Set();
            for (const rootName of options.configurableRootNames) {
                if (typeof rootName !== "string" || rootName.length === 0) throw new TypeError(`${options.name} configurableRootNames must contain non-empty strings`);
                if (!rootNameSet.has(rootName)) throw new RangeError(`${options.name} configurable root ${rootName} is not a root accessor`);
                if (configurableRootNames.has(rootName)) throw new RangeError(`${options.name} configurable root ${rootName} is duplicated`);
                configurableRootNames.add(rootName);
            }

            const fields = rootNames.map((name, id) => Object.freeze({ codec: codecs.get(name), id, name }));
            this.#name = options.name;
            this.#fields = Object.freeze(fields);
            this.#fieldsById = new Map(fields.map(field => [field.id, field]));
            this.#fieldsByName = new Map(fields.map(field => [field.name, field]));
            this.#configurableRootNames = configurableRootNames;
        } catch (error) {
            Console.error(`${typeof options.name === "string" && options.name ? options.name : "FlatBufferRootProcessor"}.configure`, error);
            throw error;
        }
    }

    /**
     * 根据处理器配置过滤受业务开关控制的根名称。
     * Filter root names controlled by the processor's business configuration.
     * @param {string[]} requestedRootNames - 原请求中的根名称 / Root names from the original request.
     * @param {string[]} enabledRootNames - 当前启用的根名称 / Currently enabled root names.
     * @returns {string[]} 保持原顺序的过滤结果 / Filtered names preserving their original order.
     */
    filterRootNames(requestedRootNames, enabledRootNames) {
        try {
            this.#assertStringArray(requestedRootNames, "requestedRootNames");
            this.#assertStringArray(enabledRootNames, "enabledRootNames");
            const enabled = new Set(enabledRootNames);
            return requestedRootNames.filter(rootName => !this.#configurableRootNames.has(rootName) || enabled.has(rootName));
        } catch (error) {
            Console.error(`${this.#name}.filterRootNames`, error);
            throw error;
        }
    }

    /**
     * 按物理 slot 顺序解码选中的根产品。
     * Decode selected root products in physical slot order.
     * @param {ByteBuffer} byteBuffer - 原始 FlatBuffer / Source FlatBuffer.
     * @param {string[]} [rootNames=[]] - 要解码的根名称 / Root names to decode.
     * @returns {Record<string, unknown>} 已成功解码的根对象 / Successfully decoded root objects.
     */
    decode(byteBuffer, rootNames = []) {
        try {
            this.#assertStringArray(rootNames, "rootNames");
        } catch (error) {
            Console.error(`${this.#name}.decode`, error);
            throw error;
        }

        const requested = new Set(rootNames);
        const json = {};
        let dictionary;
        try {
            dictionary = this.#readRootSlots(byteBuffer);
        } catch (error) {
            Console.error(`${this.#name}.decode`, error);
            throw error;
        }
        const slotReport = this.#logSlotDictionary("decode", dictionary);

        const presentIds = new Set([...dictionary.slots.keys(), ...dictionary.failures.map(failure => failure.id)]);
        const unknownRequested = [...requested].filter(name => {
            const field = this.#fieldsByName.get(name);
            return !field || !field.codec;
        });
        const missing = [...requested].filter(name => {
            const field = this.#fieldsByName.get(name);
            if (!field) return false;
            return Boolean(field.codec) && !presentIds.has(field.id);
        });
        const failures = dictionary.failures
            .filter(({ id }) => {
                const field = this.#fieldsById.get(id);
                if (!field) return false;
                return Boolean(field.codec) && requested.has(field.name);
            })
            .map(({ id, error }) => `${this.#slotLabel(id)}(${error.message})`);
        let parsed = 0;

        for (const [id, frame] of [...dictionary.slots].sort(([left], [right]) => left - right)) {
            const field = this.#fieldsById.get(id);
            if (!field || !field.codec || !requested.has(field.name)) continue;

            try {
                const table = new field.codec.tableClass().__init(frame.tablePosition, new ByteBuffer(frame.bytes));
                json[field.name] = field.codec.decode(table);
                parsed++;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failures.push(`${this.#slotLabel(id)}(${message})`);
            }
        }

        const unknown = slotReport.unknownLabels;
        const message = `${this.#name}.decode.parse：已知 ${slotReport.knownCount}/${dictionary.presentSlotCount}，解析 ${parsed}/${dictionary.presentSlotCount}，失败 ${failures.length}/${dictionary.presentSlotCount}，未知 ${unknown.length}/${dictionary.presentSlotCount}；失败=[${failures.join(", ")}]；未知=[${unknown.join(", ")}]；请求未知=[${unknownRequested.join(", ")}]；缺失=[${missing.join(", ")}]`;
        if (failures.length || unknown.length || unknownRequested.length) Console.warn(message);
        else Console.debug(message);
        return json;
    }

    /**
     * 独立编译 patch slot，并与原始根表合并组装。
     * Compile patch slots independently and merge them into the source root table.
     * @param {ByteBuffer | undefined} [byteBuffer=undefined] - 原始 FlatBuffer；省略时创建新根表 / Source FlatBuffer; omit to create a new root table.
     * @param {Record<string, unknown>} [patch={}] - 按根名称组织的实际修改 / Actual changes keyed by root name.
     * @returns {Uint8Array} 完整 FlatBuffer / Complete FlatBuffer.
     */
    encode(byteBuffer = undefined, patch = {}) {
        if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
            const error = new TypeError(`${this.#name}.encode patch must be an object`);
            Console.error(`${this.#name}.encode`, error);
            throw error;
        }

        const patchKeys = Object.keys(patch);
        const compiled = new Map();
        const failures = [];
        const unknown = [];
        let known = 0;

        for (const name of patchKeys) {
            const field = this.#fieldsByName.get(name);
            if (!field || !field.codec) {
                unknown.push(name);
                continue;
            }
            known++;

            try {
                const data = patch[name];
                if (!data || typeof data !== "object" || Array.isArray(data)) throw new TypeError(`${name} must be an object`);

                const builder = new Builder();
                const tableOffset = field.codec.encode(builder, data);
                if (!Number.isSafeInteger(tableOffset) || tableOffset <= 0) throw new Error(`${name} codec did not produce a table`);
                builder.finish(tableOffset);

                const bytes = builder.asUint8Array();
                const frameBuffer = new ByteBuffer(bytes);
                const tablePosition = frameBuffer.position() + frameBuffer.readUint32(frameBuffer.position());
                compiled.set(field.id, { bytes, tablePosition });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failures.push(`${this.#slotLabel(field.id)}(${message})`);
            }
        }

        const compileMessage = `${this.#name}.encode.compile：已知 ${known}/${patchKeys.length}，编译 ${compiled.size}/${patchKeys.length}，失败 ${failures.length}/${patchKeys.length}，未知 ${unknown.length}/${patchKeys.length}；失败=[${failures.join(", ")}]；未知=[${unknown.join(", ")}]`;
        if (failures.length || unknown.length) Console.warn(compileMessage);
        else Console.debug(compileMessage);

        let sourceDictionary;
        if (byteBuffer !== undefined) {
            try {
                sourceDictionary = this.#readRootSlots(byteBuffer);
            } catch (error) {
                Console.error(`${this.#name}.encode`, error);
                throw error;
            }
        } else {
            sourceDictionary = { failures: [], presentSlotCount: 0, slotCount: 0, slots: new Map() };
        }
        this.#logSlotDictionary("encode", sourceDictionary);

        if (byteBuffer !== undefined && compiled.size === 0) {
            return byteBuffer.bytes().subarray(byteBuffer.position(), byteBuffer.capacity());
        }

        const slots = new Map(sourceDictionary.slots);
        for (const [id, frame] of compiled) slots.set(id, frame);

        try {
            const rawBody = this.#writeRootSlots(
                {
                    failures: [],
                    presentSlotCount: slots.size,
                    slotCount: sourceDictionary.slotCount,
                    slots,
                },
                this.#fields.length,
            );
            Console.debug(`${this.#name}.encode.assemble：输出 ${slots.size} 个 slot，替换 ${compiled.size} 个 slot`);
            return rawBody;
        } catch (error) {
            Console.error(`${this.#name}.encode`, error);
            throw error;
        }
    }

    /**
     * 校验字符串数组 API 契约。
     * Validate a string-array API contract.
     * @param {unknown} value - 待校验值 / Value to validate.
     * @param {string} label - 参数名称 / Parameter name.
     * @returns {void}
     */
    #assertStringArray(value, label) {
        if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new TypeError(`${this.#name}.${label} must be an array of strings`);
    }

    /**
     * 顺序扫描根 vtable，并让所有有效 slot 共享原始 arena。
     * Scan the root vtable sequentially while sharing the source arena across valid slots.
     * @param {ByteBuffer} source - 原始 FlatBuffer / Source FlatBuffer.
     * @returns {RootSlotDictionary} 根 slot 字典 / Root slot dictionary.
     */
    #readRootSlots(source) {
        if (!source || typeof source.position !== "function" || typeof source.capacity !== "function" || typeof source.bytes !== "function") {
            throw new TypeError(`${this.#name} source must be a FlatBuffers ByteBuffer`);
        }

        const sourceStart = source.position();
        const sourceEnd = source.capacity();
        this.#ensureRange(sourceStart, ROOT_OFFSET_SIZE, sourceStart, sourceEnd, "root offset");

        const rootPosition = sourceStart + source.readUint32(sourceStart);
        const rootTable = this.#inspectTable(source, rootPosition, sourceStart, sourceEnd, "root table");
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
                this.#ensureRange(fieldPosition, OFFSET_FIELD_SIZE, sourceStart, sourceEnd, `root slot ${id}`);
                const relativeOffset = source.readUint32(fieldPosition);
                if (relativeOffset === 0) throw new Error(`root slot ${id} has a null table offset`);

                const tablePosition = fieldPosition + relativeOffset;
                this.#inspectTable(source, tablePosition, sourceStart, sourceEnd, `root slot ${id} table`);
                slots.set(id, { bytes, tablePosition: tablePosition - sourceStart });
            } catch (error) {
                failures.push({ id, error: error instanceof Error ? error : new Error(String(error)) });
            }
        }

        return { failures, presentSlotCount, slotCount, slots };
    }

    /**
     * 将唯一 arena 嵌入一次，并重新组装根表。
     * Embed each unique arena once and reassemble the root table.
     * @param {RootSlotDictionary} dictionary - 待组装字典 / Dictionary to assemble.
     * @param {number} schemaSlotCount - 当前模型的根 slot 数 / Root slot count of the current model.
     * @returns {Uint8Array} 完整 FlatBuffer / Complete FlatBuffer.
     */
    #writeRootSlots(dictionary, schemaSlotCount) {
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
            this.#inspectTable(frameBuffer, frame.tablePosition, 0, frame.bytes.length, `root slot ${id} table`);

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

    /**
     * 校验 table 与 vtable 边界。
     * Validate table and vtable boundaries.
     * @param {ByteBuffer} source - FlatBuffer / FlatBuffer.
     * @param {number} tablePosition - table 位置 / Table position.
     * @param {number} sourceStart - arena 起点 / Arena start.
     * @param {number} sourceEnd - arena 终点 / Arena end.
     * @param {string} label - 错误标签 / Error label.
     * @returns {{objectLength: number, vtableLength: number, vtablePosition: number}} table 元数据 / Table metadata.
     */
    #inspectTable(source, tablePosition, sourceStart, sourceEnd, label) {
        this.#ensureRange(tablePosition, ROOT_OFFSET_SIZE, sourceStart, sourceEnd, label);
        const vtablePosition = tablePosition - source.readInt32(tablePosition);
        this.#ensureRange(vtablePosition, VTABLE_HEADER_SIZE, sourceStart, sourceEnd, `${label} vtable`);

        const vtableLength = source.readUint16(vtablePosition);
        const objectLength = source.readUint16(vtablePosition + VTABLE_ENTRY_SIZE);
        if (vtableLength < VTABLE_HEADER_SIZE || vtableLength % VTABLE_ENTRY_SIZE !== 0) {
            throw new Error(`${label} has an invalid vtable length: ${vtableLength}`);
        }
        if (objectLength < ROOT_OFFSET_SIZE) throw new Error(`${label} has an invalid object length: ${objectLength}`);

        this.#ensureRange(vtablePosition, vtableLength, sourceStart, sourceEnd, `${label} vtable`);
        this.#ensureRange(tablePosition, objectLength, sourceStart, sourceEnd, label);
        return { objectLength, vtableLength, vtablePosition };
    }

    /**
     * 校验二进制读取范围。
     * Validate a binary read range.
     * @param {number} position - 起点 / Start position.
     * @param {number} length - 长度 / Length.
     * @param {number} start - arena 起点 / Arena start.
     * @param {number} end - arena 终点 / Arena end.
     * @param {string} label - 错误标签 / Error label.
     * @returns {void}
     */
    #ensureRange(position, length, start, end, label) {
        if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < start || length < 0 || position + length > end) {
            throw new Error(`${label} is outside the FlatBuffer`);
        }
    }

    /**
     * 汇总 slot 字典读取结果。
     * Summarize a root-slot dictionary read.
     * @param {"encode" | "decode"} operation - 操作名称 / Operation name.
     * @param {RootSlotDictionary} dictionary - 根 slot 字典 / Root slot dictionary.
     * @returns {{knownCount: number, unknownLabels: string[]}} 后续解析统计 / Statistics for the parse phase.
     */
    #logSlotDictionary(operation, dictionary) {
        const ids = [...dictionary.slots.keys(), ...dictionary.failures.map(failure => failure.id)].sort((left, right) => left - right);
        const knownCount = ids.filter(id => {
            const field = this.#fieldsById.get(id);
            if (!field) return false;
            return Boolean(field.codec);
        }).length;
        const unknownLabels = ids
            .filter(id => {
                const field = this.#fieldsById.get(id);
                return !field || !field.codec;
            })
            .map(id => this.#slotLabel(id));
        const failureLabels = dictionary.failures.map(({ id, error }) => `${this.#slotLabel(id)}(${error.message})`);
        const message = `${this.#name}.${operation}.slots：已知 ${knownCount}/${dictionary.presentSlotCount}，读取 ${dictionary.slots.size}/${dictionary.presentSlotCount}，失败 ${failureLabels.length}/${dictionary.presentSlotCount}，未知 ${unknownLabels.length}/${dictionary.presentSlotCount}；失败=[${failureLabels.join(", ")}]；未知=[${unknownLabels.join(", ")}]`;
        if (failureLabels.length || unknownLabels.length) Console.warn(message);
        else Console.debug(message);
        return { knownCount, unknownLabels };
    }

    /**
     * 将 slot ID 格式化为模型名称或物理编号。
     * Format a slot ID as a model name or physical identifier.
     * @param {number} id - 根 slot ID / Root slot ID.
     * @returns {string} 日志标签 / Log label.
     */
    #slotLabel(id) {
        const field = this.#fieldsById.get(id);
        return field ? `${field.name}#${id}` : `slot#${id}`;
    }
}

export default FlatBufferRootProcessor;
