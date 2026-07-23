# @nsringo/flatbuffer-root

通过 FlatBuffers JavaScript 生成的根表类配置可复用的逐 slot 编解码处理器。

Configure a reusable slot-by-slot codec processor with a generated FlatBuffers JavaScript root table class.

## Usage

```js
import { FlatBufferRootProcessor } from "@nsringo/flatbuffer-root";

const processor = new FlatBufferRootProcessor({
    name: "Example",
    rootClass: ExampleRoot,
    codecs: {
        product: {
            tableClass: ExampleProduct,
            decode: table => decodeProduct(table),
            encode: (builder, json) => encodeProduct(builder, json),
        },
    },
    configurableRootNames: ["product"],
    logger,
});

const json = processor.decode(byteBuffer, ["product"]);
const bytes = processor.encode(byteBuffer, { product: json.product });
```

`rootClass` 的 prototype 根 accessor 顺序必须与 vtable slot 顺序一致，每个根字段必须是 table offset。没有 codec 的 schema 字段以及超出当前 schema 的物理 slot 会作为 opaque arena 保留。

Root accessors on `rootClass.prototype` must follow vtable slot order, and every root field must be a table offset. Schema fields without a codec and physical slots beyond the current schema are preserved as opaque arenas.
