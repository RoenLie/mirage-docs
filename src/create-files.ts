import { join, resolve, sep } from 'path';

import { routeTemplate } from './app/generators/route-template.js';
import { siteConfigTemplate } from './app/generators/site-config-template.js';
import { tsconfigTemplate } from './app/generators/tsconfig-template.js';
import { typingsTemplate } from './app/generators/typings-template.js';
import { createFileCache, FilePathCache } from './build/cache/create-file-cache.js';
import { AutoImportPluginProps } from './build/component/auto-import.types.js';
import { createTagCache } from './build/component/create-tag-cache.js';
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
	const aliases: Record<string, string> = {};
	const routes: string[] = [];

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const relativeRootDir  = '.\\' + props.rootDir;
	const relativeLibDir   = '.\\' + join(props.rootDir, libDir);
	const relativeEntryDir = '.\\' + join(props.rootDir, props.entryDir);

	if (props.debug) {
		console.log({
			projectRoot,
			relativeRootDir,
			relativeLibDir,
		});
	}

	await Promise.all([
		createTagCache({ directories: props.tagDirs }).then(cache => tagCache = cache),
		createFileCache({ directories: [ { path: relativeEntryDir, pattern: /\.editor\.ts/ } ] }).then(cache => editorCache = cache),
		createFileCache({ directories: [ { path: relativeEntryDir, pattern: /.md/ } ] }).then(cache => markdownCache = cache),
	]);

	manifestCache = createManifestCache(tagCache);


	//#region create markdown routes
	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const { path: componentPath, content: componentContent } = await createMarkdownComponent(
			projectRoot, tagCache, manifestCache, props.rootDir, props.entryDir, libDir, path,
		);

		filesToCreate.set(componentPath, componentContent);

		const { file, route } = createIndexFile(
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

		routes.push(route);
	}));
	//#endregion


	//#region create editor routes
	await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
		const { path: componentPath, content: componentContent } = await createEditorComponent(
			projectRoot, props.rootDir, props.entryDir, libDir, path,
		);

		filesToCreate.set(componentPath, componentContent);

		const { file, route } = createIndexFile(
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

		routes.push(route);
	}));
	//#endregion


	//#region create a tsconfig file for the cache folder.
	const tsconfigFilePath = join(relativeLibDir, 'tsconfig.json');
	filesToCreate.set(tsconfigFilePath, tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	const typingsFilePath = join(relativeLibDir, 'typings.d.ts');
	filesToCreate.set(typingsFilePath, typingsTemplate);
	//#endregion


	//#region create a site component config.
	const siteConfigFilePath = join(relativeLibDir, 'site-config.ts');
	const siteConfigContent = siteConfigTemplate(props.siteConfig);

	filesToCreate.set(siteConfigFilePath, siteConfigContent);

	aliases['alias:site-config.js'] = join(projectRoot, props.rootDir, libDir, 'site-config.ts').replaceAll('\\', '/');
	//#endregion


	//#region create the routes file
	const routesFilePath = join(relativeLibDir, 'routes.ts');
	filesToCreate.set(routesFilePath, routeTemplate(routes));

	aliases['alias:routes.js'] = join(projectRoot, props.rootDir, libDir, 'routes.ts').replaceAll('\\', '/');
	//#endregion


	if (props.debug) {
		filesToCreate.forEach((content, path) => {
			console.log(path);
		});
	}

	return {
		filesToCreate,
		aliases,
		tagCache,
		manifestCache,
	};
};
