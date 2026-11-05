import path from "node:path";
import { readFileSync } from "node:fs";
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
    ...["request", "response", "scale"].map(name => ({
        input: `./src/loon/${name}.js`,
        output: { file: `./dist/${name}.loon.bundle.js`, format: "es" },
        plugins: [
            alias({ entries: [{ find: "@nsringo/weatherkit", replacement: path.resolve(import.meta.dirname, "node_modules/@nsringo/weatherkit/dist/index.js") }] }),
            nodeResolve(),
            terser(),
            ...(name === "scale" ? [{
                name: "weatherkit-third-party-licenses",
                generateBundle() {
                    this.emitFile({ type: "asset", fileName: "LICENSE.txt", source: `${readFileSync(new URL("./LICENSE", import.meta.url), "utf8")}\n\n@noble/hashes 1.8.0\n${readFileSync(new URL("./node_modules/@noble/hashes/LICENSE", import.meta.url), "utf8")}\n\nProvider region data: Natural Earth, public domain; see docs/provider-regions-source.json.\n` });
                },
            }] : []),
        ],
    })),
];
