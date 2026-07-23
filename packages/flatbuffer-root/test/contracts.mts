import { FlatBufferRootProcessor, type FlatBufferRootProcessorOptions, type FlatBufferTableProtocol } from "@nsringo/flatbuffer-root";
import type { Builder, ByteBuffer } from "flatbuffers";

interface ExampleJSON {
    alpha: {
        value: number;
    };
}

declare class ExampleTable implements FlatBufferTableProtocol {
    __init(position: number, byteBuffer: ByteBuffer): this;
}

declare class ExampleRoot implements FlatBufferTableProtocol {
    static addAlpha(builder: Builder, offset: number): void;

    __init(position: number, byteBuffer: ByteBuffer): this;
    alpha(table?: ExampleTable): ExampleTable | null;
}

const options: FlatBufferRootProcessorOptions<ExampleJSON> = {
    name: "Example",
    rootClass: ExampleRoot,
    codecs: {
        alpha: {
            tableClass: ExampleTable,
            decode: () => ({ value: 1 }),
            encode: (_builder, json) => json.value,
        },
    },
    configurableRootNames: ["alpha"],
};

const processor = new FlatBufferRootProcessor(options);
declare const byteBuffer: ByteBuffer;
const decoded: Partial<Pick<ExampleJSON, "alpha">> = processor.decode(byteBuffer, ["alpha"]);
const encoded: Uint8Array = processor.encode(byteBuffer, decoded);
const filtered: string[] = processor.filterRootNames(["alpha", "future"], ["alpha"]);

void encoded;
void filtered;
