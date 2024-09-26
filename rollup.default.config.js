import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
	{
		input: 'src/response.js',
		output: {
			file: 'dist/response.js',
			//format: 'es',
			banner: "/* README: https://github.com/NSRingo/iRingo */\nconsole.log(' iRingo: 🌤 WeatherKit Response')",
		},
		plugins: [json(), commonjs(), nodeResolve(), terser()]
	}
];
