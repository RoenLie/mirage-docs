import { deepmerge } from 'deepmerge-ts';
import { promises, readFileSync, rmSync } from 'fs';
import { dirname, join, normalize, parse, resolve } from 'path';
import { defineConfig, Plugin, ResolvedConfig, UserConfig, UserConfigExport } from 'vite';

import { docPageTemplate } from './app/generators/doc-page-template.js';
import { editorPageTemplate } from './app/generators/editor-page-template.js';
import { indexPageTemplate } from './app/generators/index-page-template.js';
import { siteConfigTemplate } from './app/generators/site-config-template.js';
import { tsconfigTemplate } from './app/generators/tsconfig-template.js';
import { typingsTemplate } from './app/generators/typings-template.js';
import { createFileCache, FilePathCache } from './build/cache/create-file-cache.js';
import { componentAutoImportLoad } from './build/component/auto-import.js';
import type { AutoImportPluginProps } from './build/component/auto-import.types.js';
import { createTagCache, getUsedTags } from './build/component/create-tag-cache.js';
import { SiteConfig } from './build/config.types.js';
import { isEmptyObject } from './build/helpers/is-empty-object.js';
import { stringDedent } from './build/helpers/string-dedent.js';
import { toCamelCase } from './build/helpers/to-camel-case.js';
import { createComponentNameFromPath, createComponentTagFromPath, createModuleIdFromPath } from './build/helpers/virtual-helpers.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import type { Declarations } from './build/manifest/metadata.types.js';
import { markdownIt } from './build/markdown/markdown-it.js';


const pRoot = resolve(resolve());
const pRootForwardSlash = pRoot.replaceAll('\\', '/');
const outDir = resolve(resolve(), 'dist');


interface ConfigProperties {
	rootDir: string;
	entryDir: string;
	tagDirs?: { path: string, whitelist?: RegExp[]; blacklist?: RegExp[]; }[];
	input?: Record<string, string>;
	autoImport?: AutoImportPluginProps;
	siteConfig?: Partial<SiteConfig>
}


