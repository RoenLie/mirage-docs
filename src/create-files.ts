import { create } from '@orama/orama';
import { defaultHtmlSchema, populate } from '@orama/plugin-parsedoc';
import { promises } from 'fs';
import { join, normalize, resolve, sep } from 'path';

import { siteConfigTemplate } from './app/generators/site-config-template.js';
import { tsconfigTemplate } from './app/generators/tsconfig-template.js';
import { typingsTemplate } from './app/generators/typings-template.js';
import { _shortenUrl } from './app/utilities/shorten-url-internal.js';
import { type FilePathCache } from './build/cache/create-file-cache.js';
import { type AutoImportPluginProps } from './build/component/auto-import.types.js';
import { type SiteConfig } from './build/config.types.js';
import { DocPath } from './build/helpers/docpath.js';
import { type Declarations } from './build/manifest/metadata.types.js';
import { createEditorComponent } from './create-editor-cmp.js';
import { createIndexFile } from './create-index-file.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';


export interface ConfigProperties {
	root: string;
	source: string;
	tagDirs?: { path: string, whitelist?: RegExp[]; blacklist?: RegExp[]; }[];
	//input?: Record<string, string>;
	input?: string[];
	autoImport?: AutoImportPluginProps;
	siteConfig?: Partial<SiteConfig>;
	debug?: boolean;
}


export const createDocFiles = async (
	args: {
		projectRoot: string,
		base: string,
		props: ConfigProperties,
		manifestCache: Map<string, Declarations>,
		tagCache: Map<string, string>,
		editorCache: FilePathCache,
		markdownCache: FilePathCache
	},
) => {
	if (args.props.debug)
		console.time('timer:createDocFiles');


	const {
		manifestCache, tagCache, editorCache,
		markdownCache, props, base, projectRoot,
	} = args;

	props.siteConfig ??= {};

	props.siteConfig.internal           ??= {} as any;
	props.siteConfig.internal!.rootDir  ??= props.root;
	props.siteConfig.internal!.entryDir ??= props.source;
	props.siteConfig.internal!.libDir   ??= '.mirage';
	props.siteConfig.internal!.base 		??= base;

	const rootDepth = props.root.split('/').filter(Boolean).length;
	const libDir = props.siteConfig.internal!.libDir;

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const relativeLibDir   = '.' + sep + normalize(join(props.root, libDir));
	const relativeEntryDir = props.source;

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


	//#region create routes and populate lyra search indexes.
	const oramaDb = await create({
		schema: defaultHtmlSchema,
	});

	const routes = await Promise.all([ ...markdownCache.cache, ...editorCache.cache ].map(async ([ , path ]) => {
		let route = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		).replace(props.root, '').replaceAll('\\', '/').replace('.html', '');

		route = _shortenUrl(libDir, props.source, route);

		const content = await promises.readFile(path, { encoding: 'utf8' });
		await populate(oramaDb, content, 'md', {
			basePath: route + ':',
		});

		return route;
	}));
	//#endregion


	//#region create site config file

	console.log('THE ROOT IS THIS WHEN TRYING TO MAKE FILE: ', props.root);
	console.log('THIS IS THE PATH PARTS', [ resolve(), props.root, libDir, 'siteconfig.ts' ]);


	const siteconfigFilePath = normalize(join(resolve(), props.root, libDir, 'siteconfig.ts'));
	filesToCreate.set(siteconfigFilePath, siteConfigTemplate(props.siteConfig, routes));
	//#endregion


	//#region create a tsconfig file for the cache folder.
	const tsconfigFilePath = normalize(join(resolve(), props.root, libDir, 'tsconfig.json'));
	filesToCreate.set(tsconfigFilePath, tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	const typingsFilePath = normalize(join(resolve(), props.root, libDir, 'typings.d.ts'));
	filesToCreate.set(typingsFilePath, typingsTemplate);
	//#endregion


	//#region create markdown routes
	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const componentTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'ts',
		);

		const componentContent = await createMarkdownComponent(
			projectRoot,
			rootDepth,
			tagCache,
			manifestCache,
			componentTargetPath,
			path,
		);

		const absoluteCmpPath = normalize(join(resolve(), componentTargetPath));
		filesToCreate.set(absoluteCmpPath, componentContent);

		let indexTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		);
		indexTargetPath = normalize(join(resolve(), indexTargetPath));

		const content = createIndexFile(
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			// Here we remove the vite root from the file.
			componentTargetPath.replace(props.root, '').replaceAll(/\\{1,}/g, '/'),
		);

		filesToCreate.set(indexTargetPath, content);

		props.input?.push(indexTargetPath);
	}));
	//#endregion


	//#region create editor routes
	await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
		const componentTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'ts',
		);

		const componentContent = await createEditorComponent(
			componentTargetPath.replace(props.root, '').replaceAll(/\\+/g, '/'),
			path,
		);

		const absoluteCmpPath = normalize(join(resolve(), componentTargetPath));
		filesToCreate.set(absoluteCmpPath, componentContent);

		let indexTargetPath = DocPath.createCachePath(
			projectRoot, path, relativeEntryDir, relativeLibDir, 'html',
		);
		indexTargetPath = normalize(join(resolve(), indexTargetPath));

		const content = createIndexFile(
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			componentTargetPath.replace(props.root, '').replaceAll(/\\{1,}/g, '/'),
		);
		filesToCreate.set(indexTargetPath, content);

		props.input?.push(indexTargetPath);
	}));
	//#endregion


	if (args.props.debug)
		console.timeEnd('timer:createDocFiles');


	return {
		filesToCreate,
		siteconfigFilePath,
		oramaDb,
		relativeEntryDir,
		relativeLibDir,
	};
};
