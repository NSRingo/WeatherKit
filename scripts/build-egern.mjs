import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { rollup } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(root, "src/wk3/runtime.mjs");

function egernPlugin() {
    const virtual = new Map([
        ["wk3:runtime", "export const webFetch = __egernRuntime.webFetch;"],
        [path.join(root, "src/wk3/utils/context.mjs"), "export const requestContext = undefined;"],
        [path.join(root, "src/wk3/utils/fetch.mjs"), "export const fetch = __egernRuntime.fetch;"],
        ...["request", "response"].map(stage => [`wk3:entry:${stage}`, `
import { handle${stage === "request" ? "Request" : "Response"} as handler } from ${JSON.stringify(path.join(root, `src/wk3/entry/${stage}.mjs`))};
import { setLogEnv, logExecution } from ${JSON.stringify(path.join(root, "src/wk3/utils/Console.mjs"))};
export function execute(ctx) {
    setLogEnv(ctx.env);
    return logExecution(handler, ctx, "${stage}");
}`]),
    ]);
    return {
        name: "egern-native-runtime",
        resolveId(source, importer) {
            if (source === "wk3:runtime" || source.startsWith("wk3:entry:")) return source;
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
    for (const name of ["request", "response"]) {
        const input = path.join(root, `src/wk3/entry/${name}.mjs`);
        const business = await bundle(`wk3:entry:${name}`, "__egernBusiness", minify);
        const code = `// Generated for Egern native ctx API. No runtime imports.\nexport default async function(ctx) {\n${runtime}\nconst __egernRuntime = __egernSupport.createRuntime(ctx);\n${business}\nreturn __egernBusiness.execute(ctx);\n}\n`;
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
