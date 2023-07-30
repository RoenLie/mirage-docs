import { persistToFile } from '@orama/plugin-data-persistence/server';
import { deepmerge } from 'deepmerge-ts';
import { promises } from 'fs';
import { join, resolve, sep } from 'path';
import copy from 'rollup-plugin-copy';
import { defineConfig, Plugin, ResolvedConfig, UserConfig } from 'vite';

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
	const {
		filesToCreate,
		tagCache,
		manifestCache,
		siteconfigFilePath,
		oramaDb,
		relativeEntryDir,
		relativeLibDir,
	} = await createDocFiles(pRoot, viteConfig?.base ?? '', props);

	const docConfig: UserConfig = {
		appType:   'mpa',
		root:      pRoot,
		publicDir: 'public',
		build:     {
			outDir,
			emptyOutDir:   true,
			rollupOptions: {
				input: props.input,
			},
		},

		plugins: [
			((): Plugin => {
				return {
					name:           'mirage-docs',
					configResolved: (cfg) => {
						config = cfg;
					},
					transformIndexHtml: {
						order:   'pre',
						handler: (html) => {
							return {
								html,
								tags: [
									{
										tag:   'script',
										attrs: {
											type: 'module',
											src:  '/' + siteconfigFilePath.replaceAll('\\', '/'),
										},
										injectTo: 'head-prepend',
									},
								],
							};
						},
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

						const componentTargetPath = DocPath.createCachePath(
							pRoot, path, relativeEntryDir, relativeLibDir, 'ts',
						);

						const resolvedTargetPath = resolve(componentTargetPath);
						const module = server.moduleGraph.getModuleById(resolvedTargetPath.replaceAll('\\', '/'));

						if (module) {
							server.moduleGraph.invalidateModule(module);

							const componentTargetPath = DocPath.createCachePath(
								pRoot, path, relativeEntryDir, relativeLibDir, 'ts',
							);

							const file = await createMarkdownComponent(
								pRoot,
								tagCache,
								manifestCache,
								componentTargetPath,
								path,
							);

							await promises.writeFile(componentTargetPath, file.content);

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

	const mergedConfig = deepmerge(docConfig, defineConfig(viteConfig)) as UserConfig;

	mergedConfig.plugins?.push(
		copy({
			targets: [
				{
					src:  './node_modules/@roenlie/mirage-docs/dist/workers',
					dest: mergedConfig.publicDir || '/public',
				},
			],
			hook:     'config',
			copyOnce: true,
		}) as any,
	);

	// Write the mirage files to mirage disc location.
	await Promise.all([ ...filesToCreate ].map(async ([ path, content ]) => {
		await promises.mkdir(path.split(sep).slice(0, -1).join(sep), { recursive: true });

		if (props.debug)
			console.log('Attempting to write file:', path);

		await promises.writeFile(path, content);

		if (props.debug)
			console.log('Finished writing file:', path);
	}));

	// Write the search index file to public disc folder.
	await persistToFile(oramaDb, 'json', join(mergedConfig.publicDir || '', 'searchIndexes.json'));

	return mergedConfig as ReturnType<typeof defineConfig>;
};
