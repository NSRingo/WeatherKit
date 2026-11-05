import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { rollup } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(root, "src/wk3/runtime.mjs");
const replacements = {
    "console": 'const levels={OFF:0,ERROR:1,WARN:2,INFO:3,DEBUG:4,ALL:5};let settings={};try{settings=JSON.parse(ctx.env?.SETTINGS||"{}")}catch{}const level=levels[ctx.env?.LogLevel??settings.LogLevel??"INFO"]??3;const fmt=a=>a.map(x=>typeof x==="object"&&x!==null?JSON.stringify(x,null,2):x);export const Console=Object.fromEntries([["debug",4],["info",3],["warn",2],["error",1],["log",1],["exception",1]].map(([k,n])=>[k,(...a)=>{if(level>=n)console[k==="exception"?"error":k](...fmt(a))}]));',
};

function egernPlugin() {
    const virtual = new Map([
        ["wk3:runtime", "export const webFetch = __egernRuntime.webFetch;"],
        [path.join(root, "src/wk3/utils/context.mjs"), "export const requestContext = undefined;"],
        [path.join(root, "src/wk3/utils/fetch.mjs"), "export const fetch = __egernRuntime.fetch;"],
        [path.join(root, "src/wk3/utils/Console.mjs"), replacements.console],
    ]);
    return {
        name: "egern-native-runtime",
        resolveId(source, importer) {
            if (source === "wk3:runtime") return source;
            if (!importer || !/(?:^|\/)\b(?:Console|context|fetch)\.mjs$/.test(source)) return null;
            const resolved = path.resolve(path.dirname(importer), source);
            return virtual.has(resolved) ? resolved : null;
        },
        load(id) {
            if (id === "wk3:runtime") return virtual.get(id);
            return virtual.get(id) ?? null;
        },
        transform(code) {
            return { code: code.replace(/\bglobalThis\.fetch\b/g, "__egernRuntime.webFetch"), map: null };
        },
    };
}

async function bundle(input, name, minify) {
    const plugins = [egernPlugin(), nodeResolve({ browser: true, preferBuiltins: false })];
    if (minify) plugins.push(terser({ maxWorkers: 1 }));
    const build = await rollup({ input, plugins, onwarn(warning, warn) { warn(warning); } });
    try {
        const generated = await build.generate({ format: "iife", name, inlineDynamicImports: true, sourcemap: false });
        return generated.output.find(file => file.type === "chunk").code;
    } finally {
        await build.close();
    }
}

export async function buildEgern({ outdir, minify = true, filePrefix = "" } = {}) {
    const runtime = await bundle(runtimePath, "__egernSupport", minify);
    const results = {};
    for (const [name, handler] of [["request", "handleRequest"], ["response", "handleResponse"]]) {
        const input = path.join(root, `src/wk3/entry/${name}.mjs`);
        const business = await bundle(input, "__egernBusiness", minify);
        const code = `// Generated for Egern native ctx API. No runtime imports.\nexport default async function(ctx) {\n${runtime}\nconst __egernRuntime = __egernSupport.createRuntime(ctx);\n${business}\nreturn __egernBusiness.${handler}(ctx);\n}\n`;
        const inputs = [input];
        results[name] = { code, bytes: Buffer.byteLength(code), inputs };
        if (outdir) {
            await mkdir(outdir, { recursive: true });
            await writeFile(path.join(outdir, `${filePrefix}${name}.bundle.js`), code);
        }
    }
    return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const outdir = path.resolve(process.argv[2] || path.join(root, "dist/egern"));
    const results = await buildEgern({ outdir });
    for (const [name, result] of Object.entries(results)) console.log(`${path.join(outdir, `${name}.bundle.js`)} ${result.bytes} bytes`);
}
