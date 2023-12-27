import { create, type Orama } from '@orama/orama';
import { defaultHtmlSchema, populate } from '@orama/plugin-parsedoc';
import { deepmerge } from 'deepmerge-ts';
import { promises } from 'fs';
import { join, normalize, resolve } from 'path';

import { type SiteConfig, type UserSiteConfig } from '../shared/config.types.js';
import { type Declarations } from '../shared/metadata.types.js';
import { type FilePathCache } from './build/cache/create-file-cache.js';
import { type AutoImportPluginProps } from './build/component/auto-import.types.js';
import { DocPath } from './build/helpers/docpath.js';
import { createEditorComponent } from './create-editor-cmp.js';
import { createIndexFile } from './create-index-file.js';
import { MarkdownComponentFactory } from './create-markdown-cmp.js';
import { siteConfigTemplate } from './generators/site-config-template.js';
import { tsconfigTemplate } from './generators/tsconfig-template.js';
import { typingsTemplate } from './generators/typings-template.js';


export interface ConfigProperties {
	base: string;
	root: string;
	source: string;
	tagDirs?: {
		path: string;
		whitelist?: RegExp[];
		blacklist?: RegExp[];
	}[];
	input?: string[];
	autoImport?: AutoImportPluginProps;
	siteConfig?: UserSiteConfig;
	debug?: boolean;
}


export type InternalConfigProperties = Omit<Required<ConfigProperties>, 'autoImport' | 'siteConfig'> & {
	autoImport?: AutoImportPluginProps;
	siteConfig: SiteConfig;
};


export const createDocFiles = async (
	args: {
		props: InternalConfigProperties,
		manifestCache: Map<string, Declarations>,
		tagCache: Map<string, string>,
		editorCache: FilePathCache,
		markdownCache: FilePathCache,
	},
) => {
	const { manifestCache, tagCache, editorCache, markdownCache, props } = args;
	const libDir = props.siteConfig.env.libDir;

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const absoluteLibDir    = normalize(join(resolve(), props.root, libDir));
	const absoluteRootDir   = normalize(join(resolve(), props.root));
	const absoluteSourceDir = normalize(join(resolve(), props.source));

	const markdownAndEditorPaths = [
		...markdownCache.cache.values(),
		...editorCache.cache.values(),
	];

	const routes = markdownAndEditorPaths.map(path =>
		DocPath.createFileRoute(path, absoluteSourceDir));

	//#region create and populate orama search indexes.
	const oramaDb = await create({
		schema: defaultHtmlSchema,
	}) as Orama<any, any, any, any>;

	await Promise.all(markdownAndEditorPaths.map(async path => {
		const content = await promises.readFile(path, { encoding: 'utf8' });
		const route = DocPath.createFileRoute(path, absoluteSourceDir);
		await populate(oramaDb, content, 'md', { basePath: route + ':' });
	}));
	//#endregion


	//#region create a tsconfig file for the cache folder.
	const tsconfigFilePath = join(absoluteLibDir, 'tsconfig.json');
	filesToCreate.set(tsconfigFilePath, tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	const typingsFilePath = join(absoluteLibDir, 'typings.d.ts');
	filesToCreate.set(typingsFilePath, typingsTemplate);
	//#endregion


	//#region create site config file
	const siteconfigFilePath = join(absoluteLibDir, 'siteconfig.ts');
	filesToCreate.set(siteconfigFilePath, siteConfigTemplate(props.siteConfig, routes));
	//#endregion


	//#region create markdown routes
	// How many levels deep the docsite root is compared to project root.
	const rootDepth = props.root.split('/').filter(Boolean).length;
	const markdownComponentPaths = new Set<string>();

	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const factory = new MarkdownComponentFactory({
			path,
			tagCache,
			rootDepth,
			manifestCache,
		});

		const componentContent = await factory.create();
		const absoluteCmpPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'ts',
		);

		filesToCreate.set(absoluteCmpPath, componentContent);

		markdownComponentPaths.add(absoluteCmpPath.replaceAll(/\\+/g, '/'));

		const absoluteIndexPath = DocPath.createFileCachePath(
			path, absoluteSourceDir, absoluteLibDir, 'html',
		);
		const content = createIndexFile(
			props.siteConfig.pages.styles,
			props.siteConfig.pages.scripts,
			path,
			absoluteCmpPath.replace(absoluteRootDir, '').replaceAll(/\\+/g, '/'),
			siteconfigFilePath.replace(absoluteRootDir, '').replace(/\\+/g, '/'),
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
			props.siteConfig.pages.styles,
			props.siteConfig.pages.scripts,
			path,
			absoluteCmpPath.replace(absoluteRootDir, '').replace(/\\+/g, '/'),
			siteconfigFilePath.replace(absoluteRootDir, '').replace(/\\+/g, '/'),
		);
		filesToCreate.set(absoluteIndexPath, content);

		props.input?.push(absoluteIndexPath);
	}));
	//#endregion


	return {
		filesToCreate,
		markdownComponentPaths,
		siteconfigImportPath: siteconfigFilePath
			.replace(absoluteRootDir, '')
			.replaceAll(/\\+/g, '/'),
		oramaDb,
		absoluteRootDir,
		absoluteSourceDir,
		absoluteLibDir,
	};
};
