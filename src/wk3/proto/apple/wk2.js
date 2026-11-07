// src/proto/apple/wk2.js
// Auto-generated from response.bundle.js (v3.1.0)
// This module contains the Flatbuffer schema definitions for Apple WeatherKit2
//
// NOTE: This file was reconstructed from a minified bundle.
// Variable names are shortened but logic is preserved.

// ============================================================
// Enum definitions
// ============================================================

export const StringEncodingType = {
    UTF8_BYTES: 1,
    UTF16_STRING: 2,
};

export const ComparisonTrend = {
    UNKNOWN: 0,
    MUCH_WORSE: 1,
    WORSE: 2,
    SAME: 3,
    BETTER: 4,
    MUCH_BETTER: 5,

    // Reverse mapping (number → string)
    0: "UNKNOWN",
    1: "MUCH_WORSE",
    2: "WORSE",
    3: "SAME",
    4: "BETTER",
    5: "MUCH_BETTER",
};

export const SourceType = {
    APPLE_INTERNAL: 0,
    MODELED: 1,
    STATION: 2,
    UNKNOWN3: 3,
    UNKNOWN4: 4,

    // Reverse mapping (number → string)
    0: "APPLE_INTERNAL",
    1: "MODELED",
    2: "STATION",
    3: "UNKNOWN3",
    4: "UNKNOWN4",
};

export const PollutantType = {
    NOT_AVAILABLE: 0,
    C6H6: 1,
    NH3: 2,
    NMHC: 3,
    NO: 4,
    NO2: 5,
    NOX: 6,
    OZONE: 7,
    PM2_5: 8,
    SO2: 9,
    PM10: 10,
    CO: 11,
    UNKNOWN12: 12,
    UNKNOWN13: 13,

    // Reverse mapping (number → string)
    0: "NOT_AVAILABLE",
    1: "C6H6",
    2: "NH3",
    3: "NMHC",
    4: "NO",
    5: "NO2",
    6: "NOX",
    7: "OZONE",
    8: "PM2_5",
    9: "SO2",
    10: "PM10",
    11: "CO",
    12: "UNKNOWN12",
    13: "UNKNOWN13",
};

export const UnitType = {
    PARTS_PER_BILLION: 0,
    MICROGRAMS_PER_CUBIC_METER: 1,
    UNKNOWN2: 2,
    UNKNOWN3: 3,

    // Reverse mapping (number → string)
    0: "PARTS_PER_BILLION",
    1: "MICROGRAMS_PER_CUBIC_METER",
    2: "UNKNOWN2",
    3: "UNKNOWN3",
};

export const ComparisonType = {
    UNKNOWN0: 0,
    TEMPERATURE_MAX: 1,
    PRECIPITATION: 2,
    UNKNOWN3: 3,

    // Reverse mapping (number → string)
    0: "UNKNOWN0",
    1: "TEMPERATURE_MAX",
    2: "PRECIPITATION",
    3: "UNKNOWN3",
};

export const Deviation = {
    UNKNOWN: 0,
    OBSERVED: 1,
    LIKELY: 2,
    POSSIBLE: 3,
    UNLIKELY: 4,
    UNKNOWN5: 5,
};

export const Direction = {
    STEADY: 0,
    INC: 1,
    DEC: 2,
    UNKNOWN3: 3,

    // Reverse mapping (number → string)
    0: "STEADY",
    1: "INC",
    2: "DEC",
    3: "UNKNOWN3",
};

export const ComparisonType2 = {
    UNKNOWN0: 0,
    TEMPERATURE_MAX: 1,
    PRECIPITATION: 2,
    TEMPERATURE_MIN: 3,
    SNOWFALL: 4,
    UNKNOWN5: 5,

    // Reverse mapping (number → string)
    0: "UNKNOWN0",
    1: "TEMPERATURE_MAX",
    2: "PRECIPITATION",
    3: "TEMPERATURE_MIN",
    4: "SNOWFALL",
    5: "UNKNOWN5",
};

export const Deviation2 = {
    MUCHHIGHER: 0,
    HIGHER: 1,
    NORMAL: 2,
    LOWER: 3,
    MUCHLOWER: 4,
    UNKNOWN5: 5,

    // Reverse mapping (number → string)
    0: "MUCHHIGHER",
    1: "HIGHER",
    2: "NORMAL",
    3: "LOWER",
    4: "MUCHLOWER",
    5: "UNKNOWN5",
};

export const ConditionType = {
    CLEAR: 0,
    UNKNOWN1: 1,
    UNKNOWN2: 2,
    SLEET: 3,
    POSSIBLE_SLEET: 4,
    HEAVY_RAIN: 5,
    RAIN: 6,
    DRIZZLE: 7,
    POSSIBLE_DRIZZLE: 8,
    HEAVY_SNOW: 9,
    SNOW: 10,
    UNKNOWN11: 11,
    UNKNOWN12: 12,
    UNKNOWN13: 13,
    UNKNOWN14: 14,
    UNKNOWN15: 15,
    UNKNOWN16: 16,
    UNKNOWN17: 17,
    UNKNOWN18: 18,

    // Reverse mapping (number → string)
    0: "CLEAR",
    1: "UNKNOWN1",
    2: "UNKNOWN2",
    3: "SLEET",
    4: "POSSIBLE_SLEET",
    5: "HEAVY_RAIN",
    6: "RAIN",
    7: "DRIZZLE",
    8: "POSSIBLE_DRIZZLE",
    9: "HEAVY_SNOW",
    10: "SNOW",
    11: "UNKNOWN11",
    12: "UNKNOWN12",
    13: "UNKNOWN13",
    14: "UNKNOWN14",
    15: "UNKNOWN15",
    16: "UNKNOWN16",
    17: "UNKNOWN17",
    18: "UNKNOWN18",
};

export const ForecastToken = {
    CLEAR: 0,
    START: 1,
    STOP: 2,
    START_STOP: 3,
    STOP_START: 4,
    CONSTANT: 5,
    UNKNOWN6: 6,
    UNKNOWN7: 7,

    // Reverse mapping (number → string)
    0: "CLEAR",
    1: "START",
    2: "STOP",
    3: "START_STOP",
    4: "STOP_START",
    5: "CONSTANT",
    6: "UNKNOWN6",
    7: "UNKNOWN7",
};

export const ParameterType = {
    FIRST_AT: 0,
    SECOND_AT: 1,
    UNKNOWN2: 2,

    // Reverse mapping (number → string)
    0: "FIRST_AT",
    1: "SECOND_AT",
    2: "UNKNOWN2",
};

export const PrecipitationType = {
    CLEAR: 0,
    RAIN: 1,
    SNOW: 2,
    SLEET: 3,
    HAIL: 4,
    MIXED: 5,
    UNKNOWN6: 6,

    // Reverse mapping (number → string)
    0: "CLEAR",
    1: "RAIN",
    2: "SNOW",
    3: "SLEET",
    4: "HAIL",
    5: "MIXED",
    6: "UNKNOWN6",
};

export const PressureTrend = {
    RISING: 0,
    FALLING: 1,
    STEADY: 2,
    UNDEFINED: 3,

    // Reverse mapping (number → string)
    0: "RISING",
    1: "FALLING",
    2: "STEADY",
    3: "UNDEFINED",
};

export const WeatherCondition = {
    CLEAR: 0,
    BLIZZARD: 1,
    PRECIPITATION: 2,
    SLEET: 3,
    BREEZY: 4,
    CLOUDY: 5,
    DRIZZLE: 6,
    FLURRIES: 7,
    FOGGY: 8,
    BLOWING_DUST: 9,
    BLOWING_SNOW: 10,
    FREEZING_RAIN: 11,
    FRIGID: 12,
    HAZE: 13,
    HEAVY_RAIN: 14,
    HEAVY_SNOW: 15,
    HAIL: 16,
    HOT: 17,
    ISOLATED_THUNDERSTORMS: 18,
    MOSTLY_CLEAR: 19,
    MOSTLY_CLOUDY: 20,
    PARTLY_CLOUDY: 21,
    RAIN: 22,
    HURRICANE: 23,
    SCATTERED_THUNDERSTORMS: 24,
    UNKNOWN25: 25,
    SNOW: 26,
    SMOKY: 27,
    UNKNOWN28: 28,
    FREEZING_DRIZZLE: 29,
    THUNDERSTORMS: 30,
    STRONG_STORMS: 31,
    WINDY: 32,
    WINTRY_MIX: 33,
    SUN_FLURRIES: 34,
    SUN_SHOWERS: 35,
    UNKNOWN36: 36,
    TROPICAL_STORM: 37,
    UNKNOWN38: 38,
    UNKNOWN39: 39,
    UNKNOWN40: 40,
    UNKNOWN41: 41,
    UNKNOWN42: 42,
    UNKNOWN43: 43,
    UNKNOWN44: 44,

    // Reverse mapping (number → string)
    0: "CLEAR",
    1: "BLIZZARD",
    2: "PRECIPITATION",
    3: "SLEET",
    4: "BREEZY",
    5: "CLOUDY",
    6: "DRIZZLE",
    7: "FLURRIES",
    8: "FOGGY",
    9: "BLOWING_DUST",
    10: "BLOWING_SNOW",
    11: "FREEZING_RAIN",
    12: "FRIGID",
    13: "HAZE",
    14: "HEAVY_RAIN",
    15: "HEAVY_SNOW",
    16: "HAIL",
    17: "HOT",
    18: "ISOLATED_THUNDERSTORMS",
    19: "MOSTLY_CLEAR",
    20: "MOSTLY_CLOUDY",
    21: "PARTLY_CLOUDY",
    22: "RAIN",
    23: "HURRICANE",
    24: "SCATTERED_THUNDERSTORMS",
    25: "UNKNOWN25",
    26: "SNOW",
    27: "SMOKY",
    28: "UNKNOWN28",
    29: "FREEZING_DRIZZLE",
    30: "THUNDERSTORMS",
    31: "STRONG_STORMS",
    32: "WINDY",
    33: "WINTRY_MIX",
    34: "SUN_FLURRIES",
    35: "SUN_SHOWERS",
    36: "UNKNOWN36",
    37: "TROPICAL_STORM",
    38: "UNKNOWN38",
    39: "UNKNOWN39",
    40: "UNKNOWN40",
    41: "UNKNOWN41",
    42: "UNKNOWN42",
    43: "UNKNOWN43",
    44: "UNKNOWN44",
};

export const MoonPhase = {
    NEW: 0,
    WAXING_CRESCENT: 1,
    FIRST_QUARTER: 2,
    WAXING_GIBBOUS: 3,
    FULL: 4,
    WANING_GIBBOUS: 5,
    THIRD_QUARTER: 6,
    WANING_CRESCENT: 7,
    UNKNOWN8: 8,

    // Reverse mapping (number → string)
    0: "NEW",
    1: "WAXING_CRESCENT",
    2: "FIRST_QUARTER",
    3: "WAXING_GIBBOUS",
    4: "FULL",
    5: "WANING_GIBBOUS",
    6: "THIRD_QUARTER",
    7: "WANING_CRESCENT",
    8: "UNKNOWN8",
};

export const PlacementType = {
    UNKNOWN0: 0,
    AIR_QUALITY_DETAILS: 1,
    UNKNOWN2: 2,
    UNKNOWN3: 3,
    UNKNOWN4: 4,
    UNKNOWN5: 5,
    UNKNOWN6: 6,
    UNKNOWN7: 7,
    UNKNOWN8: 8,
    TEMPERATURE_FEELS_LIKE_DETAILS: 9,
    UNKNOWN10: 10,
    TRENDS: 11,
    UV_DETAILS: 12,
    UNKNOWN13: 13,
    WIND_DETAILS: 14,
    UNKNOWN15: 15,
    UNKNOWN16: 16,
    UNKNOWN17: 17,
    UNKNOWN18: 18,

    // Reverse mapping (number → string)
    0: "UNKNOWN0",
    1: "AIR_QUALITY_DETAILS",
    2: "UNKNOWN2",
    3: "UNKNOWN3",
    4: "UNKNOWN4",
    5: "UNKNOWN5",
    6: "UNKNOWN6",
    7: "UNKNOWN7",
    8: "UNKNOWN8",
    9: "TEMPERATURE_FEELS_LIKE_DETAILS",
    10: "UNKNOWN10",
    11: "TRENDS",
    12: "UV_DETAILS",
    13: "UNKNOWN13",
    14: "WIND_DETAILS",
    15: "UNKNOWN15",
    16: "UNKNOWN16",
    17: "UNKNOWN17",
    18: "UNKNOWN18",
};

export const ResponseType = {
    UNKNOWN0: 0,
    SHELTER: 1,
    EVACUATE: 2,
    PREPARE: 3,
    EXECUTE: 4,
    AVOID: 5,
    MONITOR: 6,
    ASSESS: 7,
    ALLCLEAR: 8,
    NONE: 9,
    UNKNOWN10: 10,

    // Reverse mapping (number → string)
    0: "UNKNOWN0",
    1: "SHELTER",
    2: "EVACUATE",
    3: "PREPARE",
    4: "EXECUTE",
    5: "AVOID",
    6: "MONITOR",
    7: "ASSESS",
    8: "ALLCLEAR",
    9: "NONE",
    10: "UNKNOWN10",
};

