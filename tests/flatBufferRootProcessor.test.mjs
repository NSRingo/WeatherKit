import assert from "node:assert/strict";
import test from "node:test";
import { FlatBufferRootProcessor } from "@nsringo/flatbuffer-root";
import { Builder, ByteBuffer } from "flatbuffers";

class Leaf {
    bb = null;
    bb_pos = 0;

    __init(position, byteBuffer) {
        this.bb_pos = position;
        this.bb = byteBuffer;
        return this;
    }

    value() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }

    text() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset) : null;
    }
}

class FirstRoot {
    bb = null;
    bb_pos = 0;

    __init(position, byteBuffer) {
        this.bb_pos = position;
        this.bb = byteBuffer;
        return this;
    }

    alpha(table) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (table ?? new Leaf()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }

    beta(table) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (table ?? new Leaf()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }

    static addAlpha(builder, offset) {
        builder.addFieldOffset(0, offset, 0);
    }

    static addBeta(builder, offset) {
        builder.addFieldOffset(1, offset, 0);
    }
}

class SecondRoot {
    bb = null;
    bb_pos = 0;

    __init(position, byteBuffer) {
        this.bb_pos = position;
        this.bb = byteBuffer;
        return this;
    }

    gamma(table) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (table ?? new Leaf()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }

    static addGamma(builder, offset) {
        builder.addFieldOffset(0, offset, 0);
    }
}

test("processor derives independent schemas from generated root classes", () => {
    const firstLogs = createLogger();
    const first = createProcessor("First", FirstRoot, ["alpha"], firstLogs);
    const second = createProcessor("Second", SecondRoot, [], createLogger(), ["gamma"]);

    const firstBytes = first.encode(undefined, {
        alpha: { text: "alpha", value: 11 },
        beta: { text: "beta", value: 22 },
    });
    const secondBytes = second.encode(undefined, {
        gamma: { text: "gamma", value: 33 },
    });

    assert.deepEqual(first.decode(new ByteBuffer(firstBytes), ["beta", "alpha", "alpha", "future"]), {
        alpha: { text: "alpha", value: 11 },
        beta: { text: "beta", value: 22 },
    });
    assert.deepEqual(second.decode(new ByteBuffer(secondBytes), ["gamma"]), {
        gamma: { text: "gamma", value: 33 },
    });
    assert.deepEqual(first.filterRootNames(["future", "alpha", "beta", "alpha"], ["beta"]), ["future", "beta"]);
    assert.ok(firstLogs.warnMessages.some(message => message.includes("请求未知=[future]")));
});

test("processor validates generated model, codec, and configurable-root contracts", () => {
    const cases = [
        {
            options: { codecs: {}, configurableRootNames: [], logger: createLogger(), name: "Invalid", rootClass: class {} },
            pattern: /generated FlatBuffers table class/,
        },
        {
            options: {
                codecs: { future: createLeafCodec() },
                configurableRootNames: [],
                logger: createLogger(),
                name: "Invalid",
                rootClass: FirstRoot,
            },
            pattern: /codec future is not a root accessor/,
        },
        {
            options: {
                codecs: { alpha: { ...createLeafCodec(), tableClass: class {} } },
                configurableRootNames: [],
                logger: createLogger(),
                name: "Invalid",
                rootClass: FirstRoot,
            },
            pattern: /tableClass must be a generated FlatBuffers table class/,
        },
        {
            options: {
                codecs: { alpha: { encode: createLeafCodec().encode, tableClass: Leaf } },
                configurableRootNames: [],
                logger: createLogger(),
                name: "Invalid",
                rootClass: FirstRoot,
            },
            pattern: /must provide decode/,
        },
        {
            options: {
                codecs: { alpha: createLeafCodec() },
                configurableRootNames: ["future"],
                logger: createLogger(),
                name: "Invalid",
                rootClass: FirstRoot,
            },
            pattern: /configurable root future is not a root accessor/,
        },
        {
            options: {
                codecs: { alpha: createLeafCodec() },
                configurableRootNames: ["alpha", "alpha"],
                logger: createLogger(),
                name: "Invalid",
                rootClass: FirstRoot,
            },
            pattern: /configurable root alpha is duplicated/,
        },
    ];

    for (const { options, pattern } of cases) {
        assert.throws(() => new FlatBufferRootProcessor(options), pattern);
        assert.equal(options.logger.errorMessages.length, 1);
    }
    assert.throws(
        () =>
            new FlatBufferRootProcessor({
                codecs: {},
                configurableRootNames: [],
                logger: {},
                name: "Invalid",
                rootClass: FirstRoot,
            }),
        /logger must provide debug, warn, and error/,
    );
});

