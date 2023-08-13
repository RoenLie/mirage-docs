import { create } from '@orama/orama';
import { defaultHtmlSchema, populate } from '@orama/plugin-parsedoc';
import { promises } from 'fs';
import { join, normalize, resolve, sep } from 'path';

import { siteConfigTemplate } from './app/generators/site-config-template.js';
import { tsconfigTemplate } from './app/generators/tsconfig-template.js';
import { typingsTemplate } from './app/generators/typings-template.js';
import { createFileCache, type FilePathCache } from './build/cache/create-file-cache.js';
import { createTagCache } from './build/cache/create-tag-cache.js';
import { type AutoImportPluginProps } from './build/component/auto-import.types.js';
import { type SiteConfig } from './build/config.types.js';
import { DocPath } from './build/helpers/docpath.js';
import { trim, trimHash } from './build/helpers/string.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { type Declarations } from './build/manifest/metadata.types.js';
import { createEditorComponent } from './create-editor-cmp.js';
import { createIndexFile } from './create-index-file.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';


export interface ConfigProperties {
	root: string;
	entryDir: string;
	tagDirs?: { path: string, whitelist?: RegExp[]; blacklist?: RegExp[]; }[];
	input?: Record<string, string>;
	autoImport?: AutoImportPluginProps;
	siteConfig?: Partial<SiteConfig>;
	debug?: boolean;
}


export const createDocFiles = async (
	projectRoot: string,
	base: string,
	props: ConfigProperties,
	args: {
		manifestCache: Map<string, Declarations>,
		tagCache: Map<string, string>,
		editorCache: FilePathCache,
		markdownCache: FilePathCache
	},
) => {
	const {
		manifestCache,
		tagCache,
		editorCache,
		markdownCache,
	} = args;
	props.siteConfig ??= {};

	props.siteConfig.internal           ??= {} as any;
	props.siteConfig.internal!.rootDir  ??= props.root;
	props.siteConfig.internal!.entryDir ??= props.entryDir;
	props.siteConfig.internal!.libDir   ??= '.mirage';
	props.siteConfig.internal!.base 		??= base;

	const libDir = props.siteConfig.internal!.libDir;

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const relativeLibDir   = '.' + sep + normalize(join(props.root, libDir));
	const relativeEntryDir = props.entryDir;

	//#region gather all route paths.
	const routes = [ ...markdownCache.cache, ...editorCache.cache ].map(([ , path ]) => {
		console.log({ projectRoot, path, relativeEntryDir, relativeLibDir });

		const route = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		).replace(props.root, '').replaceAll('\\', '/').replace('.html', '');

		return route;
	});
	//#endregion


	//#region fix any potential missing props in site config
	props.siteConfig ??= {};

	props.siteConfig.styles ??= {};
	props.siteConfig.styles.layout ??= '';
	props.siteConfig.styles.layout ??= '';
	props.siteConfig.styles.sidebar ??= '';
	props.siteConfig.styles.pathTree ??= '';
	props.siteConfig.styles.metadata ??= '';
	props.siteConfig.styles.cmpEditor ??= '';
	props.siteConfig.styles.pageHeader ??= '';
	props.siteConfig.styles.sourceEditor ??= '';
	props.siteConfig.styles.pageTemplate ??= '';

	props.siteConfig.sidebar ??= {};
	props.siteConfig.sidebar.nameReplacements ??= [
		[ '.docs', '' ],
		[ '.editor', ' Editor' ],
		[ '-', ' ' ],
	];

	props.siteConfig.links ??= {};
	props.siteConfig.links.styles ??= [];
	props.siteConfig.links.scripts ??= [];
	props.siteConfig.links.darkTheme ??= '';
	props.siteConfig.links.darkTheme ??= '';
	//#endregion


	//#region create site config file
	const siteconfigFilePath = join(relativeLibDir, 'siteconfig.ts');
	filesToCreate.set(siteconfigFilePath, siteConfigTemplate(props.siteConfig, routes));
	//#endregion


	//#region create a tsconfig file for the cache folder.
	const tsconfigFilePath = join(relativeLibDir, 'tsconfig.json');
	filesToCreate.set(tsconfigFilePath, tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	const typingsFilePath = join(relativeLibDir, 'typings.d.ts');
	filesToCreate.set(typingsFilePath, typingsTemplate);
	//#endregion


	//#region create lyra search indexes.
	const oramaDb = await create({
		schema: defaultHtmlSchema,
	});

	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const content = await promises.readFile(path, { encoding: 'utf8' });

		let route = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		).replaceAll('\\', '/').replace('.html', '');

		route = trimHash(trim([ libDir ]), route);

		await populate(oramaDb, content, 'md', {
			basePath: route + ':',
		});
	}));
	//#endregion


	//#region create markdown routes
	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const componentTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'ts',
		);

		const { content: componentContent } = await createMarkdownComponent(
			projectRoot,
			tagCache,
			manifestCache,
			componentTargetPath,
			path,
		);

		filesToCreate.set(componentTargetPath, componentContent);

		const indexTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		);

		const { content } = createIndexFile(
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			// Here we remove the vite root from the file.
			componentTargetPath.replace(props.root, '').replaceAll(/\\{1,}/g, '/'),
		);

		filesToCreate.set(indexTargetPath, content);

		Object.assign(props.input ??= {}, {
			[indexTargetPath.split(sep).at(-1)!]: indexTargetPath.replaceAll('\\', '/'),
		});
	}));
	//#endregion


	//#region create editor routes
	await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
		const componentTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'ts',
		);

		const componentContent = await createEditorComponent(
			componentTargetPath.replace(props.root, '').replaceAll(/\\{1,}/g, '/'),
			path,
		);

		filesToCreate.set(componentTargetPath, componentContent);

		const indexTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		);

		const { content } = createIndexFile(
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			componentTargetPath.replace(props.root, '').replaceAll(/\\{1,}/g, '/'),
		);

		filesToCreate.set(indexTargetPath, content);

		Object.assign(props.input ??= {}, {
			[indexTargetPath.split(sep).at(-1)!]: indexTargetPath.replaceAll('\\', '/'),
		});
	}));
	//#endregion


	return {
		filesToCreate,
		siteconfigFilePath,
		oramaDb,
		relativeEntryDir,
		relativeLibDir,
	};
};
