import { join, resolve, sep } from 'path';

import { siteConfigTemplate } from './app/generators/site-config-template.js';
import { tsconfigTemplate } from './app/generators/tsconfig-template.js';
import { typingsTemplate } from './app/generators/typings-template.js';
import { createFileCache, FilePathCache } from './build/cache/create-file-cache.js';
import { AutoImportPluginProps } from './build/component/auto-import.types.js';
import { createTagCache } from './build/component/create-tag-cache.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import { Declarations } from './build/manifest/metadata.types.js';
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


const pRoot = resolve(resolve());


export const createDocFiles = async (
	props: ConfigProperties,
) => {
	props.tagDirs ??= [ { path: './src' } ];

	props.input ??= { main: resolve(pRoot, 'index.html') };
	props.siteConfig ??= {};

	props.rootDir ??= '';
	props.entryDir ??= './src';
	props.rootDir = props.rootDir.replaceAll('./', '');
	props.entryDir = props.entryDir.replaceAll('./', '');

	props.siteConfig.internal           ??= {} as any;
	props.siteConfig.internal!.rootDir  ??= props.rootDir;
	props.siteConfig.internal!.entryDir ??= props.entryDir;
	props.siteConfig.internal!.libDir   ??= '.mirage';

	let tagCache: Map<string, string> = new Map();
	let manifestCache: Map<string, Declarations> = new Map();
	let markdownCache: FilePathCache = {} as any;
	let editorCache: FilePathCache = {} as any;

	const libDir = props.siteConfig.internal!.libDir;
	const aliases: Record<string, string> = {};

	/** Holds the path and content that will be created. */
	const filesToCreate = new Map<string, string>();

	const relativeRootDir = '.\\' + props.rootDir;
	const relativeLibDir = '.\\' + join(props.rootDir, libDir);
	const relativeEntryDir = '.\\' + join(props.rootDir, props.entryDir);

	if (props.debug) {
		console.log({
			projectDir: pRoot,
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
	const routes: string[] = [];


	//#region create a site component config.
	const siteConfigFilePath = join(relativeLibDir, 'site-config.ts');
	const siteConfigContent = siteConfigTemplate(props.siteConfig);

	filesToCreate.set(siteConfigFilePath, siteConfigContent);

	aliases['alias:site-config.js'] = join(relativeLibDir, 'site-config.ts')
		.replaceAll('\\', '/');
	//#endregion


	//#region create a tsconfig file for the cache folder.
	const tsconfigFilePath = join(relativeLibDir, 'tsconfig.json');
	filesToCreate.set(tsconfigFilePath, tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	const typingsFilePath = join(relativeLibDir, 'typings.d.ts');
	filesToCreate.set(typingsFilePath, typingsTemplate);
	//#endregion

	let counter = 0;

	//#region create markdown routes
	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const { path: componentPath, content: componentContent } = await createMarkdownComponent(
			pRoot, tagCache, manifestCache, props.rootDir, props.entryDir, libDir, path,
		);

		filesToCreate.set(componentPath, componentContent);

		const { file, route } = createIndexFile(
			pRoot, props.rootDir, props.entryDir, libDir,
			props.siteConfig?.links?.styles ?? [],
			props.siteConfig?.links?.scripts ?? [],
			path,
			componentPath.replaceAll('\\', '/'),
		);

		filesToCreate.set(file.path, file.content);

		Object.assign(props.input ??= {}, {
			[file.path.split(sep).at(-1)!]: file.path.replaceAll('\\', '/'),
		});

		routes.push(route);
	}));
	//#endregion


	//#region create editor routes
	//const createEditorFromFile = async (path: string, content?: string) => {
	//	if (!content)
	//		content = await promises.readFile(path, { encoding: 'utf8' });

	//	const componentTag      = createComponentTagFromPath(path);
	//	const componentClass    = createComponentNameFromPath(path);

	//	content = content
	//		.replaceAll('`', '\\`')
	//		.replaceAll('$', '\\$');

	//	const component = editorPageTemplate({
	//		editorId: '@roenlie/mirage-docs/dist/app/components/component-editor.js',
	//		codeId:   path,
	//		tag:      componentTag,
	//		class:    componentClass,
	//		code:     content,
	//	});

	//	return component;
	//};

	//await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
	//	const moduleId = createModuleIdFromPath(path);
	//	const fileName = parse(path).name + '.ts';

	//	createIndexFile('./' + fileName, path);

	//	const withoutExt = path.split(/\./).slice(0, -1).join('.');
	//	const withoutRoot = withoutExt
	//		.replace(pRoot, '')
	//		.replace(pRootForwardSlash, '');

	//	const withoutExtra = withoutRoot
	//		.replace(props.rootDir.replace('./', ''), '')
	//		.replace(props.entryDir.replace('./', ''), '');

	//	const fullScriptPath = join(relativeLibDir, withoutExtra) + '.ts';
	//	const projectScriptPath = join(props.rootDir, libDir, withoutExtra) + '.ts';

	//	if (props.debug)
	//		console.log('creating file:', fullScriptPath);

	//	filesToCreate.set(fullScriptPath, await createEditorFromFile(path));
	//	//await promises.writeFile(fullScriptPath, await createEditorFromFile(path));

	//	aliases[moduleId] = projectScriptPath;
	//}));
	//#endregion


	//#region create the routes file
	const routesFilePath = join(relativeLibDir, 'routes.ts');
	const routesFileContent = `export default [ ${ routes.map(r => `'${ r }'`).join(',\n') } ]`;

	filesToCreate.set(routesFilePath, routesFileContent);
	aliases['alias:routes.js'] = join(relativeLibDir, 'routes.ts')
		.replaceAll('\\', '/');
	//#endregion

	if (props.debug) {
		//filesToCreate.forEach((content, path) => console.log(path));
		Object.entries(props.input).forEach(entry => {
			console.log(entry);
		});
	}

	return {
		filesToCreate,
		aliases,
		tagCache,
		manifestCache,
	};
};
