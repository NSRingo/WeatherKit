import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
	{
		input: 'src/response.debug.js',
		output: {
			file: 'dist/response.js',
			//format: 'es',
			banner: `/* README: https://github.com/NSRingo/iRingo */\nconsole.log(' iRingo: 🌤 WeatherKit β Response')\nconsole.log('${new Date().toLocaleString('zh-CN', {timeZone: 'PRC'})}')`,
		},
		plugins: [json(), commonjs(), nodeResolve()]
	}
];
