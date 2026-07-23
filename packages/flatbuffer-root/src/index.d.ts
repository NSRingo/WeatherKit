import type { Builder, ByteBuffer } from "flatbuffers";

/**
 * FlatBuffers 生成表实例必须实现的初始化协议。
 * Initialization protocol required from generated FlatBuffers table instances.
 */
export interface FlatBufferTableProtocol {
    __init(position: number, byteBuffer: ByteBuffer): this;
}

/**
 * 可创建生成表实例的构造器协议。
 * Constructor protocol for generated table instances.
 */
export interface FlatBufferTableClass<TTable extends FlatBufferTableProtocol = FlatBufferTableProtocol> {
    new (): TTable;
}

/**
 * 作为处理器配置输入的生成根表类协议。
 * Generated root table class protocol accepted by the processor configuration.
 */
export interface FlatBufferRootClassProtocol {
    new (): FlatBufferTableProtocol;
    readonly prototype: FlatBufferTableProtocol;
}

/**
 * 将单个根产品表与 JSON 相互转换的 codec。
 * Codec converting one root product table to and from JSON.
 */
export interface FlatBufferRootCodec<TTable extends FlatBufferTableProtocol = FlatBufferTableProtocol, TJSON = unknown> {
    tableClass: FlatBufferTableClass<TTable>;
    decode(table: TTable): TJSON;
    encode(builder: Builder, json: TJSON): number;
}

/**
 * 按生成根 accessor 名称注册的 codec 集合。
 * Codec collection keyed by generated root accessor name.
 */
export type FlatBufferRootCodecs<TJSONByRoot extends object> = {
    readonly [K in keyof TJSONByRoot & string]?: FlatBufferRootCodec<FlatBufferTableProtocol, TJSONByRoot[K]>;
};

/**
 * FlatBufferRootProcessor 的完整且无回退配置。
 * Complete, fallback-free configuration for FlatBufferRootProcessor.
 */
export interface FlatBufferRootProcessorOptions<TJSONByRoot extends object> {
    name: string;
    rootClass: FlatBufferRootClassProtocol;
    codecs: FlatBufferRootCodecs<TJSONByRoot>;
    configurableRootNames: readonly (keyof TJSONByRoot & string)[];
}

/**
 * 基于生成根表模型逐 slot 编解码并透明保留未知数据。
 * Encode and decode generated root table models slot by slot while preserving unknown data.
 */
export class FlatBufferRootProcessor<TJSONByRoot extends object = Record<string, unknown>> {
    /**
     * 创建并验证根表处理器配置。
     * Create and validate a root table processor configuration.
     */
    constructor(options: FlatBufferRootProcessorOptions<TJSONByRoot>);

    /**
     * 过滤受业务开关控制的根名称，并保持请求顺序。
     * Filter root names controlled by business settings while preserving request order.
     */
    filterRootNames(requestedRootNames: string[], enabledRootNames: string[]): string[];

    /**
     * 按物理 slot 顺序解码选中的根产品。
     * Decode selected root products in physical slot order.
     */
    decode<K extends keyof TJSONByRoot & string>(byteBuffer: ByteBuffer, rootNames?: K[]): Partial<Pick<TJSONByRoot, K>>;

    /**
     * 独立编译 patch slot，并与原始根表合并组装。
     * Compile patch slots independently and merge them into the source root table.
     */
    encode(byteBuffer?: ByteBuffer, patch?: Partial<TJSONByRoot>): Uint8Array;
}

export default FlatBufferRootProcessor;
