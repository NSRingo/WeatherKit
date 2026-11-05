import path from "node:path";
import verifyLoonBundles from "./verify-loon-bundles.mjs";
const result = await verifyLoonBundles(path.resolve(import.meta.dirname, ".."));
console.log(JSON.stringify(result));