export const Severity = {
    UNKNOWN: 0,
    EXTREME: 1,
    SEVERE: 2,
    MODERATE: 3,
    MINOR: 4,
    UNKNOWN5: 5,
    UNKNOWN6: 6,
    UNKNOWN7: 7,
    UNKNOWN8: 8,
    UNKNOWN9: 9,
    STATEMENT: 10,
    WARNING: 11,
    ADVISORY: 12,
    UNKNOWN13: 13,

    // Reverse mapping (number → string)
    0: "UNKNOWN",
    1: "EXTREME",
    2: "SEVERE",
    3: "MODERATE",
    4: "MINOR",
    5: "UNKNOWN5",
    6: "UNKNOWN6",
    7: "UNKNOWN7",
    8: "UNKNOWN8",
    9: "UNKNOWN9",
    10: "STATEMENT",
    11: "WARNING",
    12: "ADVISORY",
    13: "UNKNOWN13",
};

export const SignificanceType = {
    UNKNOWN: 0,
    UNKNOWN1: 1,
    UNKNOWN2: 2,
    UNKNOWN3: 3,
    UNKNOWN4: 4,
    UNKNOWN5: 5,
    UNKNOWN6: 6,
    UNKNOWN7: 7,
    UNKNOWN8: 8,
    UNKNOWN9: 9,
    STATEMENT: 10,
    WARNING: 11,
    ADVISORY: 12,
    UNKNOWN13: 13,

    // Reverse mapping (number → string)
    0: "UNKNOWN",
    1: "UNKNOWN1",
    2: "UNKNOWN2",
    3: "UNKNOWN3",
    4: "UNKNOWN4",
    5: "UNKNOWN5",
    6: "UNKNOWN6",
    7: "UNKNOWN7",
    8: "UNKNOWN8",
    9: "UNKNOWN9",
    10: "STATEMENT",
    11: "WARNING",
    12: "ADVISORY",
    13: "UNKNOWN13",
};

export const Urgency = {
    UNKNOWN: 0,
    IMMEDIATE: 1,
    EXPECTED: 2,
    FUTURE: 3,
    PAST: 4,
    UNKNOWN5: 5,

    // Reverse mapping (number → string)
    0: "UNKNOWN",
    1: "IMMEDIATE",
    2: "EXPECTED",
    3: "FUTURE",
    4: "PAST",
    5: "UNKNOWN5",
};

export const Certainty = {
    UNKNOWN: 0,
    OBSERVED: 1,
    LIKELY: 2,
    POSSIBLE: 3,
    UNLIKELY: 4,
    UNKNOWN5: 5,

    // Reverse mapping (number → string)
    0: "UNKNOWN",
    1: "OBSERVED",
    2: "LIKELY",
    3: "POSSIBLE",
    4: "UNLIKELY",
    5: "UNKNOWN5",
};

export const ImportanceType = {
    UNKNOWN: 0,
    UNKNOWN1: 1,
    UNKNOWN2: 2,
    UNKNOWN3: 3,
    UNKNOWN4: 4,
    UNKNOWN5: 5,
    UNKNOWN6: 6,
    UNKNOWN7: 7,
    UNKNOWN8: 8,
    UNKNOWN9: 9,
    STATEMENT: 10,
    WARNING: 11,
    ADVISORY: 12,
    UNKNOWN13: 13,

    // Reverse mapping (number → string)
    0: "UNKNOWN",
    1: "UNKNOWN1",
    2: "UNKNOWN2",
    3: "UNKNOWN3",
    4: "UNKNOWN4",
    5: "UNKNOWN5",
    6: "UNKNOWN6",
    7: "UNKNOWN7",
    8: "UNKNOWN8",
    9: "UNKNOWN9",
    10: "STATEMENT",
    11: "WARNING",
    12: "ADVISORY",
    13: "UNKNOWN13",
};

// ============================================================
// Flatbuffer classes
// ============================================================

// ByteBuffer typed-array helpers (from response.bundle.js)
const int32 = new Int32Array(2);
const float32 = new Float32Array(int32.buffer);
const float64 = new Float64Array(int32.buffer);
const isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

// ByteBuffer
export class ByteBuffer {
    constructor(bytes) {
        (this.bytes_ = bytes), (this.position_ = 0), (this.text_decoder_ = new TextDecoder());
    }
    static allocate(size) {
        return new ByteBuffer(new Uint8Array(size));
    }
    clear() {
        this.position_ = 0;
    }
    bytes() {
        return this.bytes_;
    }
    position() {
        return this.position_;
    }
    setPosition(pos) {
        this.position_ = pos;
    }
    capacity() {
        return this.bytes_.length;
    }
    readInt8(offset) {
        return (this.readUint8(offset) << 24) >> 24;
    }
    readUint8(offset) {
        return this.bytes_[offset];
    }
    readInt16(offset) {
        return (this.readUint16(offset) << 16) >> 16;
    }
    readUint16(offset) {
        return this.bytes_[offset] | (this.bytes_[offset + 1] << 8);
    }
    readInt32(offset) {
        return this.bytes_[offset] | (this.bytes_[offset + 1] << 8) | (this.bytes_[offset + 2] << 16) | (this.bytes_[offset + 3] << 24);
    }
    readUint32(offset) {
        return this.readInt32(offset) >>> 0;
    }
    readInt64(offset) {
        return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readUint64(offset) {
        return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readFloat32(offset) {
        return (int32["0"] = this.readInt32(offset)), float32["0"];
    }
    readFloat64(offset) {
        return (int32[+!isLittleEndian] = this.readInt32(offset)), (int32[+!!isLittleEndian] = this.readInt32(offset + 4)), float64["0"];
    }
    writeInt8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeUint8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeInt16(offset, value) {
        (this.bytes_[offset] = value), (this.bytes_[offset + 1] = value >> 8);
    }
    writeUint16(offset, value) {
        (this.bytes_[offset] = value), (this.bytes_[offset + 1] = value >> 8);
    }
    writeInt32(offset, value) {
        (this.bytes_[offset] = value), (this.bytes_[offset + 1] = value >> 8), (this.bytes_[offset + 2] = value >> 16), (this.bytes_[offset + 3] = value >> 24);
    }
    writeUint32(offset, value) {
        (this.bytes_[offset] = value), (this.bytes_[offset + 1] = value >> 8), (this.bytes_[offset + 2] = value >> 16), (this.bytes_[offset + 3] = value >> 24);
    }
    writeInt64(offset, value) {
        this.writeInt32(offset, Number(BigInt.asIntN(32, value))), this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
    }
    writeUint64(offset, value) {
        this.writeUint32(offset, Number(BigInt.asUintN(32, value))), this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
    }
    writeFloat32(offset, value) {
        (float32["0"] = value), this.writeInt32(offset, int32["0"]);
    }
    writeFloat64(offset, value) {
        (float64["0"] = value), this.writeInt32(offset, int32[+!isLittleEndian]), this.writeInt32(offset + 4, int32[+!!isLittleEndian]);
    }
    getBufferIdentifier() {
        if (this.bytes_.length < this.position_ + 4 + 4) throw Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");
        let t = "";
        for (let e = 0; e < 4; e++) t += String.fromCharCode(this.readInt8(this.position_ + 4 + e));
        return t;
    }
    __offset(table, field) {
        const i = table - this.readInt32(table);
        return field < this.readInt16(i) ? this.readInt16(i + field) : 0;
    }
    __union(obj, offset) {
        return (obj.bb_pos = offset + this.readInt32(offset)), (obj.bb = this), obj;
    }
    __string(offset, encoding) {
        offset += this.readInt32(offset);
        const a = this.readInt32(offset);
        offset += 4;
        const s = this.bytes_.subarray(offset, offset + a);
        return encoding === StringEncodingType.UTF8_BYTES ? s : this.text_decoder_.decode(s);
    }
    __union_with_string(unionOrStr, offset) {
        return "string" === typeof unionOrStr ? this.__string(offset) : this.__union(unionOrStr, offset);
    }
    __indirect(offset) {
        return offset + this.readInt32(offset);
    }
    __vector(offset) {
        return offset + this.readInt32(offset) + 4;
    }
    __vector_len(offset) {
        return this.readInt32(offset + this.readInt32(offset));
    }
    __has_identifier(id) {
        if (4 !== id.length) throw Error("FlatBuffers: file identifier must be length 4");
        for (let e = 0; e < 4; e++) if (id.charCodeAt(e) !== this.readInt8(this.position() + 4 + e)) return !1;
        return !0;
    }
    createScalarList(listFunc, length) {
        const i = [];
        for (let a = 0; a < length; ++a) {
            const value = listFunc(a);
            null !== value && i.push(value);
        }
        return i;
    }
    createObjList(listFunc, length) {
        const i = [];
        for (let a = 0; a < length; ++a) {
            const item = listFunc(a);
            null !== item && i.push(item.unpack());
        }
        return i;
    }
}

// Builder
export class Builder {
    constructor(initialSize) {
        let e;
        (this.minalign = 1),
            (this.vtable = null),
            (this.vtable_in_use = 0),
            (this.isNested = !1),
            (this.object_start = 0),
            (this.vtables = []),
            (this.vector_num_elems = 0),
            (this.force_defaults = !1),
            (this.string_maps = null),
            (this.text_encoder = new TextEncoder()),
            (e = initialSize || 1024),
            (this.bb = ByteBuffer.allocate(e)),
            (this.space = e);
    }
    clear() {
        this.bb.clear(), (this.space = this.bb.capacity()), (this.minalign = 1), (this.vtable = null), (this.vtable_in_use = 0), (this.isNested = !1), (this.object_start = 0), (this.vtables = []), (this.vector_num_elems = 0), (this.force_defaults = !1), (this.string_maps = null);
    }
    forceDefaults(enabled) {
        this.force_defaults = enabled;
    }
    dataBuffer() {
        return this.bb;
    }
    asUint8Array() {
        return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
    }
    prep(align, len) {
        align > this.minalign && (this.minalign = align);
        const i = (~(this.bb.capacity() - this.space + len) + 1) & (align - 1);
        for (; this.space < i + align + len; ) {
            const align = this.bb.capacity();
            (this.bb = Builder.growByteBuffer(this.bb)), (this.space += this.bb.capacity() - align);
        }
        this.pad(i);
    }
    pad(value) {
        for (let e = 0; e < value; e++) this.bb.writeInt8(--this.space, 0);
    }
    writeInt8(value) {
        this.bb.writeInt8((this.space -= 1), value);
    }
    writeInt16(value) {
        this.bb.writeInt16((this.space -= 2), value);
    }
    writeInt32(value) {
        this.bb.writeInt32((this.space -= 4), value);
    }
    writeInt64(value) {
        this.bb.writeInt64((this.space -= 8), value);
    }
    writeFloat32(value) {
        this.bb.writeFloat32((this.space -= 4), value);
    }
    writeFloat64(value) {
        this.bb.writeFloat64((this.space -= 8), value);
    }
    addInt8(value) {
        this.prep(1, 0), this.writeInt8(value);
    }
    addInt16(value) {
        this.prep(2, 0), this.writeInt16(value);
    }
    addInt32(value) {
        this.prep(4, 0), this.writeInt32(value);
    }
    addInt64(value) {
        this.prep(8, 0), this.writeInt64(value);
    }
    addFloat32(value) {
        this.prep(4, 0), this.writeFloat32(value);
    }
    addFloat64(value) {
        this.prep(8, 0), this.writeFloat64(value);
    }
    addFieldInt8(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addInt8(value), this.slot(id));
    }
    addFieldInt16(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addInt16(value), this.slot(id));
    }
    addFieldInt32(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addInt32(value), this.slot(id));
    }
    addFieldInt64(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addInt64(value), this.slot(id));
    }
    addFieldFloat32(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addFloat32(value), this.slot(id));
    }
    addFieldFloat64(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addFloat64(value), this.slot(id));
    }
    addFieldOffset(id, value, defaultValue) {
        (this.force_defaults || value !== defaultValue) && (this.addOffset(value), this.slot(id));
    }
    addFieldStruct(id, value, defaultValue) {
        value !== defaultValue && (this.nested(value), this.slot(id));
    }
    nested(value) {
        if (value !== this.offset()) throw TypeError("FlatBuffers: struct must be serialized inline.");
    }
    notNested() {
        if (this.isNested) throw TypeError("FlatBuffers: object serialization must not be nested.");
    }
    slot(value) {
        null !== this.vtable && (this.vtable[value] = this.offset());
    }
    offset() {
        return this.bb.capacity() - this.space;
    }
    static growByteBuffer(bb) {
        const e = bb.capacity();
        if (0xc0000000 & e) throw Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");
        const i = e << 1,
            a = ByteBuffer.allocate(i);
        return a.setPosition(i - e), a.bytes().set(bb.bytes(), i - e), a;
    }
    addOffset(value) {
        this.prep(4, 0), this.writeInt32(this.offset() - value + 4);
    }
    startObject(fieldCount) {
        this.notNested(), null == this.vtable && (this.vtable = []), (this.vtable_in_use = fieldCount);
        for (let e = 0; e < fieldCount; e++) this.vtable[e] = 0;
        (this.isNested = !0), (this.object_start = this.offset());
    }
    endObject() {
        if (null == this.vtable || !this.isNested) throw Error("FlatBuffers: endObject called without startObject");
        this.addInt32(0);
        let t = this.offset(),
            e = this.vtable_in_use - 1;
        for (; e >= 0 && 0 === this.vtable[e]; e--);
        const i = e + 1;
        for (; e >= 0; e--) this.addInt16(0 !== this.vtable[e] ? t - this.vtable[e] : 0);
        this.addInt16(t - this.object_start);
        const a = (i + 2) * 2;
        this.addInt16(a);
        let s = 0,
            n = this.space;
        t: for (e = 0; e < this.vtables.length; e++) {
            const t = this.bb.capacity() - this.vtables[e];
            if (a === this.bb.readInt16(t)) {
                for (let e = 2; e < a; e += 2) if (this.bb.readInt16(n + e) !== this.bb.readInt16(t + e)) continue t;
                s = this.vtables[e];
                break;
            }
        }
        return s ? ((this.space = this.bb.capacity() - t), this.bb.writeInt32(this.space, s - t)) : (this.vtables.push(this.offset()), this.bb.writeInt32(this.bb.capacity() - t, this.offset() - t)), (this.isNested = !1), t;
    }
    finish(root, fileId, sizePrefix) {
        const a = 4 * !!sizePrefix;
        if (fileId) {
            if ((this.prep(this.minalign, 8 + a), 4 !== fileId.length)) throw TypeError("FlatBuffers: file identifier must be length 4");
            for (let root = 3; root >= 0; root--) this.writeInt8(fileId.charCodeAt(root));
        }
        this.prep(this.minalign, 4 + a), this.addOffset(root), a && this.addInt32(this.bb.capacity() - this.space), this.bb.setPosition(this.space);
    }
    finishSizePrefixed(root, fileId) {
        this.finish(root, fileId, !0);
    }
    requiredField(table, field) {
        const i = this.bb.capacity() - table,
            a = i - this.bb.readInt32(i);
        if (!(field < this.bb.readInt16(a) && 0 !== this.bb.readInt16(a + field))) throw TypeError(`FlatBuffers: field ${field} must be set`);
    }
    startVector(elemSize, numElems, alignment) {
        this.notNested(), (this.vector_num_elems = numElems), this.prep(4, elemSize * numElems), this.prep(alignment, elemSize * numElems);
    }
    endVector() {
        return this.writeInt32(this.vector_num_elems), this.offset();
    }
    createSharedString(str) {
        if (!str) return 0;
        if ((this.string_maps || (this.string_maps = new Map()), this.string_maps.has(str))) return this.string_maps.get(str);
        const e = this.createString(str);
        return this.string_maps.set(str, e), e;
    }
    createString(str) {
        let e;
        return null == str ? 0 : ((e = str instanceof Uint8Array ? str : this.text_encoder.encode(str)), this.addInt8(0), this.startVector(1, e.length, 1), this.bb.setPosition((this.space -= e.length)), this.bb.bytes().set(e, this.space), this.endVector());
    }
    createByteVector(bytes) {
        return null == bytes ? 0 : (this.startVector(1, bytes.length, 1), this.bb.setPosition((this.space -= bytes.length)), this.bb.bytes().set(bytes, this.space), this.endVector());
    }
    createObjectOffset(obj) {
        return null === obj ? 0 : "string" === typeof obj ? this.createString(obj) : obj.pack(this);
    }
    createObjectOffsetList(list) {
        const e = [];
        for (let i = 0; i < list.length; ++i) {
            const a = list[i];
            if (null !== a) e.push(this.createObjectOffset(a));
            else throw TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.");
        }
        return e;
    }
    createStructOffsetList(list, func) {
        return func(this, list.length), this.createObjectOffsetList(list.slice().reverse()), this.endVector();
    }
}

