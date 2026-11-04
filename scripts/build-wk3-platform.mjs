import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platforms = new Set(["surge", "loon", "stash", "quantumultx"]);
const logModule = 'const levels={OFF:0,ERROR:1,WARN:2,INFO:3,DEBUG:4,ALL:5};let settings={};try{settings=JSON.parse(globalThis.$environment?.SETTINGS||globalThis.$env?.SETTINGS||"{}")}catch{}const level=levels[globalThis.$environment?.LogLevel??globalThis.$env?.LogLevel??settings.LogLevel??"INFO"]??3;const fmt=a=>a.map(x=>typeof x==="object"&&x!==null?JSON.stringify(x,null,2):x);export const Console=Object.fromEntries([["debug",4],["info",3],["warn",2],["error",1],["log",1],["exception",1]].map(([k,n])=>[k,(...a)=>{if(level>=n)console[k==="exception"?"error":k](...fmt(a))}]));';
function runtimePlugin() {
    const virtual = new Map([
        ["wk3:runtime", 'let runtime; export const setRuntime=value=>{runtime=value}; export const webFetch=(...args)=>runtime.webFetch(...args); export const runtimeFetch=(...args)=>runtime.fetch(...args);'],
        [path.join(root, "src/egern/wk3/utils/context.mjs"), "export const requestContext=undefined;"],
        [path.join(root, "src/egern/wk3/utils/fetch.mjs"), 'export { runtimeFetch as fetch } from "wk3:runtime";'],
        [path.join(root, "src/egern/wk3/utils/Console.mjs"), logModule],
    ]);
    return {
        name: "wk3-platform-runtime",
        resolveId(source, importer) {
            if (source === "egern:runtime" || source === "wk3:runtime") return "wk3:runtime";
            if (!importer || !/(?:^|\/)(?:Console|context|fetch)\.mjs$/.test(source)) return null;
            const resolved = path.resolve(path.dirname(importer), source);
            return virtual.has(resolved) ? resolved : null;
        },
        load(id) { return virtual.get(id) ?? null; },
        transform(code, id) {
            if (!code.includes("globalThis.fetch") || id === "wk3:runtime") return null;
            return { code: `import { webFetch as __wk3WebFetch } from "wk3:runtime";\n${code.replace(/\bglobalThis\.fetch\b/g, "__wk3WebFetch")}`, map: null };
        },
    };
}

export async function buildPlatform(platform, { outdir, minify = true } = {}) {
    if (!platforms.has(platform)) throw new TypeError(`Unverified platform: ${platform}`);
        const files = {};
    for (const [name, handlerName] of [["request", "handleRequest"], ["response", "handleResponse"]]) {
        const entry = `virtual:wk3-${name}`;
        const plugin = {
            name: "wk3-platform-entry",
            resolveId(id) { return id === entry ? id : null; },
            load(id) {
                if (id !== entry) return null;
                return `import { setRuntime } from "wk3:runtime";\nimport { runPlatform } from ${JSON.stringify(path.join(root, "src/platform/wk3-adapter.mjs"))};\nimport { ${handlerName} } from ${JSON.stringify(path.join(root, `src/egern/entry/${name}.mjs`))};\nimport { createRuntime } from ${JSON.stringify(path.join(root, "src/egern/entry/runtime.mjs"))};\nconst __bytes=v=>typeof v===\"string\"?Uint8Array.from(v,c=>c.charCodeAt(0)&255).buffer:v instanceof ArrayBuffer?v:ArrayBuffer.isView(v)?v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength):new Uint8Array(v).buffer;const __wk3Runtime=createRuntime({env:globalThis.$environment??globalThis.$env??{},http:globalThis.$httpClient?{get:(u,o)=>new Promise((r,j)=>$httpClient.get({url:u,...o},(e,x,b)=>e?j(e):r({status:x.status,headers:x.headers,text:async()=>b,arrayBuffer:async()=>__bytes(b)}))),post:(u,o)=>new Promise((r,j)=>$httpClient.post({url:u,...o},(e,x,b)=>e?j(e):r({status:x.status,headers:x.headers,text:async()=>b,arrayBuffer:async()=>__bytes(b)})))}:{get:async(u,o)=>{const x=await $task.fetch({url:u,...o});return {status:x.statusCode,headers:x.headers,text:async()=>x.body,arrayBuffer:async()=>__bytes(x.body)}},post:async(u,o)=>{const x=await $task.fetch({url:u,...o});return {status:x.statusCode,headers:x.headers,text:async()=>x.body,arrayBuffer:async()=>new TextEncoder().encode(x.body).buffer}}}});\nsetRuntime(__wk3Runtime);runPlatform(async ctx=>${handlerName}(ctx),"${name}",globalThis,"${platform === "quantumultx" ? "Quantumult X" : platform}");`;
            },
        };
        const plugins = [plugin, runtimePlugin(), nodeResolve({ browser: true, preferBuiltins: false })];
        if (minify) plugins.push(terser({ maxWorkers: 1 }));
        const build = await rollup({ input: entry, plugins });
        try {
            const generated = await build.generate({ format: "iife", name: "__WK3", inlineDynamicImports: true, sourcemap: false });
            const chunk = generated.output.find(file => file.type === "chunk");
            const code = chunk.code.replace(/\nexport \{[^}]*\};?\s*$/, "\n");
            files[name] = { code, bytes: Buffer.byteLength(code) };
            if (outdir) { await mkdir(outdir, { recursive: true }); await writeFile(path.join(outdir, `wk3-${platform}-${name}.bundle.js`), code); }
        } finally { await build.close(); }
    }
    return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const platform = process.argv[2];
    if (!platform) throw new Error(`Usage: node scripts/build-wk3-platform.mjs <${[...platforms].join("|")}> [outdir]`);
    const outdir = path.resolve(process.argv[3] ?? path.join(root, "dist/platforms", platform));
    const files = await buildPlatform(platform, { outdir });
    for (const [name, file] of Object.entries(files)) console.log(`${path.join(outdir, `wk3-${platform}-${name}.bundle.js`)} ${file.bytes} bytes`);
}
