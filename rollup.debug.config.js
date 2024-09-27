import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
	{
		input: 'src/response.beta.js',
		output: {
			file: 'test/response.beta.js',
			//format: 'es',
			banner: "/* README: https://github.com/NSRingo/iRingo */\nconsole.log(' iRingo: 🌤 WeatherKit β Response')",
		},
		plugins: [json(), commonjs(), nodeResolve()]
	}
];
