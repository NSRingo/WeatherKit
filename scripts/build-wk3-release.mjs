import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEgern } from "./build-egern.mjs";
import { renderLocalModule } from "./build-egern-module.mjs";
import { buildPlatform } from "./build-wk3-platform.mjs";
import { buildWK3Modules, platforms, renderWK3Module } from "./build-wk3-modules.mjs";
import { writeFile } from "node:fs/promises";

export async function buildWK3Release({ outdir, version } = {}) {
    if (!outdir) throw new Error("Specify --outdir");
    if (version) {
        renderWK3Module("surge", version);
        renderLocalModule({ version });
    }
    const egern = await buildEgern({ outdir, filePrefix: "wk3-egern-" });
    for (const platform of Object.keys(platforms)) await buildPlatform(platform, { outdir });
    if (version) {
        buildWK3Modules({ outdir, version });
        await writeFile(path.join(outdir, "iRingo.WeatherKit.WK3.yaml"), renderLocalModule({ version }));
    }
    return { scripts: Object.keys(platforms).length * 2 + Object.keys(egern).length, modules: version ? Object.keys(platforms).length + 1 : 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const flag = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
    const outdir = flag("--outdir");
    if (!outdir) throw new Error("Usage: node scripts/build-wk3-release.mjs --outdir dist [--version 3.3.2]");
    const result = await buildWK3Release({ outdir: path.resolve(outdir), version: flag("--version") });
    console.log(`WK3: ${result.scripts} scripts, ${result.modules} modules`);
}
