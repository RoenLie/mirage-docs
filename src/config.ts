import { persistToFile } from '@orama/plugin-data-persistence/server';
import { deepmerge } from 'deepmerge-ts';
import { promises } from 'fs';
import { join, resolve, sep } from 'path';
import copy from 'rollup-plugin-copy';
import { defineConfig, type Plugin, type ResolvedConfig, type UserConfig } from 'vite';

import { createFileCache } from './build/cache/create-file-cache.js';
import { createTagCache } from './build/cache/create-tag-cache.js';
import { componentAutoImportLoad } from './build/component/auto-import.js';
import { DocPath } from './build/helpers/docpath.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { type ConfigProperties, createDocFiles } from './create-files.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';


const pRoot = resolve(resolve());
const outDir = resolve(resolve(), 'dist');


export const defineDocConfig = async (
	viteConfig: Omit<UserConfig, 'root'>,
	props: ConfigProperties,
) => {
	if (!props.root.startsWith('/'))
		throw new SyntaxError('property `root` must start with /');
	if (!props.entryDir.startsWith('/'))
		throw new SyntaxError('property `entryDir` must start with /');

	// We enforce it to start with a leading /, then we add a . to make it relative.
	props.entryDir = '.' + props.entryDir;

	// We enforce it to start with / then we remove it.
	props.root = props.root.replace(/^\/|^\\/, '');

	// Always include the main index.html file.
	props.input      ??= { main: join(pRoot, props.root, 'index.html') };

	// We by default look for tags where the entry dir is.
	props.tagDirs    ??= [ { path: props.entryDir } ];

	// Cache all relevant files.
	const [ manifestCache, tagCache, editorCache, markdownCache ] = await Promise.all([
		createManifestCache({ directories: props.tagDirs! }),
		createTagCache({ directories: props.tagDirs! }),
		createFileCache({ directories: [ { path: props.entryDir, pattern: /\.editor\.ts/ } ] }),
		createFileCache({ directories: [ { path: props.entryDir, pattern: /\.md/ } ] }),
	]);

	const {
		filesToCreate,
		siteconfigFilePath,
		oramaDb,
		relativeEntryDir,
		relativeLibDir,
	} = await createDocFiles(
		pRoot,
		viteConfig?.base ?? '',
		props,
		{
			manifestCache,
			tagCache,
			editorCache,
			markdownCache,
		},
	);


	let config: ResolvedConfig;
	const docConfig: UserConfig = {
		appType:   'mpa',
		publicDir: 'assets',
		root:      join(pRoot, props.root),
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
							const shit = {
								viteRoot: (props.root ?? '').replace(/^\.\/|^\.\\|^\\|^\//, ''),
								siteconfigFilePath,
								stuff:    siteconfigFilePath
									.replace((props.root ?? '').replace(/^\.\/|^\.\\|^\\|^\//, ''), ''),
							};

							return {
								html,
								tags: [
									{
										tag:   'script',
										attrs: {
											type: 'module',
											src:  shit.stuff
												.replaceAll('\\', '/')
												.replaceAll(/\/{2,}/g, '/'),
										},
										injectTo: 'head-prepend',
									},
									{
										tag:      'script',
										attrs:    { type: 'module', id: 'i-am-a-banana1' },
										injectTo: 'head-prepend',
										children: 'import "@roenlie/mirage-docs/dist/app/components/layout.cmp.js"',
									},
									{
										tag:      'script',
										attrs:    { type: 'module', id: 'i-am-a-banana2' },
										injectTo: 'head-prepend',
										children: 'import "@roenlie/mirage-docs/assets/index.css"',
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

	const mergedConfig = deepmerge(defineConfig(viteConfig), docConfig) as UserConfig;

	mergedConfig.plugins?.push(
		copy({
			targets: [
				{
					src:  './node_modules/@roenlie/mirage-docs/dist/workers',
					dest: mergedConfig.publicDir || '/assets',
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
	await persistToFile(oramaDb, 'json', join(mergedConfig.publicDir || '/assets', 'searchIndexes.json'));

	return mergedConfig as ReturnType<typeof defineConfig>;
};
