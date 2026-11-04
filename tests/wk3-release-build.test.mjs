import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildWK3Release } from "../scripts/build-wk3-release.mjs";
import { renderLocalModule } from "../scripts/build-egern-module.mjs";

const platforms = ["egern", "surge", "loon", "stash", "quantumultx"];
const extensions = ["yaml", "sgmodule", "lpx", "stoverride", "snippet"];

test("tagged WK3 build publishes all platform scripts and matching modules", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "wk3-release-"));
    try {
        const result = await buildWK3Release({ outdir: dir, version: "3.3.2" });
        assert.deepEqual(result, { scripts: 10, modules: 5 });
        const files = await readdir(dir);
        for (const platform of platforms) for (const stage of ["request", "response"]) {
            const file = `wk3-${platform}-${stage}.bundle.js`;
            assert.ok(files.includes(file), file);
            assert.ok((await stat(path.join(dir, file))).size > 1000, file);
        }
        for (const extension of extensions) {
            const file = `iRingo.WeatherKit.WK3.${extension}`;
            const text = await readFile(path.join(dir, file), "utf8");
            assert.ok(text.length > 500, file);
            for (const [, asset] of text.matchAll(/(?:script_url:|script-path=|url:\s*(?:script-\w+|https:\/\/github\.com\/patrickyanxxxxx\/WeatherKit-WK3\/releases\/download\/v3\.3\.2\/))[^\n]*?\b(wk3-[a-z]+-(?:request|response)\.bundle\.js)/g)) {
                assert.ok(files.includes(asset), `${file} references missing ${asset}`);
            }
        }
        const egern = await readFile(path.join(dir, "iRingo.WeatherKit.WK3.yaml"), "utf8");
        assert.equal(egern, renderLocalModule({ version: "3.3.2" }));
        assert.equal((egern.match(/script_url: https:\/\/github\.com\/patrickyanxxxxx\/WeatherKit-WK3\/releases\/download\/v3\.3\.2\/wk3-egern-(?:request|response)\.bundle\.js/g) ?? []).length, 5);
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test("release build refuses an implicit output path or unversioned tag", async () => {
    await assert.rejects(buildWK3Release({ version: "3.3.2" }), /--outdir/);
    await assert.rejects(buildWK3Release({ outdir: path.join(os.tmpdir(), "unused"), version: "latest" }), /explicit release version/);
});
