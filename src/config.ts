import { persistToFile } from '@orama/plugin-data-persistence/server';
import { deepmerge } from 'deepmerge-ts';
import { promises } from 'fs';
import { join, normalize, resolve, sep } from 'path';
import copy from 'rollup-plugin-copy';
import { defineConfig, type Plugin, type ResolvedConfig, type UserConfig } from 'vite';

import { createFileCache } from './build/cache/create-file-cache.js';
import { createTagCache } from './build/cache/create-tag-cache.js';
import { componentAutoImportLoad } from './build/component/auto-import.js';
import { DocPath } from './build/helpers/docpath.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { type ConfigProperties, createDocFiles } from './create-files.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';


const pRoot = resolve();
const outDir = join(resolve(), 'dist');


export const defineDocConfig = async (
	viteConfig: Omit<UserConfig, 'root' | 'base'>,
	props: ConfigProperties,
) => {
	if (!props.root.startsWith('/'))
		throw new SyntaxError('property `root` must start with /');
	if (!props.source.startsWith('/'))
		throw new SyntaxError('property `entryDir` must start with /');

	// Base url of the application, will certain relative paths.
	props.base ??= '';

	// We enforce it to start with a leading /, then we add a . to make it relative.
	props.source = '.' + props.source;

	// We enforce it to start with / then we remove it.
	props.root = props.root.replace(/^\/|^\\/, '');

	// Always include the main index.html file.
	//props.input      ??= { main: join(pRoot, props.root, 'index.html') };
	props.input      ??= [ normalize(join(pRoot, props.root, 'index.html')).replaceAll(/\\+/g, '/') ];

	// We by default look for tags where the entry dir is.
	props.tagDirs    ??= [ { path: props.source } ];

	// Cache all relevant files.
	const [ manifestCache, tagCache, editorCache, markdownCache ] = await Promise.all([
		createManifestCache({ directories: props.tagDirs! }),
		createTagCache({ directories: props.tagDirs! }),
		createFileCache({ directories: [ { path: props.source, pattern: /\.editor\.ts/ } ] }),
		createFileCache({ directories: [ { path: props.source, pattern: /\.md/ } ] }),
	]);

	const {
		filesToCreate,
		markdownComponentPaths,
		siteconfigFilePath,
		oramaDb,
		absoluteRootDir,
		absoluteLibDir,
		absoluteSourceDir,
	} = await createDocFiles({
		props,
		manifestCache,
		tagCache,
		editorCache,
		markdownCache,
	});

	let config: ResolvedConfig;
	const docConfig: UserConfig = {
		appType:   'mpa',
		publicDir: 'assets/',
		base:      props.base,
		root:      join(pRoot, props.root),
		build:     {
			rollupOptions: {
				input: props.input,
			},
		},
		plugins: [
			((): Plugin => {
				return {
					name: 'mirage-docs',
					configResolved(cfg) {
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
											src:  siteconfigFilePath
												.replace(absoluteRootDir, '')
												.replaceAll(/\\+/g, '/'),
										},
										injectTo: 'head-prepend',
									},
									{
										tag:      'script',
										attrs:    { type: 'module' },
										injectTo: 'head-prepend',
										children: 'import "@roenlie/mirage-docs/dist/app/components/layout.cmp.js"',
									},
									{
										tag:      'script',
										attrs:    { type: 'module' },
										injectTo: 'head-prepend',
										children: 'import "@roenlie/mirage-docs/assets/index.css"',
									},
								],
							};
						},
					},
					buildStart() {
						// Watch markdown files for changes.
						for (const [ , path ] of markdownCache.cache)
							this.addWatchFile(path);
					},
					load(id) {
						this.addWatchFile(id);

						/* if auto importer is being used, transform matching modules */
						if (props.autoImport) {
							const transformed = componentAutoImportLoad({
								id,
								config,
								tagCache,
								tagPrefixes:    props.autoImport.tagPrefixes,
								loadWhitelist:  props.autoImport.loadWhitelist,
								loadBlacklist:  props.autoImport.loadBlacklist,
								tagCaptureExpr: props.autoImport.tagCaptureExpr,
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

						// Add custom hot reload handling for main component when in dev mode.
						if (config.env['DEV'] && markdownComponentPaths.has(id)) {
							code = `
							const __$original = window.customElements.define;
							window.customElements.define = function(...args) {
								try {
									__$original.call(this, ...args);
								} catch(err) { /*  */ }
							}
							\n` + code + `
							if (import.meta.hot) {
								import.meta.hot.accept();
								import.meta.hot.on('vite:beforeUpdate', () => {
									window.top?.postMessage('hmrReload', location.origin);
								});
							}
							`;

							return code;
						}
					},
					async watchChange(id) {
						if (!id.endsWith('.md'))
							return;

						const absoluteCmpPath = DocPath.createFileCachePath(
							id, absoluteSourceDir, absoluteLibDir, 'ts',
						);

						const rootDepth = props.root.split('/').filter(Boolean).length;
						const file = await createMarkdownComponent(
							rootDepth,
							tagCache,
							manifestCache,
							id,
						);

						await promises.writeFile(absoluteCmpPath, file);
					},
				};
			})(),
		],
	};

	const mergedConfig = deepmerge(defineConfig(viteConfig), docConfig) as UserConfig;

	mergedConfig.build ??= {};
	mergedConfig.build.outDir ??= outDir;
	mergedConfig.build.emptyOutDir ??= true;
	mergedConfig.plugins?.push(
		copy({
			targets: [
				{
					src:  './node_modules/@roenlie/mirage-docs/dist/workers',
					dest: join(props.root, mergedConfig.publicDir || 'assets', '.mirage'),
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

		//if (props.debug)
		//	console.log('Finished writing file:', path);
	}));

	// Write the search index file to public disc folder.
	const searchDir = join(pRoot, props.root, mergedConfig.publicDir || 'assets', '.mirage');
	await promises.mkdir(searchDir, { recursive: true });
	await persistToFile(oramaDb, 'json', join(searchDir, 'searchIndexes.json'));

	return mergedConfig;
};
