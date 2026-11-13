import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ByteBuffer } from "flatbuffers";

globalThis.$environment ??= { "surge-version": "test" };
globalThis.$persistentStore ??= { read: () => null, write: () => true };
const { Console } = await import("@nsnanocat/util");
Console.logLevel = "OFF";
const { default: WeatherKit3 } = await import("../src/class/WeatherKit3.mjs");
const supported = ["airQuality", "forecastNextHour", "weatherAlerts"];
const missing = "<missing>";
const floatFields = new Set(["latitude", "longitude", "amount", "precipitationIntensity", "perceivedPrecipitationIntensity"]);
// Direct vtable reads independently check the decoder's integer fields and vector lengths.
function wireFacts(bb) {
    const root = bb.readUint32(0);
    const child = (table, slot) => {
        const offset = bb.__offset(table, 4 + slot * 2);
        return offset ? bb.__indirect(table + offset) : 0;
    };
    const scalar = (table, slot) => {
        const offset = bb.__offset(table, 4 + slot * 2);
        return offset ? bb.readUint32(table + offset) : 0;
    };
    const aqMetadata = child(child(root, 0), 0),
        nextHour = child(root, 5);
    return { aqExpiry: scalar(aqMetadata, 1), minuteCount: nextHour ? bb.readUint32(child(nextHour, 5)) : 0, forecastEnd: nextHour ? scalar(nextHour, 4) : 0, reportedTime: nextHour ? scalar(child(nextHour, 0), 8) : 0 };
}

function fields(value, prefix = "", out = {}) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(Array.isArray(value.bytes) && value.bytes.length === 16)) {
        for (const [key, child] of Object.entries(value)) fields(child, prefix ? `${prefix}.${key}` : key, out);
    } else if (Array.isArray(value) && value.length) {
        for (const [index, child] of value.entries()) {
            // The wire and JSON services return pollutants in opposite orders; compare species, not positions.
            const key = child?.pollutantType ? `[${child.pollutantType}]` : `[${index}]`;
            fields(child, `${prefix}${key}`, out);
        }
    } else out[prefix] = value;
    return out;
}

export function comparePair(directory) {
    const apple = JSON.parse(fs.readFileSync(path.join(directory, "apple.json")));
    const wire = new ByteBuffer(new Uint8Array(fs.readFileSync(path.join(directory, "apple.bin"))));
    const { json: decoded, failures } = WeatherKit3.decodeWithReport(wire, supported);
    const a = fields(apple),
        b = fields(decoded),
        raw = wireFacts(wire);
    const rows = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().map(field => {
        const x = Object.hasOwn(a, field) ? a[field] : missing;
        const y = Object.hasOwn(b, field) ? b[field] : missing;
        let equal = JSON.stringify(x) === JSON.stringify(y),
            reason = equal ? "一致" : "值不一致：需定位单位/枚举/偏移";
        const root = field.split(/[.[]/)[0];
        if (!supported.includes(root)) reason = "缺字段：当前 dev 未实现该产品的 WK3 codec";
        else if (floatFields.has(field.split(".").at(-1)) && typeof x === "number" && typeof y === "number" && Math.fround(x) === Math.fround(y)) {
            equal = true;
            reason = x === y ? "一致" : "一致：JSON 十进制与 float32 表示精度";
        } else if (Array.isArray(x?.bytes) && typeof y === "string") {
            equal = x.bytes.map(byte => byte.toString(16).padStart(2, "0")).join("") === y.replaceAll("-", "");
            reason = equal ? "一致：同一 UUID 的字节/字符串表示" : "UUID 字节不一致";
        } else if (field === "airQuality.metadata.expireTime" && !equal && y === raw.aqExpiry) reason = "返回值差异：原始 Metadata 槽 1 的 uint32 与解码值一致";
        else if (field === "forecastNextHour.metadata.reportedTime" && !equal && y === raw.reportedTime) reason = `数据版本差异：原始 reportedTime 与 JSON 相差 ${y - x} 秒`;
        else if (field === "forecastNextHour.forecastEnd" && !equal && y === raw.forecastEnd) reason = "返回值差异：原始 forecastEnd uint32 与解码值一致";
        else if (x === missing && /^forecastNextHour\.minutes\[/.test(field) && raw.minuteCount > (apple.forecastNextHour?.minutes?.length ?? 0)) {
            reason = `返回值差异：JSON 分钟向量 ${apple.forecastNextHour.minutes.length} 条，原始 FlatBuffer 向量 ${raw.minuteCount} 条`;
        } else if (x === missing && (y === null || y === 0 || y === false || (Array.isArray(y) && y.length === 0))) {
            equal = true;
            reason = "一致：JSON 省略缺省值，schema 返回缺省值";
        } else if (y === missing && /forecastNextHour\.summary\[\d+\]\.condition/.test(field)) reason = "缺字段：WK3 summary 槽 2 在当前 schema 标记 deprecated";
        else if (y === missing) reason = "缺字段：当前 codec 未输出此字段";
        return { field, json: x, flatbuffer: y, equal, reason };
    });
    const counts = {};
    for (const row of rows) counts[row.reason] = (counts[row.reason] ?? 0) + 1;
    return { rows, failures, counts, decoded, raw };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const output = path.resolve(process.argv[2] ?? "output/wk3-paired");
    fs.mkdirSync(output, { recursive: true });
    const all = [],
        summaries = {};
    for (const city of ["hangzhou", "tianjin", "seattle", "seattle-repeat"]) {
        const result = comparePair(fileURLToPath(new URL(`../tests/fixtures/wk3-paired/${city}/`, import.meta.url)));
        all.push(...result.rows.map(row => ({ sample: city, ...row })));
        summaries[city] = { counts: result.counts, failures: result.failures, fields: result.rows.length, raw: result.raw };
        fs.writeFileSync(path.join(output, `${city}.decoded.json`), JSON.stringify(result.decoded, null, 2));
    }
    const cell = value => `"${String(typeof value === "object" ? JSON.stringify(value) : value).replaceAll('"', '""')}"`;
    fs.writeFileSync(path.join(output, "fields.csv"), "sample,field,JSON,FlatBuffer,equal,reason\n" + all.map(row => [row.sample, row.field, row.json, row.flatbuffer, row.equal, row.reason].map(cell).join(",")).join("\n") + "\n");
    fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify(summaries, null, 2));
    console.log(JSON.stringify(summaries, null, 2));
}
