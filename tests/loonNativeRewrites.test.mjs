import { readFile } from "node:fs/promises";
import test from "node:test";
import verifyLoonRewrites from "../scripts/verify-loon-rewrites.mjs";

test("the actual Loon template retains capabilities and narrows JavaScript startup", async () => {
    verifyLoonRewrites(await readFile(new URL("../template/loon.handlebars", import.meta.url), "utf8"));
});
