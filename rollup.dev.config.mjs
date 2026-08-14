import path from "node:path";
import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import pkg from "./package.json" with { type: "json" };

export default [
    {
        input: "./src/request.dev.js",
        output: {
            file: "./dist/request.dev.bundle.js",
            format: "es",
            banner: chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version ?? "dev"}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName} β');\n/* ${pkg.homepage} */`,
        },
        plugins: [
            alias({
                entries: [
                    {
                        find: "@nsringo/weatherkit",
                        replacement: path.resolve(import.meta.dirname, "node_modules/@nsringo/weatherkit/dist/index.js"),
                    },
                ],
            }),
            nodeResolve(),
        ],
    },
    {
        input: "./src/response.dev.js",
        output: {
            file: "./dist/response.dev.bundle.js",
            format: "es",
            banner: chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version ?? "dev"}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName} β');\n/* ${pkg.homepage} */`,
        },
        plugins: [
            alias({
                entries: [
                    {
                        find: "@nsringo/weatherkit",
                        replacement: path.resolve(import.meta.dirname, "node_modules/@nsringo/weatherkit/dist/index.js"),
                    },
                ],
            }),
            nodeResolve(),
        ],
    },
];
