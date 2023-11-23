import { globby } from 'globby';
import { resolve } from 'path';
import { defineConfig } from 'vite';

import { getExternalImportPaths } from './src/build/helpers/get-external-paths.js';


const root = resolve(resolve(), 'src');
const outDir = resolve(resolve(), 'dist');


export default defineConfig(async () => {
	const externalImportPaths = await getExternalImportPaths('./src');
	const input = (await globby('./src/**/!(*.(test|demo|editor|types)).ts'));

	return {
		appType: 'mpa',
		root,
		worker:  {
			rollupOptions: {
				output: {
					sourcemap:      true,
					entryFileNames: (entry) => `workers/${ entry.name }.js`,
				},
			},
		},
		sourcemap: true,
		esbuild:   {
			tsconfigRaw: {
				compilerOptions: {
					experimentalDecorators: true,
				},
			},
		},
		build: {
			outDir,
			emptyOutDir: true,
			lib:         {
				entry:   input,
				formats: [ 'es' ],
			},
			rollupOptions: {
				/** We add all files as entrypoints */
				input: input,

				external: externalImportPaths,

				output: {
					/** By preseving modules, we retain the folder structure of the original source, thereby allowing
					 *  generated d.ts files to be correctly picked up. */
					preserveModules: true,

					/** We remove src from any module paths to preserve the folder structure incase any virtual or node_modules
					 *  files are included */
					preserveModulesRoot: 'src',

					/** We rename the file path to the file name and .js
					 *  If we don't do this, in combination with preserve modules, we end up with double file paths. */
					entryFileNames: (entry) => `${ entry.name }.js`,
				},
			},
		},
	};
});