test("processor preserves opaque slots while replacing a modeled slot", () => {
    const processor = createProcessor("Opaque", FirstRoot, [], createLogger());
    const source = createRoot([
        [0, builder => createLeaf(builder, { text: "old", value: 11 })],
        [3, builder => createContainer(builder, createLeaf(builder, { text: "opaque", value: 77 }))],
    ]);

    const output = processor.encode(new ByteBuffer(source), {
        alpha: { text: "new", value: 22 },
    });
    const byteBuffer = new ByteBuffer(output);
    const root = byteBuffer.__indirect(byteBuffer.position());
    const opaque = tableAt(byteBuffer, root, 3);

    assert.deepEqual(processor.decode(new ByteBuffer(output), ["alpha"]), {
        alpha: { text: "new", value: 22 },
    });
    assert.deepEqual(readLeaf(byteBuffer, tableAt(byteBuffer, opaque, 0)), {
        text: "opaque",
        value: 77,
    });
    assert.notEqual(Buffer.from(output).indexOf(source), -1);
});

test("processor isolates failed patch codecs and preserves their source slots", () => {
    const logs = createLogger();
    const processor = createProcessor("Isolated", FirstRoot, [], logs);
    const source = createRoot([
        [0, builder => createLeaf(builder, { text: "alpha-old", value: 11 })],
        [1, builder => createLeaf(builder, { text: "beta-old", value: 22 })],
    ]);

    const output = processor.encode(new ByteBuffer(source), {
        alpha: {},
        beta: { text: "beta-new", value: 44 },
        future: {},
    });

    assert.deepEqual(processor.decode(new ByteBuffer(output), ["alpha", "beta"]), {
        alpha: { text: "alpha-old", value: 11 },
        beta: { text: "beta-new", value: 44 },
    });
    assert.match(logs.warnMessages[0], /Isolated\.encode\.compile：已知 2\/3，编译 1\/3，失败 1\/3，未知 1\/3/);
    assert.match(logs.warnMessages[0], /alpha#0/);
    assert.match(logs.warnMessages[0], /future/);
});

test("processor logs and throws fatal root errors without returning output", () => {
    const logs = createLogger();
    const processor = createProcessor("Fatal", FirstRoot, [], logs);
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setUint32(0, 64, true);

    assert.throws(() => processor.decode(new ByteBuffer(bytes), []), /root table is outside/);
    assert.equal(logs.errorMessages.length, 1);
    assert.match(logs.errorMessages[0], /Fatal\.decode/);
});

function createProcessor(name, rootClass, configurableRootNames, logger, codecNames = ["alpha", "beta"]) {
    return new FlatBufferRootProcessor({
        codecs: Object.fromEntries(codecNames.map(rootName => [rootName, createLeafCodec()])),
        configurableRootNames,
        logger,
        name,
        rootClass,
    });
}

function createLeafCodec() {
    return {
        decode: table => ({
            text: table.text(),
            value: table.value(),
        }),
        encode: (builder, json) => {
            if (!Number.isSafeInteger(json.value) || typeof json.text !== "string") throw new TypeError("leaf requires value and text");
            return createLeaf(builder, json);
        },
        tableClass: Leaf,
    };
}

function createLogger() {
    const logger = {
        debugMessages: [],
        errorMessages: [],
        warn: (...values) => logger.warnMessages.push(values.map(String).join(" ")),
        warnMessages: [],
        debug: (...values) => logger.debugMessages.push(values.map(String).join(" ")),
        error: (...values) => logger.errorMessages.push(values.map(String).join(" ")),
    };
    return logger;
}

function createRoot(entries) {
    const builder = new Builder(256);
    const offsets = entries.map(([id, create]) => [id, create(builder)]);
    builder.startObject(Math.max(...entries.map(([id]) => id + 1)));
    for (const [id, offset] of offsets) builder.addFieldOffset(id, offset, 0);
    const root = builder.endObject();
    builder.finish(root);
    return builder.asUint8Array().slice();
}

function createLeaf(builder, data) {
    const textOffset = builder.createString(data.text);
    builder.startObject(2);
    builder.addFieldInt32(0, data.value, 0);
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
