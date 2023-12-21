import { create, type Orama } from '@orama/orama';
import { defaultHtmlSchema, populate } from '@orama/plugin-parsedoc';
import { promises } from 'fs';
import { join, normalize, resolve } from 'path';

import { type SiteConfig } from '../shared/config.types.js';
import { type Declarations } from '../shared/metadata.types.js';
import { type FilePathCache } from './build/cache/create-file-cache.js';
import { type AutoImportPluginProps } from './build/component/auto-import.types.js';
import { DocPath } from './build/helpers/docpath.js';
import { createEditorComponent } from './create-editor-cmp.js';
import { createIndexFile } from './create-index-file.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';
import { siteConfigTemplate } from './generators/site-config-template.js';
import { tsconfigTemplate } from './generators/tsconfig-template.js';
import { typingsTemplate } from './generators/typings-template.js';


export interface ConfigProperties {
	base: string;
	root: string;
	source: string;
	tagDirs?: { path: string, whitelist?: RegExp[]; blacklist?: RegExp[]; }[];
	input?: string[];
	autoImport?: AutoImportPluginProps;
	siteConfig?: Partial<SiteConfig>;
	debug?: boolean;
}


export const createDocFiles = async (
	args: {
		props: ConfigProperties,
		manifestCache: Map<string, Declarations>,
		tagCache: Map<string, string>,
		editorCache: FilePathCache,
		markdownCache: FilePathCache
	},
) => {
	if (args.props.debug)
		console.time('timer:createDocFiles');

	const { manifestCache, tagCache, editorCache, markdownCache, props } = args;
	const libDir = '.mirage';

	props.siteConfig                   ??= {};
	props.siteConfig.internal          ??= {};
	props.siteConfig.internal.rootDir  ??= props.root;
	props.siteConfig.internal.entryDir ??= props.source;
	props.siteConfig.internal.libDir   ??= libDir;
	props.siteConfig.internal.base 	  ??= props.base;

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const absoluteLibDir    = normalize(join(resolve(), props.root, libDir));
	const absoluteRootDir   = normalize(join(resolve(), props.root));
	const absoluteSourceDir = normalize(join(resolve(), props.source));

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

	props.siteConfig.links ??= {};
	props.siteConfig.links.styles ??= [];
	props.siteConfig.links.scripts ??= [];
	props.siteConfig.links.darkTheme ??= '';
	props.siteConfig.links.darkTheme ??= '';

	props.siteConfig.sidebar ??= {};
	props.siteConfig.sidebar.nameReplacements ??= [
		[ '.docs', '' ],
		[ '.editor', ' Editor' ],
		[ '-', ' ' ],
	];
	//#endregion


	//#region create routes and populate lyra search indexes.
	const oramaDb = await create({
		schema: defaultHtmlSchema,
	}) as Orama<any, any, any, any>;

	const routes = await Promise.all([ ...markdownCache.cache, ...editorCache.cache ].map(async ([ , path ]) => {
		const route = DocPath.createFileRoute(path, absoluteSourceDir);
		const content = await promises.readFile(path, { encoding: 'utf8' });

		await populate(oramaDb, content, 'md', { basePath: route + ':' });

		return route;
	}));
	//#endregion


	//#region create site config file
	const siteconfigFilePath = join(absoluteLibDir, 'siteconfig.ts');
	filesToCreate.set(siteconfigFilePath, siteConfigTemplate(props.siteConfig, routes));
	//#endregion


	//#region create a tsconfig file for the cache folder.
	const tsconfigFilePath = join(absoluteLibDir, 'tsconfig.json');
	filesToCreate.set(tsconfigFilePath, tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	const typingsFilePath = join(absoluteLibDir, 'typings.d.ts');
	filesToCreate.set(typingsFilePath, typingsTemplate);
	//#endregion


	//#region create markdown routes
	// How many levels deep the docsite root is compared to project root.
	const rootDepth = props.root.split('/').filter(Boolean).length;

	const markdownComponentPaths = new Set<string>();

	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const componentContent = await createMarkdownComponent(
			rootDepth,
			tagCache,
			manifestCache,
			path,
		);
		const absoluteCmpPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'ts',
		);
		filesToCreate.set(absoluteCmpPath, componentContent);

		markdownComponentPaths.add(absoluteCmpPath.replaceAll(/\\+/g, '/'));

		const absoluteIndexPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'html',
		);
		const content = createIndexFile(
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			absoluteCmpPath.replace(absoluteRootDir, '').replaceAll(/\\+/g, '/'),
		);
		filesToCreate.set(absoluteIndexPath, content);

		props.input?.push(absoluteIndexPath);
	}));
	//#endregion


	//#region create editor routes
	await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
		const componentPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'ts',
		).replace(absoluteRootDir, '');

		const componentContent = await createEditorComponent(
			componentPath.replaceAll(/\\+/g, '/'), path,
		);
		const absoluteCmpPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'ts',
		);
		filesToCreate.set(absoluteCmpPath, componentContent);

		const absoluteIndexPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'html',
		);
		const content = createIndexFile(
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			absoluteCmpPath.replace(absoluteRootDir, '').replace(/\\+/g, '/'),
		);
		filesToCreate.set(absoluteIndexPath, content);

		props.input?.push(absoluteIndexPath);
	}));
	//#endregion


	if (args.props.debug)
		console.timeEnd('timer:createDocFiles');


	return {
		filesToCreate,
		markdownComponentPaths,
		siteconfigFilePath,
		oramaDb,
		absoluteRootDir,
		absoluteSourceDir,
		absoluteLibDir,
	};
};
