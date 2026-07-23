import path from "node:path";
import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" with { type: "json" };

export default [
    {
        input: "./src/request.js",
        output: {
            file: "./dist/request.bundle.js",
            format: "es",
            banner: chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName}');\n/* ${pkg.homepage} */`,
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
            terser(),
        ],
    },
    {
        input: "./src/response.js",
        output: {
            file: "./dist/response.bundle.js",
            format: "es",
            banner: chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName}');\n/* ${pkg.homepage} */`,
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
            terser(),
        ],
    },
];