export const defineDocConfig = async (
	viteConfig: UserConfig,
	props: ConfigProperties,
) => {
	let {
		input = { main: resolve(pRoot, 'index.html') },
		rootDir = '',
		entryDir = './src',
		tagDirs = [ { path: './src' } ],
		siteConfig = {} as SiteConfig,
	} = props;

	let config: ResolvedConfig;
	let tagCache: Map<string, string> = new Map();
	let manifestCache: Map<string, Declarations> = new Map();
	let markdownCache: FilePathCache = {} as any;
	let editorCache: FilePathCache = {} as any;

	siteConfig.internal           ??= {} as any;
	siteConfig.internal!.rootDir  ??= rootDir;
	siteConfig.internal!.entryDir ??= entryDir;
	siteConfig.internal!.libDir   ??= '.mirage';
	const libDir = siteConfig.internal!.libDir;
	const aliases: Record<string, string> = {};


	/** Clean out old cached files. */
	const dir = join(pRoot, rootDir, libDir);
	await promises.mkdir(dir, { recursive: true });
	(await promises.readdir(dir)).forEach(f => rmSync(`${ dir }/${ f }`, { recursive: true }));


	await Promise.all([
		createTagCache({ directories: tagDirs }).then(cache => tagCache = cache),
		createFileCache({ directories: [ { path: join(rootDir, entryDir), pattern: /\.editor\.ts/ } ] }).then(cache => editorCache = cache),
		createFileCache({ directories: [ { path: join(rootDir, entryDir), pattern: /.md/ } ] }).then(cache => markdownCache = cache),
	]);


	manifestCache = createManifestCache(tagCache);
	const routes: string[] = [];


	//#region create a site component config.
	let siteConfigContent = siteConfigTemplate(props.siteConfig);
	await promises.writeFile(join(pRoot, rootDir, libDir, 'site-config.ts'), siteConfigContent);
	aliases['alias:site-config.js'] = '/' + join(rootDir, libDir, 'site-config.ts').replaceAll('\\', '/');
	//#endregion


	//#region create a tsconfig file for the cache folder.
	await promises.writeFile(join(pRoot, rootDir, libDir, 'tsconfig.json'), tsconfigTemplate);
	//#endregion


	//#region create a d.ts file to make typescript happy inside the files.
	await promises.writeFile(join(pRoot, rootDir, libDir, 'typings.d.ts'), typingsTemplate);
	//#endregion


	//#region creates an index file in the correct location.
	const createIndexFile = async (moduleId: string, path: string) => {
		const parsed = parse(path);
		const content = indexPageTemplate({
			title:        createComponentNameFromPath(path),
			moduleId,
			stylelinks:   props.siteConfig?.links?.styles ?? [],
			scriptlinks:  props.siteConfig?.links?.scripts ?? [],
			componentTag: createComponentTagFromPath(path),
		});

		//#region Create the index file
		const cacheFolderPath = parsed.dir
			.replace(pRoot, '')
			.replace(pRootForwardSlash, '').slice(1)
			.replace(rootDir.replace('./', ''), '')
			.replace(entryDir.replace('./', ''), '');

		const cacheIndexFile = join(pRoot, rootDir, libDir, cacheFolderPath, parsed.name + '.html');
		const cacheIndexDir = join(...cacheIndexFile.split('\\').slice(0, -1));

		await promises.mkdir(cacheIndexDir, { recursive: true });
		await promises.writeFile(cacheIndexFile, content);
		//#endregion


		//#region Add to routes
		const cacheRoutePath = join(rootDir, libDir, cacheFolderPath, parsed.name).replaceAll('\\', '/');
		routes.push(cacheRoutePath);
		//#endregion


		//#region Register as a multi page app entrypoint.
		Object.assign(input, { [cacheRoutePath.replace('\\', '/')]: cacheIndexFile });
		//#endregion
	};
	//#endregion


	//#region create markdown routes
	const createComponentFromMarkdown = async (path: string, content?: string) => {
		if (!content)
			content = await promises.readFile(path, { encoding: 'utf8' });

		const imports: string[] = [];
		const metadata: Record<string, Declarations> = {};

		addUsedTags(content, imports);
		content = addHoistedImports(content, imports);
		content = addHeader(content, imports, metadata);
		content = addMetadata(content, imports, metadata);
		const examples = addEditors(content, imports, path);
		content = examples.content;

		const component = docPageTemplate({
			componentName: createComponentNameFromPath(path),
			componentTag:  createComponentTagFromPath(path),
			examples:      JSON.stringify(examples.examples, null, 3),
			metadata:      JSON.stringify(metadata, null, 3),
			hoisted:       '',
			imports:       imports.join('\n'),
			markdown:      markdownIt.render(content),
		});

		return component;
	};


	const addUsedTags = (content: string, imports: string[]) => {
		/* save the matching tags to a set, to avoid duplicates */
		const componentImportPaths = new Set<string>();

		/* loop through and cache paths for all tags that match the expression and whitelist. */
		getUsedTags(content, [ /es-/, /midoc-/ ]).forEach(tag => {
			let path = tagCache.get(tag);
			if (path)
				componentImportPaths.add(path);
		});

		imports.push(...[ ...componentImportPaths ].map(f => `import '${ f }';`));
	};


	const addHoistedImports = (content: string, imports: string[]) => {
		/* remove hoist expressions and cache the desires imports to hoist. */
		const hoistExpression = /```typescript hoist\s+(.*?)```/gs;

		content = content.replace(hoistExpression, (_, hoist) => {
			imports.push((hoist + ';').replaceAll(';;', ';'));

			return '';
		});

		return content;
	};


	const addHeader = (content: string, imports: string[], metadata: Record<string, Declarations>) => {
		/* extract the tag that requests component header, replace them with instances of docs component header */
		const headerExpression = /(\[component-header: *(.*?)])/g;
		const headerReplacement = (key: string) => stringDedent(`
		<div class="component-header">
			<midoc-page-header
				component-name="${ key }"
				.declaration=\${this.metadata['${ key }']}
			></midoc-page-header>
		</div>
		`);

		let hasHeader = false;

		content = content.replace(headerExpression, (val, expr, tag) => {
			hasHeader = true;
			if (manifestCache.has(tag))
				metadata[tag] = manifestCache.get(tag)!;

			return val.replace(expr, headerReplacement(tag));
		});

		if (hasHeader) {
			const importValue = '@roenlie/mirage-docs/dist/app/components/page-header.js';
			imports.push(`import '${ importValue }';`);
		}

		return content;
	};


	const addMetadata = (content: string, imports: string[], metadata: Record<string, Declarations>) => {
		/* extract the tags that request metadata, replace them with instances of the metadata viewer */
		const metadataExpression   = /(\[component-metadata: *(.*?)])/g;
		const metadataReplacement  = (key: string) => stringDedent(`
		<div class="component-metadata">
			<midoc-metadata-viewer
				.declaration=\${this.metadata['${ key }']}
			></midoc-metadata-viewer>
		</div>
		`);

		content = content.replaceAll(metadataExpression, (val, expr, tag) => {
			if (manifestCache.has(tag)) {
				metadata[tag] = manifestCache.get(tag)!;

				return val.replace(expr, metadataReplacement(tag));
			}

			return val.replace(expr, '');
		});

		/* Only import the metadata viewer component if it is being used. */
		if (!isEmptyObject(metadata)) {
			const importValue = '@roenlie/mirage-docs/dist/app/components/metadata-viewer.js';
			imports.push(`import '${ importValue }';`);
		}

		return content;
	};


	const addEditors = (content: string, imports: string[], path: string) => {
	/* Mutate and inject the script editors */
		const examples: Record<string, string> = {};
		const exampleExpression = /<!--\s*Example:\s*((?:\w+\.)+js)\s*-->/gi;
		const exampleScriptExpr = /<script type="module" id="(\w+)">(.*?)<\/script>/gs;
		const exampleReplacement = (key: string) => stringDedent(`
		<div class="example">
			<docs-source-editor
				.source=\${this.examples['${ key }']}
				immediate
				auto-height
			></docs-source-editor>
		</div>`);

		content = content.replace(exampleExpression, (_, exampleFile: string) => {
			const exampleId      = toCamelCase(exampleFile);
			const examplePath    = normalize(join(dirname(path), exampleFile));
			const exampleContent = readFileSync(examplePath, { encoding: 'utf8' }).trim();

			examples[exampleId]  = exampleContent;

			return exampleReplacement(exampleId);
		});

		content = content.replace(exampleScriptExpr, (_, exampleId: string, exampleContent: string) => {
			examples[exampleId] = stringDedent(exampleContent);

			return exampleReplacement(exampleId);
		});

		/* only import the editor if it there are examples to be displayed. */
		if (!isEmptyObject(examples)) {
			const editorPath = '@roenlie/mirage-docs/dist/app/components/source-editor.js';
			imports.push(`import '${ editorPath }';`);
		}

		return {
			examples,
			content,
		};
	};


	await Promise.all([ ...markdownCache.cache ].map(async ([ , path ]) => {
		const moduleId = createModuleIdFromPath(path);
		const fileName = parse(path).name + '.ts';

		await createIndexFile('./' + fileName, path);

		const withoutExt = path.split(/\./).slice(0, -1).join('.');
		const withoutRoot = withoutExt
			.replace(pRoot, '')
			.replace(pRootForwardSlash, '');

		const withoutExtra = withoutRoot
			.replace(rootDir.replace('./', ''), '')
			.replace(entryDir.replace('./', ''), '');

		const fullScriptPath = join(pRoot, rootDir, libDir, withoutExtra) + '.ts';
		const projectScriptPath = join(rootDir, libDir, withoutExtra) + '.ts';
		await promises.writeFile(fullScriptPath, await createComponentFromMarkdown(path));

		aliases[moduleId] = projectScriptPath;
	}));
	//#endregion


	//#region create editor routes
	const createEditorFromFile = async (path: string, content?: string) => {
		if (!content)
			content = await promises.readFile(path, { encoding: 'utf8' });

		const componentTag      = createComponentTagFromPath(path);
		const componentClass    = createComponentNameFromPath(path);

		content = content
			.replaceAll('`', '\\`')
			.replaceAll('$', '\\$');

		const component = editorPageTemplate({
			editorId: '@roenlie/mirage-docs/dist/app/components/component-editor.js',
			codeId:   path,
			tag:      componentTag,
			class:    componentClass,
			code:     content,
		});

		return component;
	};

	await Promise.all([ ...editorCache.cache ].map(async ([ , path ]) => {
		const moduleId = createModuleIdFromPath(path);
		const fileName = parse(path).name + '.ts';

		await createIndexFile('./' + fileName, path);

		const withoutExt = path.split(/\./).slice(0, -1).join('.');
		const withoutRoot = withoutExt
			.replace(pRoot, '')
			.replace(pRootForwardSlash, '');

		const withoutExtra = withoutRoot
			.replace(rootDir.replace('./', ''), '')
			.replace(entryDir.replace('./', ''), '');

		const fullScriptPath = join(pRoot, rootDir, libDir, withoutExtra) + '.ts';
		const projectScriptPath = join(rootDir, libDir, withoutExtra) + '.ts';
		await promises.writeFile(fullScriptPath, await createEditorFromFile(path));

		aliases[moduleId] = projectScriptPath;
	}));
	//#endregion


	await promises.writeFile(
		join(pRoot, rootDir, libDir, 'routes.ts'),
		`export default [ ${ routes.map(r => `'${ r }'`).join(',\n') } ]`,
	);
	aliases['alias:routes.js'] = '/' + join(rootDir, libDir, 'routes.ts').replaceAll('\\', '/');


	const docConfig: UserConfigExport = {
		appType: 'mpa',

		root: pRoot,

		publicDir: 'public',

		resolve: {
			alias: aliases,
		},

		optimizeDeps: {
			exclude: [ '@roenlie/mirage-docs' ],
		},

		build: {
			outDir,
			emptyOutDir:   true,
			rollupOptions: {
				input,
			},
		},

		plugins: [
			((): Plugin => {
				return {
					name: 'mirage-docs',

					configResolved: (cfg) => {
						config = cfg;
					},
					load: (id) => {
						/* if auto importer is being used, transform matching modules */
						if (props.autoImport) {
							const {
								tagPrefixes,
								loadWhitelist,
								loadBlacklist,
								tagCaptureExpr,
							} = props.autoImport;

							const transformed = componentAutoImportLoad({
								id,
								config,
								tagCache,
								tagPrefixes,
								loadWhitelist,
								loadBlacklist,
								tagCaptureExpr,
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
					},
					async handleHotUpdate({ file, server }) {
						if (!file.endsWith('.md'))
							return;

						const withoutExt = file.split(/\./).slice(0, -1).join('.');
						const withoutRoot = withoutExt.replace(pRoot, '').replace(pRootForwardSlash, '');
						const fullScriptPath = join(pRoot, rootDir, libDir, withoutRoot) + '.ts';

						const module = server.moduleGraph.getModuleById(fullScriptPath.replaceAll('\\', '/'));

						if (module) {
							server.moduleGraph.invalidateModule(module);
							await promises.writeFile(fullScriptPath, await createComponentFromMarkdown(file));

							server.ws.send({
								type: 'full-reload',
								path: '*',
							});
						}
					},
				};
			})(),
		],
	};

	const defaultConfig = defineConfig(viteConfig);

	return deepmerge(docConfig, defaultConfig);
};
