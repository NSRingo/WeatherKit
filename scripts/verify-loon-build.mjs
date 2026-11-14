import path from "node:path";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import verifyLoonBundles from "./verify-loon-bundles.mjs";
const root = path.resolve(import.meta.dirname, "..");
const license = await readFile(path.join(root, "dist/LICENSE.txt"), "utf8");
assert.match(license, /Apache License/);
const result = await verifyLoonBundles(root);
console.log(JSON.stringify(result));
