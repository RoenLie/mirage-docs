import { promises } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';

import { persistToFile } from '@orama/plugin-data-persistence/server';
import { deepmerge } from 'deepmerge-ts';
import copy from 'rollup-plugin-copy';
import { defineConfig, type UserConfig } from 'vite';

import { createFileCache } from './build/cache/create-file-cache.js';
import { createTagCache } from './build/cache/create-tag-cache.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { type ConfigProperties, createDocFiles } from './create-files.js';
import { createPlugin } from './create-plugin.js';
import { ConsoleBar } from './progress-bar.js';


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

	console.log('Mirage Docs creating and setting up environment...');
	const bar = new ConsoleBar({
		formatString:  '#spinner ##blue#bar ##default##dim#count ##default##bright#message',
		hideCursor:    true,
		enableSpinner: true,
		total:         5,
		doneSymbol:    '■',
		undoneSymbol:  ' ',
	});

	// Base url of the application, will certain relative paths.
	props.base ??= '';

	// We enforce it to start with a leading /, then we add a . to make it relative.
	props.source = '.' + props.source;

	// We enforce it to start with / then we remove it.
	props.root = props.root.replace(/^\/|^\\/, '');

	// Always include the main index.html file.
	props.input ??= [];
	props.input.push(normalize(join(pRoot, props.root, 'index.html')));

	// We by default look for tags where the entry dir is.
	props.tagDirs    ??= [ { path: props.source } ];

	// Cache all relevant files.
	bar.update(bar.current + 1, 'Caching files');

	const [ manifestCache, tagCache, editorCache, markdownCache ] = await Promise.all([
		createManifestCache({ directories: props.tagDirs! }),
		createTagCache({ directories: props.tagDirs! }),
		createFileCache({ directories: [ { path: props.source, pattern: /\.editor\.ts/ } ] }),
		createFileCache({ directories: [ { path: props.source, pattern: /\.md/ } ] }),
	]);

	bar.update(bar.current + 1, 'Creating file scaffolding');

	const {
		filesToCreate,
		oramaDb,
		markdownComponentPaths,
		siteconfigImportPath,
		absoluteLibDir,
		absoluteSourceDir,
	} = await createDocFiles({
		props,
		manifestCache,
		tagCache,
		editorCache,
		markdownCache,
	});

	bar.update(bar.current + 1, 'Finished creating file scaffolding');

	const docConfig: UserConfig = {
		appType: 'mpa',
		base:    props.base,
		root:    join(pRoot, props.root),
		build:   {
			rollupOptions: {
				input: props.input,
			},
		},
		plugins: [
			createPlugin({
				props,
				tagCache,
				manifestCache,
				markdownCache,
				markdownComponentPaths,
				siteconfigImportPath,
				absoluteLibDir,
				absoluteSourceDir,
			}),
		],
	};

	const mergedConfig = deepmerge(defineConfig(viteConfig), docConfig);

	mergedConfig.publicDir ||= 'public';

	mergedConfig.build ??= {};
	mergedConfig.build.outDir ??= outDir;
	mergedConfig.build.emptyOutDir ??= true;
	mergedConfig.plugins?.push(
		copy({
			targets: [
				{
					src:  './node_modules/@roenlie/mirage-docs/dist/workers',
					dest: join(props.root, mergedConfig.publicDir, '.mirage'),
				},
			],
			hook:     'config',
			copyOnce: true,
		}) as any,
	);

	mergedConfig.build.rollupOptions ??= {};
	mergedConfig.build.rollupOptions.output ??= {};
	if (Array.isArray(mergedConfig.build.rollupOptions.output))
		throw new Error('Mirage Docs does not support: rollupOptions => output as an Array.');

	mergedConfig.build.rollupOptions.output.manualChunks = (id) => {
		if (id.includes('monaco-editor'))
			return 'monaco-editor';
		if (id.endsWith('siteconfig.ts'))
			return 'site-config';
	};

	// Write the mirage files to mirage disc location.
	bar.update(bar.current + 1, 'Writing files to disk');

	await Promise.all([ ...filesToCreate ].map(async ([ path, content ]) => {
		props.debug && console.log('Attempting to write file:', path);

		await promises.mkdir(path.split(sep).slice(0, -1).join(sep), { recursive: true });
		await promises.writeFile(path, content);

		props.debug && console.log('Finished writing file:', path);
	}));

	// Write the search index file to public disc folder.
	bar.update(bar.current + 1, 'Writing search indexes to disk');

	const searchDir = join(pRoot, props.root, mergedConfig.publicDir, '.mirage');
	await promises.mkdir(searchDir, { recursive: true });
	await persistToFile(oramaDb, 'json', join(searchDir, 'searchIndexes.json'));

	// creating a newline so that progress is not too close to vite output.
	console.log('');

	return mergedConfig;
};
