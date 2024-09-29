import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
	{
		input: 'src/response.debug.js',
		output: {
			file: 'test/response.js',
			//format: 'es',
			banner: "/* README: https://github.com/NSRingo/iRingo */\nconsole.log(' iRingo: 🌤 WeatherKit β Response')",
		},
		plugins: [json(), commonjs(), nodeResolve()]
	}
];
