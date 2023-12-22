import { persistToFile } from '@orama/plugin-data-persistence/server';
import { deepmerge } from 'deepmerge-ts';
import { promises } from 'fs';
import { join, normalize, resolve, sep } from 'path';
import copy from 'rollup-plugin-copy';
import { defineConfig, type UserConfig } from 'vite';

import { createFileCache } from './build/cache/create-file-cache.js';
import { createTagCache } from './build/cache/create-tag-cache.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { type ConfigProperties, createDocFiles } from './create-files.js';
import { createPlugin } from './create-plugin.js';
import { Spinner } from './spinner.js';


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

	Spinner.start('basic');

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
	props.logPerformance && console.time('caching files');

	const [ manifestCache, tagCache, editorCache, markdownCache ] = await Promise.all([
		createManifestCache({ directories: props.tagDirs! }),
		createTagCache({ directories: props.tagDirs! }),
		createFileCache({ directories: [ { path: props.source, pattern: /\.editor\.ts/ } ] }),
		createFileCache({ directories: [ { path: props.source, pattern: /\.md/ } ] }),
	]);

	props.logPerformance && console.timeEnd('caching files');

	const {
		filesToCreate,
		oramaDb,
		markdownComponentPaths,
		siteconfigFilePath,
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
			createPlugin({
				props,
				tagCache,
				manifestCache,
				markdownCache,
				markdownComponentPaths,
				siteconfigFilePath,
				absoluteRootDir,
				absoluteLibDir,
				absoluteSourceDir,
			}),
		],
	};

	const mergedConfig = deepmerge(defineConfig(viteConfig), docConfig);

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
	props.logPerformance && console.time('writing files');
	await Promise.all([ ...filesToCreate ].map(async ([ path, content ]) => {
		props.debug && console.log('Attempting to write file:', path);

		await promises.mkdir(path.split(sep).slice(0, -1).join(sep), { recursive: true });
		await promises.writeFile(path, content);

		props.debug && console.log('Finished writing file:', path);
	}));
	props.logPerformance && console.timeEnd('writing files');


	// Write the search index file to public disc folder.
	props.logPerformance && console.time('writing search index');
	const searchDir = join(pRoot, props.root, mergedConfig.publicDir || 'assets', '.mirage');
	await promises.mkdir(searchDir, { recursive: true });
	await persistToFile(oramaDb, 'json', join(searchDir, 'searchIndexes.json'));
	props.logPerformance && console.timeEnd('writing search index');

	Spinner.stop();

	return mergedConfig;
};
