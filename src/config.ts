import { deepmerge } from 'deepmerge-ts';
import { promises } from 'fs';
import { resolve, sep } from 'path';
import { defineConfig, Plugin, ResolvedConfig, UserConfig, UserConfigExport } from 'vite';

import { componentAutoImportLoad } from './build/component/auto-import.js';
import { DocPath } from './build/helpers/docpath.js';
import { ConfigProperties, createDocFiles } from './create-files.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';


const pRoot = resolve(resolve());
const outDir = resolve(resolve(), 'dist');


export const defineDocConfig = async (
	viteConfig: UserConfig,
	props: ConfigProperties,
) => {
	let config: ResolvedConfig;
	const { filesToCreate, tagCache, manifestCache, aliases } = await createDocFiles(props);


	await Promise.all([ ...filesToCreate ].map(async ([ path, content ]) => {
		await promises.mkdir(path.split(sep).slice(0, -1).join(sep), { recursive: true });
		await promises.writeFile(path, content);
	}));


	const docConfig: UserConfigExport = {
		appType: 'mpa',

		root: pRoot,

		publicDir: 'public',

		resolve: {
			alias: aliases,
		},

		optimizeDeps: {
			exclude: [ '@roenlie/mirage-docs' ],
		},

		build: {
			outDir,
			emptyOutDir:   true,
			rollupOptions: {
				input: props.input,
			},
		},

		plugins: [
			((): Plugin => {
				return {
					name: 'mirage-docs',

					configResolved: (cfg) => {
						config = cfg;
					},
					load: (id) => {
						/* if auto importer is being used, transform matching modules */
						if (props.autoImport) {
							const {
								tagPrefixes,
								loadWhitelist,
								loadBlacklist,
								tagCaptureExpr,
							} = props.autoImport;

							const transformed = componentAutoImportLoad({
								id,
								config,
								tagCache,
								tagPrefixes,
								loadWhitelist,
								loadBlacklist,
								tagCaptureExpr,
							});

							if (transformed)
								return transformed;
						}
					},
					transform(code, id) {
						if (id.endsWith('.editor.ts')) {
							code = `const EditorComponent = (builder) => builder;\n` + code;

							return code;
						}
					},
					async handleHotUpdate({ file: path, server }) {
						if (!path.endsWith('.md'))
							return;

						const preparedPath = DocPath.preparePath(pRoot, path);
						const targetedPath = DocPath.targetLibDir(preparedPath, props.rootDir, props.entryDir, '.mirage', 'ts');
						const resolvedTargetPath = resolve(targetedPath);

						const module = server.moduleGraph.getModuleById(resolvedTargetPath.replaceAll('\\', '/'));

						if (module) {
							server.moduleGraph.invalidateModule(module);

							const file = await createMarkdownComponent(
								pRoot,
								tagCache,
								manifestCache,
								props.rootDir,
								props.entryDir,
								'.mirage',
								path,
							);

							await promises.writeFile(file.path, file.content);

							server.ws.send({
								type: 'full-reload',
								path: '*',
							});
						}
					},
				};
			})(),
		],
	};

	return deepmerge(docConfig, defineConfig(viteConfig));
};
