import pkg from "./package.json" with { type: "json" };
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [
	{
		input: "src/response.js",
		output: {
			file: "dist/response.js",
			//format: "es",
			banner: `/* README: https://github.com/NSRingo */\nconsole.log(' iRingo: 🌤 WeatherKit Response')\nconsole.log('Version: ${pkg.version}')\nconsole.log('Build Time: ${new Date().toLocaleString('zh-CN', {timeZone: 'PRC'})}')`,
		},
		plugins: [json(), commonjs(), nodeResolve(), terser()]
	}
];