// Metadata
export class Metadata {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsMetadata(bb, obj) {
        return (obj || new Metadata()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsMetadata(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Metadata()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    attributionUrl(encoding) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    expireTime() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    language(encoding) {
        const e = this.bb.__offset(this.bb_pos, 8);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    latitude() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    longitude() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    providerLogo(encoding) {
        const e = this.bb.__offset(this.bb_pos, 14);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    providerName(encoding) {
        const e = this.bb.__offset(this.bb_pos, 16);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    readTime() {
        const t = this.bb.__offset(this.bb_pos, 18);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    reportedTime() {
        const t = this.bb.__offset(this.bb_pos, 20);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    temporarilyUnavailable() {
        const t = this.bb.__offset(this.bb_pos, 22);
        return !!t && !!this.bb.readInt8(this.bb_pos + t);
    }
    sourceType() {
        const t = this.bb.__offset(this.bb_pos, 24);
        return t ? this.bb.readInt8(this.bb_pos + t) : SourceType.APPLE_INTERNAL;
    }
    static startMetadata(builder) {
        builder.startObject(11);
    }
    static addAttributionUrl(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addExpireTime(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addLanguage(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static addLatitude(builder, value) {
        builder.addFieldFloat32(3, value, 0);
    }
    static addLongitude(builder, value) {
        builder.addFieldFloat32(4, value, 0);
    }
    static addProviderLogo(builder, value) {
        builder.addFieldOffset(5, value, 0);
    }
    static addProviderName(builder, value) {
        builder.addFieldOffset(6, value, 0);
    }
    static addReadTime(builder, value) {
        builder.addFieldInt32(7, value, 0);
    }
    static addReportedTime(builder, value) {
        builder.addFieldInt32(8, value, 0);
    }
    static addTemporarilyUnavailable(builder, value) {
        builder.addFieldInt8(9, +value, 0);
    }
    static addSourceType(builder, value) {
        builder.addFieldInt8(10, value, SourceType.APPLE_INTERNAL);
    }
    static endMetadata(builder) {
        return builder.endObject();
    }
    static createMetadata(builder, e, i, a, s, n, r, o, d, c, l, u) {
        return (
            Metadata.startMetadata(builder),
            Metadata.addAttributionUrl(builder, e),
            Metadata.addExpireTime(builder, i),
            Metadata.addLanguage(builder, a),
            Metadata.addLatitude(builder, s),
            Metadata.addLongitude(builder, n),
            Metadata.addProviderLogo(builder, r),
            Metadata.addProviderName(builder, o),
            Metadata.addReadTime(builder, d),
            Metadata.addReportedTime(builder, c),
            Metadata.addTemporarilyUnavailable(builder, l),
            Metadata.addSourceType(builder, u),
            Metadata.endMetadata(builder)
        );
    }
}

// Pollutant
export class Pollutant {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsPollutant(bb, obj) {
        return (obj || new Pollutant()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsPollutant(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Pollutant()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    pollutantType() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readInt8(this.bb_pos + t) : PollutantType.NOT_AVAILABLE;
    }
    amount() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    units() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : UnitType.PARTS_PER_BILLION;
    }
    static startPollutant(builder) {
        builder.startObject(3);
    }
    static addPollutantType(builder, value) {
        builder.addFieldInt8(0, value, PollutantType.NOT_AVAILABLE);
    }
    static addAmount(builder, value) {
        builder.addFieldFloat32(1, value, 0);
    }
    static addUnits(builder, value) {
        builder.addFieldInt8(2, value, UnitType.PARTS_PER_BILLION);
    }
    static endPollutant(builder) {
        return builder.endObject();
    }
    static createPollutant(builder, e, i, a) {
        return Pollutant.startPollutant(builder), Pollutant.addPollutantType(builder, e), Pollutant.addAmount(builder, i), Pollutant.addUnits(builder, a), Pollutant.endPollutant(builder);
    }
}

// AirQuality
export class AirQuality {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsAirQuality(bb, obj) {
        return (obj || new AirQuality()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsAirQuality(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new AirQuality()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    categoryIndex() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    index() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt16(this.bb_pos + t) : 0;
    }
    isSignificant() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return !!t && !!this.bb.readInt8(this.bb_pos + t);
    }
    pollutants(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 12);
        return i ? (optional || new Pollutant()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    pollutantsLength() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    previousDayComparison() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readInt8(this.bb_pos + t) : ComparisonTrend.UNKNOWN;
    }
    primaryPollutant() {
        const t = this.bb.__offset(this.bb_pos, 16);
        return t ? this.bb.readInt8(this.bb_pos + t) : PollutantType.NOT_AVAILABLE;
    }
    scale(encoding) {
        const e = this.bb.__offset(this.bb_pos, 18);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    static startAirQuality(builder) {
        builder.startObject(8);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addCategoryIndex(builder, value) {
        builder.addFieldInt8(1, value, 0);
    }
    static addIndex(builder, value) {
        builder.addFieldInt16(2, value, 0);
    }
    static addIsSignificant(builder, value) {
        builder.addFieldInt8(3, +value, 0);
    }
    static addPollutants(builder, value) {
        builder.addFieldOffset(4, value, 0);
    }
    static createPollutantsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPollutantsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPreviousDayComparison(builder, value) {
        builder.addFieldInt8(5, value, ComparisonTrend.UNKNOWN);
    }
    static addPrimaryPollutant(builder, value) {
        builder.addFieldInt8(6, value, PollutantType.NOT_AVAILABLE);
    }
    static addScale(builder, value) {
        builder.addFieldOffset(7, value, 0);
    }
    static endAirQuality(builder) {
        return builder.endObject();
    }
    static createAirQuality(builder, e, i, a, s, n, r, o, d) {
        return (
            AirQuality.startAirQuality(builder),
            AirQuality.addMetadata(builder, e),
            AirQuality.addCategoryIndex(builder, i),
            AirQuality.addIndex(builder, a),
            AirQuality.addIsSignificant(builder, s),
            AirQuality.addPollutants(builder, n),
            AirQuality.addPreviousDayComparison(builder, r),
            AirQuality.addPrimaryPollutant(builder, o),
            AirQuality.addScale(builder, d),
            AirQuality.endAirQuality(builder)
        );
    }
}

// UUID
export class UUID {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsUUID(bb, obj) {
        return (obj || new UUID()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsUUID(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new UUID()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    bytes(encoding) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? this.bb.readUint8(this.bb.__vector(this.bb_pos + e) + encoding) : 0;
    }
    bytesLength() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    bytesArray() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + t), this.bb.__vector_len(this.bb_pos + t)) : null;
    }
    static startUUID(builder) {
        builder.startObject(1);
    }
    static addBytes(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static createBytesVector(builder, data) {
        builder.startVector(1, data.length, 1);
        for (let i = data.length - 1; i >= 0; i--) builder.addInt8(data[i]);
        return builder.endVector();
    }
    static startBytesVector(builder, numElems) {
        builder.startVector(1, numElems, 1);
    }
    static endUUID(builder) {
        return builder.endObject();
    }
    static createUUID(builder, value) {
        return UUID.startUUID(builder), UUID.addBytes(builder, value), UUID.endUUID(builder);
    }
}

// Articles
export class Articles {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsArticles(bb, obj) {
        return (obj || new Articles()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsArticles(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Articles()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id(encoding) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    supportedStorefronts(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? this.bb.__string(this.bb.__vector(this.bb_pos + i) + 4 * index, optional) : null;
    }
    supportedStorefrontsLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    alertIds(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 8);
        return i ? (optional || new UUID()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    alertIdsLength() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    phenomena(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 10);
        return i ? this.bb.__string(this.bb.__vector(this.bb_pos + i) + 4 * index, optional) : null;
    }
    phenomenaLength() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    headlineOverride(encoding) {
        const e = this.bb.__offset(this.bb_pos, 12);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    locale(encoding) {
        const e = this.bb.__offset(this.bb_pos, 14);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    static startArticles(builder) {
        builder.startObject(6);
    }
    static addId(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addSupportedStorefronts(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createSupportedStorefrontsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startSupportedStorefrontsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addAlertIds(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static createAlertIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startAlertIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPhenomena(builder, value) {
        builder.addFieldOffset(3, value, 0);
    }
    static createPhenomenaVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPhenomenaVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addHeadlineOverride(builder, value) {
        builder.addFieldOffset(4, value, 0);
    }
    static addLocale(builder, value) {
        builder.addFieldOffset(5, value, 0);
    }
    static endArticles(builder) {
        return builder.endObject();
    }
    static createArticles(builder, e, i, a, s, n, r) {
        return Articles.startArticles(builder), Articles.addId(builder, e), Articles.addSupportedStorefronts(builder, i), Articles.addAlertIds(builder, a), Articles.addPhenomena(builder, s), Articles.addHeadlineOverride(builder, n), Articles.addLocale(builder, r), Articles.endArticles(builder);
    }
}

// Change
export class Change {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsChange(bb, obj) {
        return (obj || new Change()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsChange(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Change()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    forecastStart() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    forecastEnd() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    maxTemperatureChange() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : Direction.STEADY;
    }
    minTemperatureChange() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : Direction.STEADY;
    }
    dayPrecipitationChange() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readInt8(this.bb_pos + t) : Direction.STEADY;
    }
    nightPrecipitationChange() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readInt8(this.bb_pos + t) : Direction.STEADY;
    }
    static startChange(builder) {
        builder.startObject(6);
    }
    static addForecastStart(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addForecastEnd(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addMaxTemperatureChange(builder, value) {
        builder.addFieldInt8(2, value, Direction.STEADY);
    }
    static addMinTemperatureChange(builder, value) {
        builder.addFieldInt8(3, value, Direction.STEADY);
    }
    static addDayPrecipitationChange(builder, value) {
        builder.addFieldInt8(4, value, Direction.STEADY);
    }
    static addNightPrecipitationChange(builder, value) {
        builder.addFieldInt8(5, value, Direction.STEADY);
    }
    static endChange(builder) {
        return builder.endObject();
    }
    static createChange(builder, e, i, a, s, n, r) {
        return (
            Change.startChange(builder), Change.addForecastStart(builder, e), Change.addForecastEnd(builder, i), Change.addMaxTemperatureChange(builder, a), Change.addMinTemperatureChange(builder, s), Change.addDayPrecipitationChange(builder, n), Change.addNightPrecipitationChange(builder, r), Change.endChange(builder)
        );
    }
}

// Comparison
export class Comparison {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsComparison(bb, obj) {
        return (obj || new Comparison()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsComparison(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Comparison()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    condition() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readInt8(this.bb_pos + t) : ComparisonType2.UNKNOWN0;
    }
    currentValue() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    baselineValue() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    deviation() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : Deviation2.MUCHHIGHER;
    }
    baselineType() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    baselineStartDate() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    static startComparison(builder) {
        builder.startObject(6);
    }
    static addCondition(builder, value) {
        builder.addFieldInt8(0, value, ComparisonType2.UNKNOWN0);
    }
    static addCurrentValue(builder, value) {
        builder.addFieldFloat32(1, value, 0);
    }
    static addBaselineValue(builder, value) {
        builder.addFieldFloat32(2, value, 0);
    }
    static addDeviation(builder, value) {
        builder.addFieldInt8(3, value, Deviation2.MUCHHIGHER);
    }
    static addBaselineType(builder, value) {
        builder.addFieldInt32(4, value, 0);
    }
    static addBaselineStartDate(builder, value) {
        builder.addFieldInt32(5, value, 0);
    }
    static endComparison(builder) {
        return builder.endObject();
    }
    static createComparison(builder, e, i, a, s, n, r) {
        return (
            Comparison.startComparison(builder),
            Comparison.addCondition(builder, e),
            Comparison.addCurrentValue(builder, i),
            Comparison.addBaselineValue(builder, a),
            Comparison.addDeviation(builder, s),
            Comparison.addBaselineType(builder, n),
            Comparison.addBaselineStartDate(builder, r),
            Comparison.endComparison(builder)
        );
    }
}

// Parameter
export class Parameter {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsParameter(bb, obj) {
        return (obj || new Parameter()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsParameter(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Parameter()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    type() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readInt8(this.bb_pos + t) : ParameterType.FIRST_AT;
    }
    date() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    static startParameter(builder) {
        builder.startObject(2);
    }
    static addType(builder, value) {
        builder.addFieldInt8(0, value, ParameterType.FIRST_AT);
    }
    static addDate(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static endParameter(builder) {
        return builder.endObject();
    }
    static createParameter(builder, e, i) {
        return Parameter.startParameter(builder), Parameter.addType(builder, e), Parameter.addDate(builder, i), Parameter.endParameter(builder);
    }
}

// Condition
export class Condition {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsCondition(bb, obj) {
        return (obj || new Condition()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsCondition(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Condition()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    startTime() {
        const builder = this.bb.__offset(this.bb_pos, 4);
        return builder ? this.bb.readUint32(this.bb_pos + builder) : 0;
    }
    endTime() {
        const builder = this.bb.__offset(this.bb_pos, 6);
        return builder ? this.bb.readUint32(this.bb_pos + builder) : 0;
    }
    forecastToken() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : ForecastToken.CLEAR;
    }
    beginCondition() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : ConditionType.CLEAR;
    }
    endCondition() {
        const builder = this.bb.__offset(this.bb_pos, 12);
        return builder ? this.bb.readInt8(this.bb_pos + builder) : ConditionType.CLEAR;
    }
    parameters(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 14);
        return i ? (optional || new Parameter()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    parametersLength() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startCondition(builder) {
        builder.startObject(6);
    }
    static addStartTime(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addEndTime(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addForecastToken(builder, value) {
        builder.addFieldInt8(2, value, ForecastToken.CLEAR);
    }
    static addBeginCondition(builder, value) {
        builder.addFieldInt8(3, value, ConditionType.CLEAR);
    }
    static addEndCondition(builder, value) {
        builder.addFieldInt8(4, value, ConditionType.CLEAR);
    }
    static addParameters(builder, value) {
        builder.addFieldOffset(5, value, 0);
    }
    static createParametersVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startParametersVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endCondition(builder) {
        return builder.endObject();
    }
    static createCondition(builder, e, i, a, s, n, r) {
        return Condition.startCondition(builder), Condition.addStartTime(builder, e), Condition.addEndTime(builder, i), Condition.addForecastToken(builder, a), Condition.addBeginCondition(builder, s), Condition.addEndCondition(builder, n), Condition.addParameters(builder, r), Condition.endCondition(builder);
    }
}

// PrecipitationAmountByType
export class PrecipitationAmountByType {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsPrecipitationAmountByType(bb, obj) {
        return (obj || new PrecipitationAmountByType()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsPrecipitationAmountByType(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new PrecipitationAmountByType()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    precipitationType() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readInt8(this.bb_pos + t) : PrecipitationType.CLEAR;
    }
    expected() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    minimumSnow() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    maximumSnow() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    expectedSnow() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    static startPrecipitationAmountByType(builder) {
        builder.startObject(5);
    }
    static addPrecipitationType(builder, value) {
        builder.addFieldInt8(0, value, PrecipitationType.CLEAR);
    }
    static addExpected(builder, value) {
        builder.addFieldFloat32(1, value, 0);
    }
    static addMinimumSnow(builder, value) {
        builder.addFieldFloat32(2, value, 0);
    }
    static addMaximumSnow(builder, value) {
        builder.addFieldFloat32(3, value, 0);
    }
    static addExpectedSnow(builder, value) {
        builder.addFieldFloat32(4, value, 0);
    }
    static endPrecipitationAmountByType(builder) {
        return builder.endObject();
    }
    static createPrecipitationAmountByType(builder, e, i, a, s, n) {
        return (
            PrecipitationAmountByType.startPrecipitationAmountByType(builder),
            PrecipitationAmountByType.addPrecipitationType(builder, e),
            PrecipitationAmountByType.addExpected(builder, i),
            PrecipitationAmountByType.addMinimumSnow(builder, a),
            PrecipitationAmountByType.addMaximumSnow(builder, s),
            PrecipitationAmountByType.addExpectedSnow(builder, n),
            PrecipitationAmountByType.endPrecipitationAmountByType(builder)
        );
    }
}

// CurrentWeatherData
export class CurrentWeatherData {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsCurrentWeatherData(bb, obj) {
        return (obj || new CurrentWeatherData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsCurrentWeatherData(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new CurrentWeatherData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    asOf() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    cloudCover() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverLowAltPct() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverMidAltPct() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverHighAltPct() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    conditionCode() {
        const t = this.bb.__offset(this.bb_pos, 16);
        return t ? this.bb.readInt8(this.bb_pos + t) : WeatherCondition.CLEAR;
    }
    daylight() {
        const t = this.bb.__offset(this.bb_pos, 18);
        return !!t && !!this.bb.readInt8(this.bb_pos + t);
    }
    humidity() {
        const t = this.bb.__offset(this.bb_pos, 20);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    perceivedPrecipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 22);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmount1h() {
        const t = this.bb.__offset(this.bb_pos, 24);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmount6h() {
        const t = this.bb.__offset(this.bb_pos, 26);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmount24h() {
        const t = this.bb.__offset(this.bb_pos, 28);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmountNext1h() {
        const t = this.bb.__offset(this.bb_pos, 30);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmountNext6h() {
        const t = this.bb.__offset(this.bb_pos, 32);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmountNext24h() {
        const t = this.bb.__offset(this.bb_pos, 34);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmountNext1hByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 36);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountNext1hByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 36);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationAmountNext6hByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 38);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountNext6hByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 38);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationAmountNext24hByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 40);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountNext24hByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 40);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationAmountPrevious1hByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 42);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountPrevious1hByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 42);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationAmountPrevious6hByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 44);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountPrevious6hByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 44);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationAmountPrevious24hByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 46);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountPrevious24hByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 46);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 48);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    pressure() {
        const t = this.bb.__offset(this.bb_pos, 50);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    pressureTrend() {
        const t = this.bb.__offset(this.bb_pos, 52);
        return t ? this.bb.readInt8(this.bb_pos + t) : PressureTrend.RISING;
    }
    snowfallAmount1h() {
        const t = this.bb.__offset(this.bb_pos, 54);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    snowfallAmount6h() {
        const t = this.bb.__offset(this.bb_pos, 56);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    snowfallAmount24h() {
        const t = this.bb.__offset(this.bb_pos, 58);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    snowfallAmountNext1h() {
        const t = this.bb.__offset(this.bb_pos, 60);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    snowfallAmountNext6h() {
        const t = this.bb.__offset(this.bb_pos, 62);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    snowfallAmountNext24h() {
        const t = this.bb.__offset(this.bb_pos, 64);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperature() {
        const t = this.bb.__offset(this.bb_pos, 66);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureApparent() {
        const t = this.bb.__offset(this.bb_pos, 68);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    unknown34() {
        const t = this.bb.__offset(this.bb_pos, 70);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureDewPoint() {
        const t = this.bb.__offset(this.bb_pos, 72);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    uvIndex() {
        const t = this.bb.__offset(this.bb_pos, 74);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    visibility() {
        const t = this.bb.__offset(this.bb_pos, 76);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windDirection() {
        const t = this.bb.__offset(this.bb_pos, 78);
        return t ? this.bb.readInt16(this.bb_pos + t) : 0;
    }
    windGust() {
        const t = this.bb.__offset(this.bb_pos, 80);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windSpeed() {
        const t = this.bb.__offset(this.bb_pos, 82);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    static startCurrentWeatherData(builder) {
        builder.startObject(40);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addAsOf(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addCloudCover(builder, value) {
        builder.addFieldInt8(2, value, 0);
    }
    static addCloudCoverLowAltPct(builder, value) {
        builder.addFieldInt8(3, value, 0);
    }
    static addCloudCoverMidAltPct(builder, value) {
        builder.addFieldInt8(4, value, 0);
    }
    static addCloudCoverHighAltPct(builder, value) {
        builder.addFieldInt8(5, value, 0);
    }
    static addConditionCode(builder, value) {
        builder.addFieldInt8(6, value, WeatherCondition.CLEAR);
    }
    static addDaylight(builder, value) {
        builder.addFieldInt8(7, +value, 0);
    }
    static addHumidity(builder, value) {
        builder.addFieldInt8(8, value, 0);
    }
    static addPerceivedPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(9, value, 0);
    }
    static addPrecipitationAmount1h(builder, value) {
        builder.addFieldFloat32(10, value, 0);
    }
    static addPrecipitationAmount6h(builder, value) {
        builder.addFieldFloat32(11, value, 0);
    }
    static addPrecipitationAmount24h(builder, value) {
        builder.addFieldFloat32(12, value, 0);
    }
    static addPrecipitationAmountNext1h(builder, value) {
        builder.addFieldFloat32(13, value, 0);
    }
    static addPrecipitationAmountNext6h(builder, value) {
        builder.addFieldFloat32(14, value, 0);
    }
    static addPrecipitationAmountNext24h(builder, value) {
        builder.addFieldFloat32(15, value, 0);
    }
    static addPrecipitationAmountNext1hByType(builder, value) {
        builder.addFieldOffset(16, value, 0);
    }
    static createPrecipitationAmountNext1hByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountNext1hByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationAmountNext6hByType(builder, value) {
        builder.addFieldOffset(17, value, 0);
    }
    static createPrecipitationAmountNext6hByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountNext6hByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationAmountNext24hByType(builder, value) {
        builder.addFieldOffset(18, value, 0);
    }
    static createPrecipitationAmountNext24hByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountNext24hByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationAmountPrevious1hByType(builder, value) {
        builder.addFieldOffset(19, value, 0);
    }
    static createPrecipitationAmountPrevious1hByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountPrevious1hByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationAmountPrevious6hByType(builder, value) {
        builder.addFieldOffset(20, value, 0);
    }
    static createPrecipitationAmountPrevious6hByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountPrevious6hByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationAmountPrevious24hByType(builder, value) {
        builder.addFieldOffset(21, value, 0);
    }
    static createPrecipitationAmountPrevious24hByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountPrevious24hByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(22, value, 0);
    }
    static addPressure(builder, value) {
        builder.addFieldFloat32(23, value, 0);
    }
    static addPressureTrend(builder, value) {
        builder.addFieldInt8(24, value, PressureTrend.RISING);
    }
    static addSnowfallAmount1h(builder, value) {
        builder.addFieldFloat32(25, value, 0);
    }
    static addSnowfallAmount6h(builder, value) {
        builder.addFieldFloat32(26, value, 0);
    }
    static addSnowfallAmount24h(builder, value) {
        builder.addFieldFloat32(27, value, 0);
    }
    static addSnowfallAmountNext1h(builder, value) {
        builder.addFieldFloat32(28, value, 0);
    }
    static addSnowfallAmountNext6h(builder, value) {
        builder.addFieldFloat32(29, value, 0);
    }
    static addSnowfallAmountNext24h(builder, value) {
        builder.addFieldFloat32(30, value, 0);
    }
    static addTemperature(builder, value) {
        builder.addFieldFloat32(31, value, 0);
    }
    static addTemperatureApparent(builder, value) {
        builder.addFieldFloat32(32, value, 0);
    }
    static addUnknown34(builder, value) {
        builder.addFieldFloat32(33, value, 0);
    }
    static addTemperatureDewPoint(builder, value) {
        builder.addFieldFloat32(34, value, 0);
    }
    static addUvIndex(builder, value) {
        builder.addFieldInt8(35, value, 0);
    }
    static addVisibility(builder, value) {
        builder.addFieldFloat32(36, value, 0);
    }
    static addWindDirection(builder, value) {
        builder.addFieldInt16(37, value, 0);
    }
    static addWindGust(builder, value) {
        builder.addFieldFloat32(38, value, 0);
    }
    static addWindSpeed(builder, value) {
        builder.addFieldFloat32(39, value, 0);
    }
    static endCurrentWeatherData(builder) {
        return builder.endObject();
    }
    static createCurrentWeatherData(builder, e, i, a, s, n, r, o, d, c, l, u, p, b, h, m, _, y, f, g, N, C, x, A, I, T, v, S, O, F, w, P, E, M, R, U, W, L, D, B, $) {
        return (
            CurrentWeatherData.startCurrentWeatherData(builder),
            CurrentWeatherData.addMetadata(builder, e),
            CurrentWeatherData.addAsOf(builder, i),
            CurrentWeatherData.addCloudCover(builder, a),
            CurrentWeatherData.addCloudCoverLowAltPct(builder, s),
            CurrentWeatherData.addCloudCoverMidAltPct(builder, n),
            CurrentWeatherData.addCloudCoverHighAltPct(builder, r),
            CurrentWeatherData.addConditionCode(builder, o),
            CurrentWeatherData.addDaylight(builder, d),
            CurrentWeatherData.addHumidity(builder, c),
            CurrentWeatherData.addPerceivedPrecipitationIntensity(builder, l),
            CurrentWeatherData.addPrecipitationAmount1h(builder, u),
            CurrentWeatherData.addPrecipitationAmount6h(builder, p),
            CurrentWeatherData.addPrecipitationAmount24h(builder, b),
            CurrentWeatherData.addPrecipitationAmountNext1h(builder, h),
            CurrentWeatherData.addPrecipitationAmountNext6h(builder, m),
            CurrentWeatherData.addPrecipitationAmountNext24h(builder, _),
            CurrentWeatherData.addPrecipitationAmountNext1hByType(builder, y),
            CurrentWeatherData.addPrecipitationAmountNext6hByType(builder, f),
            CurrentWeatherData.addPrecipitationAmountNext24hByType(builder, g),
            CurrentWeatherData.addPrecipitationAmountPrevious1hByType(builder, N),
            CurrentWeatherData.addPrecipitationAmountPrevious6hByType(builder, C),
            CurrentWeatherData.addPrecipitationAmountPrevious24hByType(builder, x),
            CurrentWeatherData.addPrecipitationIntensity(builder, A),
            CurrentWeatherData.addPressure(builder, I),
            CurrentWeatherData.addPressureTrend(builder, T),
            CurrentWeatherData.addSnowfallAmount1h(builder, v),
            CurrentWeatherData.addSnowfallAmount6h(builder, S),
            CurrentWeatherData.addSnowfallAmount24h(builder, O),
            CurrentWeatherData.addSnowfallAmountNext1h(builder, F),
            CurrentWeatherData.addSnowfallAmountNext6h(builder, w),
            CurrentWeatherData.addSnowfallAmountNext24h(builder, P),
            CurrentWeatherData.addTemperature(builder, E),
            CurrentWeatherData.addTemperatureApparent(builder, M),
            CurrentWeatherData.addUnknown34(builder, R),
            CurrentWeatherData.addTemperatureDewPoint(builder, U),
            CurrentWeatherData.addUvIndex(builder, W),
            CurrentWeatherData.addVisibility(builder, L),
            CurrentWeatherData.addWindDirection(builder, D),
            CurrentWeatherData.addWindGust(builder, B),
            CurrentWeatherData.addWindSpeed(builder, $),
            CurrentWeatherData.endCurrentWeatherData(builder)
        );
    }
}

// DayPartForecast
export class DayPartForecast {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsDayPartForecast(bb, obj) {
        return (obj || new DayPartForecast()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDayPartForecast(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new DayPartForecast()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    forecastStart() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    forecastEnd() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    cloudCover() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverLowAltPct() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverMidAltPct() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverHighAltPct() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    conditionCode() {
        const t = this.bb.__offset(this.bb_pos, 16);
        return t ? this.bb.readInt8(this.bb_pos + t) : WeatherCondition.CLEAR;
    }
    humidity() {
        const t = this.bb.__offset(this.bb_pos, 18);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    humidityMax() {
        const t = this.bb.__offset(this.bb_pos, 20);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    humidityMin() {
        const t = this.bb.__offset(this.bb_pos, 22);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    precipitationAmount() {
        const t = this.bb.__offset(this.bb_pos, 24);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmountByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 26);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 26);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationChance() {
        const t = this.bb.__offset(this.bb_pos, 28);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    precipitationType() {
        const t = this.bb.__offset(this.bb_pos, 30);
        return t ? this.bb.readInt8(this.bb_pos + t) : PrecipitationType.CLEAR;
    }
    snowfallAmount() {
        const t = this.bb.__offset(this.bb_pos, 32);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureMax() {
        const t = this.bb.__offset(this.bb_pos, 34);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureMin() {
        const t = this.bb.__offset(this.bb_pos, 36);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    visibilityMax() {
        const t = this.bb.__offset(this.bb_pos, 38);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    visibilityMin() {
        const t = this.bb.__offset(this.bb_pos, 40);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windDirection() {
        const t = this.bb.__offset(this.bb_pos, 42);
        return t ? this.bb.readInt16(this.bb_pos + t) : 0;
    }
    windGustSpeedMax() {
        const t = this.bb.__offset(this.bb_pos, 44);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windSpeed() {
        const t = this.bb.__offset(this.bb_pos, 46);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windSpeedMax() {
        const t = this.bb.__offset(this.bb_pos, 48);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationIntensityMax() {
        const t = this.bb.__offset(this.bb_pos, 50);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    perceivedPrecipitationIntensityMax() {
        const t = this.bb.__offset(this.bb_pos, 52);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    uvIndexMin() {
        const t = this.bb.__offset(this.bb_pos, 54);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    uvIndexMax() {
        const t = this.bb.__offset(this.bb_pos, 56);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    temperatureApparentMin() {
        const t = this.bb.__offset(this.bb_pos, 58);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureApparentMax() {
        const t = this.bb.__offset(this.bb_pos, 60);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    daylight() {
        const t = this.bb.__offset(this.bb_pos, 62);
        return !!t && !!this.bb.readInt8(this.bb_pos + t);
    }
    static startDayPartForecast(builder) {
        builder.startObject(30);
    }
    static addForecastStart(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addForecastEnd(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addCloudCover(builder, value) {
        builder.addFieldInt8(2, value, 0);
    }
    static addCloudCoverLowAltPct(builder, value) {
        builder.addFieldInt8(3, value, 0);
    }
    static addCloudCoverMidAltPct(builder, value) {
        builder.addFieldInt8(4, value, 0);
    }
    static addCloudCoverHighAltPct(builder, value) {
        builder.addFieldInt8(5, value, 0);
    }
    static addConditionCode(builder, value) {
        builder.addFieldInt8(6, value, WeatherCondition.CLEAR);
    }
    static addHumidity(builder, value) {
        builder.addFieldInt8(7, value, 0);
    }
    static addHumidityMax(builder, value) {
        builder.addFieldInt8(8, value, 0);
    }
    static addHumidityMin(builder, value) {
        builder.addFieldInt8(9, value, 0);
    }
    static addPrecipitationAmount(builder, value) {
        builder.addFieldFloat32(10, value, 0);
    }
    static addPrecipitationAmountByType(builder, value) {
        builder.addFieldOffset(11, value, 0);
    }
    static createPrecipitationAmountByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationChance(builder, value) {
        builder.addFieldInt8(12, value, 0);
    }
    static addPrecipitationType(builder, value) {
        builder.addFieldInt8(13, value, PrecipitationType.CLEAR);
    }
    static addSnowfallAmount(builder, value) {
        builder.addFieldFloat32(14, value, 0);
    }
    static addTemperatureMax(builder, value) {
        builder.addFieldFloat32(15, value, 0);
    }
    static addTemperatureMin(builder, value) {
        builder.addFieldFloat32(16, value, 0);
    }
    static addVisibilityMax(builder, value) {
        builder.addFieldFloat32(17, value, 0);
    }
    static addVisibilityMin(builder, value) {
        builder.addFieldFloat32(18, value, 0);
    }
    static addWindDirection(builder, value) {
        builder.addFieldInt16(19, value, 0);
    }
    static addWindGustSpeedMax(builder, value) {
        builder.addFieldFloat32(20, value, 0);
    }
    static addWindSpeed(builder, value) {
        builder.addFieldFloat32(21, value, 0);
    }
    static addWindSpeedMax(builder, value) {
        builder.addFieldFloat32(22, value, 0);
    }
    static addPrecipitationIntensityMax(builder, value) {
        builder.addFieldFloat32(23, value, 0);
    }
    static addPerceivedPrecipitationIntensityMax(builder, value) {
        builder.addFieldFloat32(24, value, 0);
    }
    static addUvIndexMin(builder, value) {
        builder.addFieldInt8(25, value, 0);
    }
    static addUvIndexMax(builder, value) {
        builder.addFieldInt8(26, value, 0);
    }
    static addTemperatureApparentMin(builder, value) {
        builder.addFieldFloat32(27, value, 0);
    }
    static addTemperatureApparentMax(builder, value) {
        builder.addFieldFloat32(28, value, 0);
    }
    static addDaylight(builder, value) {
        builder.addFieldInt8(29, +value, 0);
    }
    static endDayPartForecast(builder) {
        return builder.endObject();
    }
    static createDayPartForecast(builder, e, i, a, s, n, r, o, d, c, l, u, p, b, h, m, _, y, f, g, N, C, x, A, I, T, v, S, O, F, w) {
        return (
            DayPartForecast.startDayPartForecast(builder),
            DayPartForecast.addForecastStart(builder, e),
            DayPartForecast.addForecastEnd(builder, i),
            DayPartForecast.addCloudCover(builder, a),
            DayPartForecast.addCloudCoverLowAltPct(builder, s),
            DayPartForecast.addCloudCoverMidAltPct(builder, n),
            DayPartForecast.addCloudCoverHighAltPct(builder, r),
            DayPartForecast.addConditionCode(builder, o),
            DayPartForecast.addHumidity(builder, d),
            DayPartForecast.addHumidityMax(builder, c),
            DayPartForecast.addHumidityMin(builder, l),
            DayPartForecast.addPrecipitationAmount(builder, u),
            DayPartForecast.addPrecipitationAmountByType(builder, p),
            DayPartForecast.addPrecipitationChance(builder, b),
            DayPartForecast.addPrecipitationType(builder, h),
            DayPartForecast.addSnowfallAmount(builder, m),
            DayPartForecast.addTemperatureMax(builder, _),
            DayPartForecast.addTemperatureMin(builder, y),
            DayPartForecast.addVisibilityMax(builder, f),
            DayPartForecast.addVisibilityMin(builder, g),
            DayPartForecast.addWindDirection(builder, N),
            DayPartForecast.addWindGustSpeedMax(builder, C),
            DayPartForecast.addWindSpeed(builder, x),
            DayPartForecast.addWindSpeedMax(builder, A),
            DayPartForecast.addPrecipitationIntensityMax(builder, I),
            DayPartForecast.addPerceivedPrecipitationIntensityMax(builder, T),
            DayPartForecast.addUvIndexMin(builder, v),
            DayPartForecast.addUvIndexMax(builder, S),
            DayPartForecast.addTemperatureApparentMin(builder, O),
            DayPartForecast.addTemperatureApparentMax(builder, F),
            DayPartForecast.addDaylight(builder, w),
            DayPartForecast.endDayPartForecast(builder)
        );
    }
}

// DayWeatherConditions
export class DayWeatherConditions {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsDayWeatherConditions(bb, obj) {
        return (obj || new DayWeatherConditions()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDayWeatherConditions(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new DayWeatherConditions()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    forecastStart() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    forecastEnd() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    conditionCode() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : WeatherCondition.CLEAR;
    }
    humidityMax() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    humidityMin() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    maxUvIndex() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    moonPhase() {
        const t = this.bb.__offset(this.bb_pos, 16);
        return t ? this.bb.readInt8(this.bb_pos + t) : MoonPhase.NEW;
    }
    moonrise() {
        const t = this.bb.__offset(this.bb_pos, 18);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    moonset() {
        const t = this.bb.__offset(this.bb_pos, 20);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    precipitationAmount() {
        const t = this.bb.__offset(this.bb_pos, 22);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmountByType(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 24);
        return i ? (optional || new PrecipitationAmountByType()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    precipitationAmountByTypeLength() {
        const t = this.bb.__offset(this.bb_pos, 24);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    precipitationChance() {
        const t = this.bb.__offset(this.bb_pos, 26);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    precipitationType() {
        const t = this.bb.__offset(this.bb_pos, 28);
        return t ? this.bb.readInt8(this.bb_pos + t) : PrecipitationType.CLEAR;
    }
    snowfallAmount() {
        const t = this.bb.__offset(this.bb_pos, 30);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    solarMidnight() {
        const t = this.bb.__offset(this.bb_pos, 32);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    solarNoon() {
        const t = this.bb.__offset(this.bb_pos, 34);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunrise() {
        const t = this.bb.__offset(this.bb_pos, 36);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunriseCivil() {
        const t = this.bb.__offset(this.bb_pos, 38);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunriseNautical() {
        const t = this.bb.__offset(this.bb_pos, 40);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunriseAstronomical() {
        const t = this.bb.__offset(this.bb_pos, 42);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunset() {
        const t = this.bb.__offset(this.bb_pos, 44);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunsetCivil() {
        const t = this.bb.__offset(this.bb_pos, 46);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunsetNautical() {
        const t = this.bb.__offset(this.bb_pos, 48);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    sunsetAstronomical() {
        const t = this.bb.__offset(this.bb_pos, 50);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    temperatureMax() {
        const t = this.bb.__offset(this.bb_pos, 52);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureMaxTime() {
        const t = this.bb.__offset(this.bb_pos, 54);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    temperatureMin() {
        const t = this.bb.__offset(this.bb_pos, 56);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureMinTime() {
        const t = this.bb.__offset(this.bb_pos, 58);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    windGustSpeedMax() {
        const t = this.bb.__offset(this.bb_pos, 60);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windSpeedAvg() {
        const t = this.bb.__offset(this.bb_pos, 62);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windSpeedMax() {
        const t = this.bb.__offset(this.bb_pos, 64);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    visibilityMax() {
        const t = this.bb.__offset(this.bb_pos, 66);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    visibilityMin() {
        const t = this.bb.__offset(this.bb_pos, 68);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    overnightForecast(optional) {
        const e = this.bb.__offset(this.bb_pos, 70);
        return e ? (optional || new DayPartForecast()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    daytimeForecast(optional) {
        const e = this.bb.__offset(this.bb_pos, 72);
        return e ? (optional || new DayPartForecast()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    restOfDayForecast(optional) {
        const e = this.bb.__offset(this.bb_pos, 74);
        return e ? (optional || new DayPartForecast()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    static startDayWeatherConditions(builder) {
        builder.startObject(36);
    }
    static addForecastStart(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addForecastEnd(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addConditionCode(builder, value) {
        builder.addFieldInt8(2, value, WeatherCondition.CLEAR);
    }
    static addHumidityMax(builder, value) {
        builder.addFieldInt8(3, value, 0);
    }
    static addHumidityMin(builder, value) {
        builder.addFieldInt8(4, value, 0);
    }
    static addMaxUvIndex(builder, value) {
        builder.addFieldInt8(5, value, 0);
    }
    static addMoonPhase(builder, value) {
        builder.addFieldInt8(6, value, MoonPhase.NEW);
    }
    static addMoonrise(builder, value) {
        builder.addFieldInt32(7, value, 0);
    }
    static addMoonset(builder, value) {
        builder.addFieldInt32(8, value, 0);
    }
    static addPrecipitationAmount(builder, value) {
        builder.addFieldFloat32(9, value, 0);
    }
    static addPrecipitationAmountByType(builder, value) {
        builder.addFieldOffset(10, value, 0);
    }
    static createPrecipitationAmountByTypeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPrecipitationAmountByTypeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPrecipitationChance(builder, value) {
        builder.addFieldInt8(11, value, 0);
    }
    static addPrecipitationType(builder, value) {
        builder.addFieldInt8(12, value, PrecipitationType.CLEAR);
    }
    static addSnowfallAmount(builder, value) {
        builder.addFieldFloat32(13, value, 0);
    }
    static addSolarMidnight(builder, value) {
        builder.addFieldInt32(14, value, 0);
    }
    static addSolarNoon(builder, value) {
        builder.addFieldInt32(15, value, 0);
    }
    static addSunrise(builder, value) {
        builder.addFieldInt32(16, value, 0);
    }
    static addSunriseCivil(builder, value) {
        builder.addFieldInt32(17, value, 0);
    }
    static addSunriseNautical(builder, value) {
        builder.addFieldInt32(18, value, 0);
    }
    static addSunriseAstronomical(builder, value) {
        builder.addFieldInt32(19, value, 0);
    }
    static addSunset(builder, value) {
        builder.addFieldInt32(20, value, 0);
    }
    static addSunsetCivil(builder, value) {
        builder.addFieldInt32(21, value, 0);
    }
    static addSunsetNautical(builder, value) {
        builder.addFieldInt32(22, value, 0);
    }
    static addSunsetAstronomical(builder, value) {
        builder.addFieldInt32(23, value, 0);
    }
    static addTemperatureMax(builder, value) {
        builder.addFieldFloat32(24, value, 0);
    }
    static addTemperatureMaxTime(builder, value) {
        builder.addFieldInt32(25, value, 0);
    }
    static addTemperatureMin(builder, value) {
        builder.addFieldFloat32(26, value, 0);
    }
    static addTemperatureMinTime(builder, value) {
        builder.addFieldInt32(27, value, 0);
    }
    static addWindGustSpeedMax(builder, value) {
        builder.addFieldFloat32(28, value, 0);
    }
    static addWindSpeedAvg(builder, value) {
        builder.addFieldFloat32(29, value, 0);
    }
    static addWindSpeedMax(builder, value) {
        builder.addFieldFloat32(30, value, 0);
    }
    static addVisibilityMax(builder, value) {
        builder.addFieldFloat32(31, value, 0);
    }
    static addVisibilityMin(builder, value) {
        builder.addFieldFloat32(32, value, 0);
    }
    static addOvernightForecast(builder, value) {
        builder.addFieldOffset(33, value, 0);
    }
    static addDaytimeForecast(builder, value) {
        builder.addFieldOffset(34, value, 0);
    }
    static addRestOfDayForecast(builder, value) {
        builder.addFieldOffset(35, value, 0);
    }
    static endDayWeatherConditions(builder) {
        return builder.endObject();
    }
}

// DailyForecastData
export class DailyForecastData {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsDailyForecastData(bb, obj) {
        return (obj || new DailyForecastData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDailyForecastData(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new DailyForecastData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    days(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? (optional || new DayWeatherConditions()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    daysLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startDailyForecastData(builder) {
        builder.startObject(2);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addDays(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createDaysVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startDaysVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endDailyForecastData(builder) {
        return builder.endObject();
    }
    static createDailyForecastData(builder, e, i) {
        return DailyForecastData.startDailyForecastData(builder), DailyForecastData.addMetadata(builder, e), DailyForecastData.addDays(builder, i), DailyForecastData.endDailyForecastData(builder);
    }
}

// ForecastMinute
export class ForecastMinute {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsForecastMinute(bb, obj) {
        return (obj || new ForecastMinute()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsForecastMinute(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new ForecastMinute()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    startTime() {
        const builder = this.bb.__offset(this.bb_pos, 4);
        return builder ? this.bb.readUint32(this.bb_pos + builder) : 0;
    }
    precipitationChance() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    precipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    perceivedPrecipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    static startForecastMinute(builder) {
        builder.startObject(4);
    }
    static addStartTime(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addPrecipitationChance(builder, value) {
        builder.addFieldInt8(1, value, 0);
    }
    static addPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(2, value, 0);
    }
    static addPerceivedPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(3, value, 0);
    }
    static endForecastMinute(builder) {
        return builder.endObject();
    }
    static createForecastMinute(builder, e, i, a, s) {
        return ForecastMinute.startForecastMinute(builder), ForecastMinute.addStartTime(builder, e), ForecastMinute.addPrecipitationChance(builder, i), ForecastMinute.addPrecipitationIntensity(builder, a), ForecastMinute.addPerceivedPrecipitationIntensity(builder, s), ForecastMinute.endForecastMinute(builder);
    }
}

// ForecastPeriodSummary
export class ForecastPeriodSummary {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsForecastPeriodSummary(bb, obj) {
        return (obj || new ForecastPeriodSummary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsForecastPeriodSummary(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new ForecastPeriodSummary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    startTime() {
        const builder = this.bb.__offset(this.bb_pos, 4);
        return builder ? this.bb.readUint32(this.bb_pos + builder) : 0;
    }
    endTime() {
        const builder = this.bb.__offset(this.bb_pos, 6);
        return builder ? this.bb.readUint32(this.bb_pos + builder) : 0;
    }
    condition() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : PrecipitationType.CLEAR;
    }
    precipitationChance() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    precipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    static startForecastPeriodSummary(builder) {
        builder.startObject(5);
    }
    static addStartTime(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addEndTime(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addCondition(builder, value) {
        builder.addFieldInt8(2, value, PrecipitationType.CLEAR);
    }
    static addPrecipitationChance(builder, value) {
        builder.addFieldInt8(3, value, 0);
    }
    static addPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(4, value, 0);
    }
    static endForecastPeriodSummary(builder) {
        return builder.endObject();
    }
    static createForecastPeriodSummary(builder, e, i, a, s, n) {
        return (
            ForecastPeriodSummary.startForecastPeriodSummary(builder),
            ForecastPeriodSummary.addStartTime(builder, e),
            ForecastPeriodSummary.addEndTime(builder, i),
            ForecastPeriodSummary.addCondition(builder, a),
            ForecastPeriodSummary.addPrecipitationChance(builder, s),
            ForecastPeriodSummary.addPrecipitationIntensity(builder, n),
            ForecastPeriodSummary.endForecastPeriodSummary(builder)
        );
    }
}

// HistoricalComparison
export class HistoricalComparison {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsHistoricalComparison(bb, obj) {
        return (obj || new HistoricalComparison()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsHistoricalComparison(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new HistoricalComparison()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    comparisons(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? (optional || new Comparison()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    comparisonsLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startHistoricalComparison(builder) {
        builder.startObject(2);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addComparisons(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createComparisonsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startComparisonsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endHistoricalComparison(builder) {
        return builder.endObject();
    }
    static createHistoricalComparison(builder, e, i) {
        return HistoricalComparison.startHistoricalComparison(builder), HistoricalComparison.addMetadata(builder, e), HistoricalComparison.addComparisons(builder, i), HistoricalComparison.endHistoricalComparison(builder);
    }
}

// HourWeatherConditions
export class HourWeatherConditions {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsHourWeatherConditions(bb, obj) {
        return (obj || new HourWeatherConditions()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsHourWeatherConditions(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new HourWeatherConditions()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    forecastStart() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    cloudCover() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverLowAltPct() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverMidAltPct() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    cloudCoverHighAltPct() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    conditionCode() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.readInt8(this.bb_pos + t) : WeatherCondition.CLEAR;
    }
    daylight() {
        const t = this.bb.__offset(this.bb_pos, 16);
        return !!t && !!this.bb.readInt8(this.bb_pos + t);
    }
    humidity() {
        const t = this.bb.__offset(this.bb_pos, 18);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    perceivedPrecipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 20);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationAmount() {
        const t = this.bb.__offset(this.bb_pos, 22);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationIntensity() {
        const t = this.bb.__offset(this.bb_pos, 24);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    precipitationChance() {
        const t = this.bb.__offset(this.bb_pos, 26);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    precipitationType() {
        const t = this.bb.__offset(this.bb_pos, 28);
        return t ? this.bb.readInt8(this.bb_pos + t) : PrecipitationType.CLEAR;
    }
    pressure() {
        const t = this.bb.__offset(this.bb_pos, 30);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    pressureTrend() {
        const t = this.bb.__offset(this.bb_pos, 32);
        return t ? this.bb.readInt8(this.bb_pos + t) : PressureTrend.RISING;
    }
    snowfallAmount() {
        const t = this.bb.__offset(this.bb_pos, 34);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    snowfallIntensity() {
        const t = this.bb.__offset(this.bb_pos, 36);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperature() {
        const t = this.bb.__offset(this.bb_pos, 38);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureApparent() {
        const t = this.bb.__offset(this.bb_pos, 40);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    unknown20() {
        const t = this.bb.__offset(this.bb_pos, 42);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    temperatureDewPoint() {
        const t = this.bb.__offset(this.bb_pos, 44);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    uvIndex() {
        const t = this.bb.__offset(this.bb_pos, 46);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    visibility() {
        const t = this.bb.__offset(this.bb_pos, 48);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windDirection() {
        const t = this.bb.__offset(this.bb_pos, 50);
        return t ? this.bb.readInt16(this.bb_pos + t) : 0;
    }
    windGust() {
        const t = this.bb.__offset(this.bb_pos, 52);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    windSpeed() {
        const t = this.bb.__offset(this.bb_pos, 54);
        return t ? this.bb.readFloat32(this.bb_pos + t) : 0;
    }
    static startHourWeatherConditions(builder) {
        builder.startObject(26);
    }
    static addForecastStart(builder, value) {
        builder.addFieldInt32(0, value, 0);
    }
    static addCloudCover(builder, value) {
        builder.addFieldInt8(1, value, 0);
    }
    static addCloudCoverLowAltPct(builder, value) {
        builder.addFieldInt8(2, value, 0);
    }
    static addCloudCoverMidAltPct(builder, value) {
        builder.addFieldInt8(3, value, 0);
    }
    static addCloudCoverHighAltPct(builder, value) {
        builder.addFieldInt8(4, value, 0);
    }
    static addConditionCode(builder, value) {
        builder.addFieldInt8(5, value, WeatherCondition.CLEAR);
    }
    static addDaylight(builder, value) {
        builder.addFieldInt8(6, +value, 0);
    }
    static addHumidity(builder, value) {
        builder.addFieldInt8(7, value, 0);
    }
    static addPerceivedPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(8, value, 0);
    }
    static addPrecipitationAmount(builder, value) {
        builder.addFieldFloat32(9, value, 0);
    }
    static addPrecipitationIntensity(builder, value) {
        builder.addFieldFloat32(10, value, 0);
    }
    static addPrecipitationChance(builder, value) {
        builder.addFieldInt8(11, value, 0);
    }
    static addPrecipitationType(builder, value) {
        builder.addFieldInt8(12, value, PrecipitationType.CLEAR);
    }
    static addPressure(builder, value) {
        builder.addFieldFloat32(13, value, 0);
    }
    static addPressureTrend(builder, value) {
        builder.addFieldInt8(14, value, PressureTrend.RISING);
    }
    static addSnowfallAmount(builder, value) {
        builder.addFieldFloat32(15, value, 0);
    }
    static addSnowfallIntensity(builder, value) {
        builder.addFieldFloat32(16, value, 0);
    }
    static addTemperature(builder, value) {
        builder.addFieldFloat32(17, value, 0);
    }
    static addTemperatureApparent(builder, value) {
        builder.addFieldFloat32(18, value, 0);
    }
    static addUnknown20(builder, value) {
        builder.addFieldFloat32(19, value, 0);
    }
    static addTemperatureDewPoint(builder, value) {
        builder.addFieldFloat32(20, value, 0);
    }
    static addUvIndex(builder, value) {
        builder.addFieldInt8(21, value, 0);
    }
    static addVisibility(builder, value) {
        builder.addFieldFloat32(22, value, 0);
    }
    static addWindDirection(builder, value) {
        builder.addFieldInt16(23, value, 0);
    }
    static addWindGust(builder, value) {
        builder.addFieldFloat32(24, value, 0);
    }
    static addWindSpeed(builder, value) {
        builder.addFieldFloat32(25, value, 0);
    }
    static endHourWeatherConditions(builder) {
        return builder.endObject();
    }
    static createHourWeatherConditions(builder, e, i, a, s, n, r, o, d, c, l, u, p, b, h, m, _, y, f, g, N, C, x, A, I, T, v) {
        return (
            HourWeatherConditions.startHourWeatherConditions(builder),
            HourWeatherConditions.addForecastStart(builder, e),
            HourWeatherConditions.addCloudCover(builder, i),
            HourWeatherConditions.addCloudCoverLowAltPct(builder, a),
            HourWeatherConditions.addCloudCoverMidAltPct(builder, s),
            HourWeatherConditions.addCloudCoverHighAltPct(builder, n),
            HourWeatherConditions.addConditionCode(builder, r),
            HourWeatherConditions.addDaylight(builder, o),
            HourWeatherConditions.addHumidity(builder, d),
            HourWeatherConditions.addPerceivedPrecipitationIntensity(builder, c),
            HourWeatherConditions.addPrecipitationAmount(builder, l),
            HourWeatherConditions.addPrecipitationIntensity(builder, u),
            HourWeatherConditions.addPrecipitationChance(builder, p),
            HourWeatherConditions.addPrecipitationType(builder, b),
            HourWeatherConditions.addPressure(builder, h),
            HourWeatherConditions.addPressureTrend(builder, m),
            HourWeatherConditions.addSnowfallAmount(builder, _),
            HourWeatherConditions.addSnowfallIntensity(builder, y),
            HourWeatherConditions.addTemperature(builder, f),
            HourWeatherConditions.addTemperatureApparent(builder, g),
            HourWeatherConditions.addUnknown20(builder, N),
            HourWeatherConditions.addTemperatureDewPoint(builder, C),
            HourWeatherConditions.addUvIndex(builder, x),
            HourWeatherConditions.addVisibility(builder, A),
            HourWeatherConditions.addWindDirection(builder, I),
            HourWeatherConditions.addWindGust(builder, T),
            HourWeatherConditions.addWindSpeed(builder, v),
            HourWeatherConditions.endHourWeatherConditions(builder)
        );
    }
}

// HourlyForecastData
export class HourlyForecastData {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsHourlyForecastData(bb, obj) {
        return (obj || new HourlyForecastData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsHourlyForecastData(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new HourlyForecastData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    hours(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? (optional || new HourWeatherConditions()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    hoursLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startHourlyForecastData(builder) {
        builder.startObject(2);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addHours(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createHoursVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startHoursVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endHourlyForecastData(builder) {
        return builder.endObject();
    }
    static createHourlyForecastData(builder, e, i) {
        return HourlyForecastData.startHourlyForecastData(builder), HourlyForecastData.addMetadata(builder, e), HourlyForecastData.addHours(builder, i), HourlyForecastData.endHourlyForecastData(builder);
    }
}

// LocationInfo
export class LocationInfo {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsLocationInfo(bb, obj) {
        return (obj || new LocationInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsLocationInfo(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new LocationInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    preciseName(encoding) {
        const e = this.bb.__offset(this.bb_pos, 6);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    countryCode(encoding) {
        const e = this.bb.__offset(this.bb_pos, 8);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    timeZone(encoding) {
        const e = this.bb.__offset(this.bb_pos, 10);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    primaryName(encoding) {
        const e = this.bb.__offset(this.bb_pos, 12);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    static startLocationInfo(builder) {
        builder.startObject(5);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addPreciseName(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static addCountryCode(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static addTimeZone(builder, value) {
        builder.addFieldOffset(3, value, 0);
    }
    static addPrimaryName(builder, value) {
        builder.addFieldOffset(4, value, 0);
    }
    static endLocationInfo(builder) {
        return builder.endObject();
    }
    static createLocationInfo(builder, e, i, a, s, n) {
        return LocationInfo.startLocationInfo(builder), LocationInfo.addMetadata(builder, e), LocationInfo.addPreciseName(builder, i), LocationInfo.addCountryCode(builder, a), LocationInfo.addTimeZone(builder, s), LocationInfo.addPrimaryName(builder, n), LocationInfo.endLocationInfo(builder);
    }
}

// Placement
export class Placement {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsPlacement(bb, obj) {
        return (obj || new Placement()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsPlacement(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Placement()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    priority() {
        const t = this.bb.__offset(this.bb_pos, 4);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    articles(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? (optional || new Articles()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    articlesLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    placement() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readInt8(this.bb_pos + t) : PlacementType.UNKNOWN0;
    }
    static startPlacement(builder) {
        builder.startObject(3);
    }
    static addPriority(builder, value) {
        builder.addFieldInt8(0, value, 0);
    }
    static addArticles(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createArticlesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startArticlesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addPlacement(builder, value) {
        builder.addFieldInt8(2, value, PlacementType.UNKNOWN0);
    }
    static endPlacement(builder) {
        return builder.endObject();
    }
    static createPlacement(builder, e, i, a) {
        return Placement.startPlacement(builder), Placement.addPriority(builder, e), Placement.addArticles(builder, i), Placement.addPlacement(builder, a), Placement.endPlacement(builder);
    }
}

// News
export class News {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsNews(bb, obj) {
        return (obj || new News()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsNews(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new News()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    placements(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? (optional || new Placement()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    placementsLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startNews(builder) {
        builder.startObject(2);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addPlacements(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createPlacementsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startPlacementsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endNews(builder) {
        return builder.endObject();
    }
    static createNews(builder, e, i) {
        return News.startNews(builder), News.addMetadata(builder, e), News.addPlacements(builder, i), News.endNews(builder);
    }
}

// NextHourForecastData
export class NextHourForecastData {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsNextHourForecastData(bb, obj) {
        return (obj || new NextHourForecastData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsNextHourForecastData(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new NextHourForecastData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    condition(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 6);
        return i ? (optional || new Condition()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    conditionLength() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    summary(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 8);
        return i ? (optional || new ForecastPeriodSummary()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    summaryLength() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    forecastStart() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    forecastEnd() {
        const t = this.bb.__offset(this.bb_pos, 12);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    minutes(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 14);
        return i ? (optional || new ForecastMinute()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    minutesLength() {
        const t = this.bb.__offset(this.bb_pos, 14);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startNextHourForecastData(builder) {
        builder.startObject(6);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addCondition(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static createConditionVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startConditionVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addSummary(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static createSummaryVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startSummaryVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addForecastStart(builder, value) {
        builder.addFieldInt32(3, value, 0);
    }
    static addForecastEnd(builder, value) {
        builder.addFieldInt32(4, value, 0);
    }
    static addMinutes(builder, value) {
        builder.addFieldOffset(5, value, 0);
    }
    static createMinutesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startMinutesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endNextHourForecastData(builder) {
        return builder.endObject();
    }
    static createNextHourForecastData(builder, e, i, a, s, n, r) {
        return (
            NextHourForecastData.startNextHourForecastData(builder),
            NextHourForecastData.addMetadata(builder, e),
            NextHourForecastData.addCondition(builder, i),
            NextHourForecastData.addSummary(builder, a),
            NextHourForecastData.addForecastStart(builder, s),
            NextHourForecastData.addForecastEnd(builder, n),
            NextHourForecastData.addMinutes(builder, r),
            NextHourForecastData.endNextHourForecastData(builder)
        );
    }
}

// WeatherAlertSummary
export class WeatherAlertSummary {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsWeatherAlertSummary(bb, obj) {
        return (obj || new WeatherAlertSummary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsWeatherAlertSummary(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new WeatherAlertSummary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new UUID()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    areaId(encoding) {
        const e = this.bb.__offset(this.bb_pos, 6);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    areaName(encoding) {
        const e = this.bb.__offset(this.bb_pos, 8);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    attributionUrl(encoding) {
        const e = this.bb.__offset(this.bb_pos, 10);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    countryCode(encoding) {
        const e = this.bb.__offset(this.bb_pos, 12);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    description(encoding) {
        const e = this.bb.__offset(this.bb_pos, 14);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    token(encoding) {
        const e = this.bb.__offset(this.bb_pos, 16);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    effectiveTime() {
        const t = this.bb.__offset(this.bb_pos, 18);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    expireTime() {
        const t = this.bb.__offset(this.bb_pos, 20);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    issuedTime() {
        const t = this.bb.__offset(this.bb_pos, 22);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    eventOnsetTime() {
        const t = this.bb.__offset(this.bb_pos, 24);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    eventEndTime() {
        const t = this.bb.__offset(this.bb_pos, 26);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    detailsUrl(encoding) {
        const e = this.bb.__offset(this.bb_pos, 28);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    phenomenon(encoding) {
        const e = this.bb.__offset(this.bb_pos, 30);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    severity() {
        const t = this.bb.__offset(this.bb_pos, 32);
        return t ? this.bb.readInt8(this.bb_pos + t) : Severity.UNKNOWN;
    }
    significance() {
        const t = this.bb.__offset(this.bb_pos, 34);
        return t ? this.bb.readInt8(this.bb_pos + t) : SignificanceType.UNKNOWN;
    }
    source(encoding) {
        const e = this.bb.__offset(this.bb_pos, 36);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    eventSource(encoding) {
        const e = this.bb.__offset(this.bb_pos, 38);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    urgency() {
        const t = this.bb.__offset(this.bb_pos, 40);
        return t ? this.bb.readInt8(this.bb_pos + t) : Urgency.UNKNOWN;
    }
    certainty() {
        const t = this.bb.__offset(this.bb_pos, 42);
        return t ? this.bb.readInt8(this.bb_pos + t) : Certainty.UNKNOWN;
    }
    importance() {
        const t = this.bb.__offset(this.bb_pos, 44);
        return t ? this.bb.readInt8(this.bb_pos + t) : ImportanceType.NORMAL;
    }
    responses(encoding) {
        const e = this.bb.__offset(this.bb_pos, 46);
        return e ? this.bb.readInt8(this.bb.__vector(this.bb_pos + e) + encoding) : 0;
    }
    responsesLength() {
        const t = this.bb.__offset(this.bb_pos, 46);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    responsesArray() {
        const t = this.bb.__offset(this.bb_pos, 46);
        return t ? new Int8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + t), this.bb.__vector_len(this.bb_pos + t)) : null;
    }
    unknown23() {
        const t = this.bb.__offset(this.bb_pos, 48);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    unknown24() {
        const t = this.bb.__offset(this.bb_pos, 50);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    unknown25() {
        const t = this.bb.__offset(this.bb_pos, 52);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    unknown26() {
        const t = this.bb.__offset(this.bb_pos, 54);
        return t ? this.bb.readInt8(this.bb_pos + t) : 0;
    }
    static startWeatherAlertSummary(builder) {
        builder.startObject(26);
    }
    static addId(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addAreaId(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static addAreaName(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static addAttributionUrl(builder, value) {
        builder.addFieldOffset(3, value, 0);
    }
    static addCountryCode(builder, value) {
        builder.addFieldOffset(4, value, 0);
    }
    static addDescription(builder, value) {
        builder.addFieldOffset(5, value, 0);
    }
    static addToken(builder, value) {
        builder.addFieldOffset(6, value, 0);
    }
    static addEffectiveTime(builder, value) {
        builder.addFieldInt32(7, value, 0);
    }
    static addExpireTime(builder, value) {
        builder.addFieldInt32(8, value, 0);
    }
    static addIssuedTime(builder, value) {
        builder.addFieldInt32(9, value, 0);
    }
    static addEventOnsetTime(builder, value) {
        builder.addFieldInt32(10, value, 0);
    }
    static addEventEndTime(builder, value) {
        builder.addFieldInt32(11, value, 0);
    }
    static addDetailsUrl(builder, value) {
        builder.addFieldOffset(12, value, 0);
    }
    static addPhenomenon(builder, value) {
        builder.addFieldOffset(13, value, 0);
    }
    static addSeverity(builder, value) {
        builder.addFieldInt8(14, value, Severity.UNKNOWN);
    }
    static addSignificance(builder, value) {
        builder.addFieldInt8(15, value, SignificanceType.UNKNOWN);
    }
    static addSource(builder, value) {
        builder.addFieldOffset(16, value, 0);
    }
    static addEventSource(builder, value) {
        builder.addFieldOffset(17, value, 0);
    }
    static addUrgency(builder, value) {
        builder.addFieldInt8(18, value, Urgency.UNKNOWN);
    }
    static addCertainty(builder, value) {
        builder.addFieldInt8(19, value, Certainty.UNKNOWN);
    }
    static addImportance(builder, value) {
        builder.addFieldInt8(20, value, ImportanceType.NORMAL);
    }
    static addResponses(builder, value) {
        builder.addFieldOffset(21, value, 0);
    }
    static createResponsesVector(builder, data) {
        builder.startVector(1, data.length, 1);
        for (let i = data.length - 1; i >= 0; i--) builder.addInt8(data[i]);
        return builder.endVector();
    }
    static startResponsesVector(builder, numElems) {
        builder.startVector(1, numElems, 1);
    }
    static addUnknown23(builder, value) {
        builder.addFieldInt8(22, value, 0);
    }
    static addUnknown24(builder, value) {
        builder.addFieldInt8(23, value, 0);
    }
    static addUnknown25(builder, value) {
        builder.addFieldInt8(24, value, 0);
    }
    static addUnknown26(builder, value) {
        builder.addFieldInt8(25, value, 0);
    }
    static endWeatherAlertSummary(builder) {
        return builder.endObject();
    }
    static createWeatherAlertSummary(builder, e, i, a, s, n, r, o, d, c, l, u, p, b, h, m, _, y, f, g, N, C, x, A, I, T, v) {
        return (
            WeatherAlertSummary.startWeatherAlertSummary(builder),
            WeatherAlertSummary.addId(builder, e),
            WeatherAlertSummary.addAreaId(builder, i),
            WeatherAlertSummary.addAreaName(builder, a),
            WeatherAlertSummary.addAttributionUrl(builder, s),
            WeatherAlertSummary.addCountryCode(builder, n),
            WeatherAlertSummary.addDescription(builder, r),
            WeatherAlertSummary.addToken(builder, o),
            WeatherAlertSummary.addEffectiveTime(builder, d),
            WeatherAlertSummary.addExpireTime(builder, c),
            WeatherAlertSummary.addIssuedTime(builder, l),
            WeatherAlertSummary.addEventOnsetTime(builder, u),
            WeatherAlertSummary.addEventEndTime(builder, p),
            WeatherAlertSummary.addDetailsUrl(builder, b),
            WeatherAlertSummary.addPhenomenon(builder, h),
            WeatherAlertSummary.addSeverity(builder, m),
            WeatherAlertSummary.addSignificance(builder, _),
            WeatherAlertSummary.addSource(builder, y),
            WeatherAlertSummary.addEventSource(builder, f),
            WeatherAlertSummary.addUrgency(builder, g),
            WeatherAlertSummary.addCertainty(builder, N),
            WeatherAlertSummary.addImportance(builder, C),
            WeatherAlertSummary.addResponses(builder, x),
            WeatherAlertSummary.addUnknown23(builder, A),
            WeatherAlertSummary.addUnknown24(builder, I),
            WeatherAlertSummary.addUnknown25(builder, T),
            WeatherAlertSummary.addUnknown26(builder, v),
            WeatherAlertSummary.endWeatherAlertSummary(builder)
        );
    }
}

// WeatherAlertCollectionData
export class WeatherAlertCollectionData {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsWeatherAlertCollectionData(bb, obj) {
        return (obj || new WeatherAlertCollectionData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsWeatherAlertCollectionData(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new WeatherAlertCollectionData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    detailsUrl(encoding) {
        const e = this.bb.__offset(this.bb_pos, 6);
        return e ? this.bb.__string(this.bb_pos + e, encoding) : null;
    }
    alerts(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 8);
        return i ? (optional || new WeatherAlertSummary()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    alertsLength() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startWeatherAlertCollectionData(builder) {
        builder.startObject(3);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addDetailsUrl(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static addAlerts(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static createAlertsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startAlertsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endWeatherAlertCollectionData(builder) {
        return builder.endObject();
    }
    static createWeatherAlertCollectionData(builder, e, i, a) {
        return WeatherAlertCollectionData.startWeatherAlertCollectionData(builder), WeatherAlertCollectionData.addMetadata(builder, e), WeatherAlertCollectionData.addDetailsUrl(builder, i), WeatherAlertCollectionData.addAlerts(builder, a), WeatherAlertCollectionData.endWeatherAlertCollectionData(builder);
    }
}

// WeatherChanges
export class WeatherChanges {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsWeatherChanges(bb, obj) {
        return (obj || new WeatherChanges()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsWeatherChanges(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new WeatherChanges()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    metadata(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new Metadata()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    forecastStart() {
        const t = this.bb.__offset(this.bb_pos, 6);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    forecastEnd() {
        const t = this.bb.__offset(this.bb_pos, 8);
        return t ? this.bb.readUint32(this.bb_pos + t) : 0;
    }
    changes(index, optional) {
        const i = this.bb.__offset(this.bb_pos, 10);
        return i ? (optional || new Change()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + i) + 4 * index), this.bb) : null;
    }
    changesLength() {
        const t = this.bb.__offset(this.bb_pos, 10);
        return t ? this.bb.__vector_len(this.bb_pos + t) : 0;
    }
    static startWeatherChanges(builder) {
        builder.startObject(4);
    }
    static addMetadata(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addForecastStart(builder, value) {
        builder.addFieldInt32(1, value, 0);
    }
    static addForecastEnd(builder, value) {
        builder.addFieldInt32(2, value, 0);
    }
    static addChanges(builder, value) {
        builder.addFieldOffset(3, value, 0);
    }
    static createChangesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) builder.addOffset(data[i]);
        return builder.endVector();
    }
    static startChangesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endWeatherChanges(builder) {
        return builder.endObject();
    }
    static createWeatherChanges(builder, e, i, a, s) {
        return WeatherChanges.startWeatherChanges(builder), WeatherChanges.addMetadata(builder, e), WeatherChanges.addForecastStart(builder, i), WeatherChanges.addForecastEnd(builder, a), WeatherChanges.addChanges(builder, s), WeatherChanges.endWeatherChanges(builder);
    }
}

// Weather
export class Weather {
    bb = null;
    bb_pos = 0;
    __init(pos, bb) {
        return (this.bb_pos = pos), (this.bb = bb), this;
    }
    static getRootAsWeather(bb, obj) {
        return (obj || new Weather()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsWeather(bb, obj) {
        return bb.setPosition(bb.position() + 4), (obj || new Weather()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    airQuality(optional) {
        const e = this.bb.__offset(this.bb_pos, 4);
        return e ? (optional || new AirQuality()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    currentWeather(optional) {
        const e = this.bb.__offset(this.bb_pos, 6);
        return e ? (optional || new CurrentWeatherData()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    forecastDaily(optional) {
        const e = this.bb.__offset(this.bb_pos, 8);
        return e ? (optional || new DailyForecastData()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    forecastHourly(optional) {
        const e = this.bb.__offset(this.bb_pos, 10);
        return e ? (optional || new HourlyForecastData()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    forecastNextHour(optional) {
        const e = this.bb.__offset(this.bb_pos, 12);
        return e ? (optional || new NextHourForecastData()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    news(optional) {
        const e = this.bb.__offset(this.bb_pos, 14);
        return e ? (optional || new News()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    weatherAlerts(optional) {
        const e = this.bb.__offset(this.bb_pos, 16);
        return e ? (optional || new WeatherAlertCollectionData()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    weatherChanges(optional) {
        const e = this.bb.__offset(this.bb_pos, 18);
        return e ? (optional || new WeatherChanges()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    historicalComparisons(optional) {
        const e = this.bb.__offset(this.bb_pos, 20);
        return e ? (optional || new HistoricalComparison()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    locationInfo(optional) {
        const e = this.bb.__offset(this.bb_pos, 22);
        return e ? (optional || new LocationInfo()).__init(this.bb.__indirect(this.bb_pos + e), this.bb) : null;
    }
    static startWeather(builder) {
        builder.startObject(10);
    }
    static addAirQuality(builder, value) {
        builder.addFieldOffset(0, value, 0);
    }
    static addCurrentWeather(builder, value) {
        builder.addFieldOffset(1, value, 0);
    }
    static addForecastDaily(builder, value) {
        builder.addFieldOffset(2, value, 0);
    }
    static addForecastHourly(builder, value) {
        builder.addFieldOffset(3, value, 0);
    }
    static addForecastNextHour(builder, value) {
        builder.addFieldOffset(4, value, 0);
    }
    static addNews(builder, value) {
        builder.addFieldOffset(5, value, 0);
    }
    static addWeatherAlerts(builder, value) {
        builder.addFieldOffset(6, value, 0);
    }
    static addWeatherChanges(builder, value) {
        builder.addFieldOffset(7, value, 0);
    }
    static addHistoricalComparisons(builder, value) {
        builder.addFieldOffset(8, value, 0);
    }
    static addLocationInfo(builder, value) {
        builder.addFieldOffset(9, value, 0);
    }
    static endWeather(builder) {
        return builder.endObject();
    }
    static finishWeatherBuffer(builder, table) {
        builder.finish(table);
    }
    static finishSizePrefixedWeatherBuffer(builder, table) {
        builder.finish(table, void 0, !0);
    }
}

// ============================================================
// Module exports
// ============================================================

export default {
    StringEncodingType,
    ComparisonTrend,
    SourceType,
    PollutantType,
    UnitType,
    ComparisonType,
    Deviation,
    Direction,
    ComparisonType2,
    Deviation2,
    ConditionType,
    ForecastToken,
    ParameterType,
    PrecipitationType,
    PressureTrend,
    WeatherCondition,
    MoonPhase,
    PlacementType,
    ResponseType,
    Severity,
    SignificanceType,
    Urgency,
    ByteBuffer,
    Builder,
    Metadata,
    Pollutant,
    AirQuality,
    UUID,
    Articles,
    Change,
    Comparison,
    Parameter,
    Condition,
    PrecipitationAmountByType,
    CurrentWeatherData,
    DayPartForecast,
    DayWeatherConditions,
    DailyForecastData,
    ForecastMinute,
    ForecastPeriodSummary,
    HistoricalComparison,
    HourWeatherConditions,
    HourlyForecastData,
    LocationInfo,
    Placement,
    News,
    NextHourForecastData,
    WeatherAlertSummary,
    WeatherAlertCollectionData,
    WeatherChanges,
    Weather,
};
