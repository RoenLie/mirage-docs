import { join, resolve, sep } from 'path';

import { siteConfigTemplate } from './app/generators/site-config-template.js';
import { tsconfigTemplate } from './app/generators/tsconfig-template.js';
import { typingsTemplate } from './app/generators/typings-template.js';
import { createFileCache, FilePathCache } from './build/cache/create-file-cache.js';
import { createTagCache } from './build/cache/create-tag-cache.js';
import { AutoImportPluginProps } from './build/component/auto-import.types.js';
import { SiteConfig } from './build/config.types.js';
import { DocPath } from './build/helpers/docpath.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { Declarations } from './build/manifest/metadata.types.js';
import { createEditorComponent } from './create-editor-cmp.js';
import { createIndexFile } from './create-index-file.js';
import { createMarkdownComponent } from './create-markdown-cmp.js';


export interface ConfigProperties {
	rootDir: string;
	entryDir: string;
	tagDirs?: { path: string, whitelist?: RegExp[]; blacklist?: RegExp[]; }[];
	input?: Record<string, string>;
	autoImport?: AutoImportPluginProps;
	siteConfig?: Partial<SiteConfig>;
	debug?: boolean;
}


export const createDocFiles = async (
	projectRoot: string,
	props: ConfigProperties,
) => {
	props.tagDirs    ??= [ { path: './src' } ];
	props.input      ??= { main: resolve(projectRoot, 'index.html') };
	props.siteConfig ??= {};
	props.rootDir    ??= '';
	props.entryDir   ??= './src';
	props.rootDir    = props.rootDir.replaceAll('./', '');
	props.entryDir   = props.entryDir.replaceAll('./', '');

	props.siteConfig.internal           ??= {} as any;
	props.siteConfig.internal!.rootDir  ??= props.rootDir;
	props.siteConfig.internal!.entryDir ??= props.entryDir;
	props.siteConfig.internal!.libDir   ??= '.mirage';

	let tagCache:      Map<string, string> = new Map();
	let manifestCache: Map<string, Declarations> = new Map();
	let markdownCache: FilePathCache = {} as any;
	let editorCache:   FilePathCache = {} as any;

	const libDir = props.siteConfig.internal!.libDir;

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const relativeLibDir   = '.' + sep + join(props.rootDir, libDir);
	const relativeEntryDir = '.' + sep + join(props.rootDir, props.entryDir);


	// Cache all relevant files.
	await Promise.all([
		createTagCache({ directories: props.tagDirs }).then(cache => tagCache = cache),
		createManifestCache({ directories: props.tagDirs }).then(cache => manifestCache = cache),
		createFileCache({ directories: [ { path: relativeEntryDir, pattern: /\.editor\.ts/ } ] }).then(cache => editorCache = cache),
		createFileCache({ directories: [ { path: relativeEntryDir, pattern: /\.md/ } ] }).then(cache => markdownCache = cache),
	]);


	//#region gather all route paths.
	const routes = [ ...markdownCache.cache, ...editorCache.cache ].map(([ , path ]) => {
		const preparedPath = DocPath.preparePath(projectRoot, path);
		const targetLibPath = DocPath.targetLibDir(preparedPath, props.rootDir, props.entryDir, libDir, 'html');
		let route = targetLibPath.replaceAll('\\', '/').replace('.html', '');
		while (route.startsWith('/'))
			route = route.slice(1);

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


	//#region create markdown routes
	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const { path: componentPath, content: componentContent } = await createMarkdownComponent(
			projectRoot, tagCache, manifestCache, props.rootDir, props.entryDir, libDir, path,
		);

		filesToCreate.set(componentPath, componentContent);

		const { file } = createIndexFile(
			projectRoot, props.rootDir, props.entryDir, libDir,
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			'/' + componentPath.replaceAll('\\', '/'),
		);

		filesToCreate.set(file.path, file.content);

		Object.assign(props.input ??= {}, {
			[file.path.split(sep).at(-1)!]: file.path.replaceAll('\\', '/'),
		});
	}));
	//#endregion


	//#region create editor routes
	await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
		const { path: componentPath, content: componentContent } = await createEditorComponent(
			projectRoot, props.rootDir, props.entryDir, libDir, path,
		);

		filesToCreate.set(componentPath, componentContent);

		const { file } = createIndexFile(
			projectRoot, props.rootDir, props.entryDir, libDir,
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			'/' + componentPath.replaceAll('\\', '/'),
		);

		filesToCreate.set(file.path, file.content);

		Object.assign(props.input ??= {}, {
			[file.path.split(sep).at(-1)!]: file.path.replaceAll('\\', '/'),
		});
	}));
	//#endregion


	return {
		filesToCreate,
		tagCache,
		manifestCache,
		siteconfigFilePath,
	};
};
