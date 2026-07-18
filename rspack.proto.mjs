import path from "node:path";
import { defineConfig } from "@rspack/cli";

export default defineConfig({
    entry: {
        proto: "./src/proto/apple/wk2.js",
    },
    output: {
        path: path.resolve(import.meta.dirname, "src/output"),
        chunkFormat: false,
        filename: "[name].bundle.js",
        library: {
            type: "module",
        },
    },
    experiments: {
        outputModule: true,
    },
    devtool: false,
    performance: false,
});
