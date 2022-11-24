import { deepmerge } from 'deepmerge-ts';
import { promises, readFileSync } from 'fs';
import { dirname, join, normalize, parse, resolve } from 'path';
import { defineConfig, Plugin, ResolvedConfig, UserConfigExport } from 'vite';

import { docPageTemplate } from './app/generators/doc-page-template.js';
import { editorPageTemplate } from './app/generators/editor-page-template.js';
import { indexPageTemplate } from './app/generators/index-page-template.js';
import { createFileCache, FilePathCache } from './build/cache/create-file-cache.js';
import { componentAutoImportLoad } from './build/component/auto-import.js';
import type { AutoImportPluginProps } from './build/component/auto-import.types.js';
import { createTagCache, getUsedTags } from './build/component/create-tag-cache.js';
import { isEmptyObject } from './build/helpers/is-empty-object.js';
import { stringDedent } from './build/helpers/string-dedent.js';
import { toCamelCase } from './build/helpers/to-camel-case.js';
import { createComponentNameFromPath, createComponentTagFromPath, createModuleIdFromPath } from './build/helpers/virtual-helpers.js';
import { createManifestCache } from './build/manifest/create-manifest-cache.js';
import type { Declarations } from './build/manifest/metadata.types.js';
import { markdownIt } from './build/markdown/markdown-it.js';

const root = resolve(resolve());
const rootForwardSlash = root.replaceAll('\\', '/');
const outDir = resolve(resolve(), 'dist');


export const defineDocConfig = async (
	viteConfig: UserConfigExport,
	props: {
		entryDirs?: string[];
		tagDirs?: { path: string, whitelist?: RegExp[]; blacklist?: RegExp[]; }[];
		editorDirs?: { path: string; pattern: RegExp }[];
		stylelinks?: string[];
		scriptlinks?: string[];
		darkModeLink?: string;
		lightModeLink?: string;
		input?: Record<string, string>;
		autoImport?: AutoImportPluginProps;
		siteConfig?: {
			styles?: {
				layout?: string;
				sidebar?: string;
			},
			sidebar?: {
				nameReplacements?: [from: string, to: string][];
			}
		}
	},
) => {
	let {
		input = { main: resolve(root, 'index.html') },
		entryDirs = [ './src' ],
		tagDirs = [ { path: './src' } ],
		editorDirs = [ { path: './src', pattern: /\.editor\.ts/ } ],
		stylelinks = [],
		scriptlinks = [],
		darkModeLink = '',
		lightModeLink = '',
	} = props;

	let config: ResolvedConfig;
	let tagCache: Map<string, string>;
	let manifestCache: Map<string, Declarations>;
	let markdownCache: FilePathCache;
	let editorCache: FilePathCache;

	tagCache      = await createTagCache({ directories: tagDirs });
	editorCache   = await createFileCache({ directories: editorDirs });
	markdownCache = await createFileCache({ directories: entryDirs.map(d => ({ path: d, pattern: /.md/ })) });
	manifestCache = createManifestCache(tagCache);

	const virtualMap = new Map<string, string>();
	const routes: string[] = [];


	//#region create a site component config.
	let siteConfigTemplate = stringDedent(`
	const styles = {
		layout: \`${ props.siteConfig?.styles?.layout ?? '' }\`,
		sidebar: \`${ props.siteConfig?.styles?.sidebar ?? '' }\`,
	}

	const sidebar = {
		nameReplacements: ${
			JSON.stringify(props.siteConfig?.sidebar?.nameReplacements ?? [
				[ '.docs', '' ],
				[ '.editor', ' Editor' ],
				[ '-', ' ' ],
			])
		}
	}

	export default {
		styles,
		sidebar,
	}
	`);
	virtualMap.set('virtual:siteconfig.ts', siteConfigTemplate);
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
			imports.push(hoist);

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
				name="${ key }"
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
			imports.push(`import '${ importValue }'`);
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
			imports.push(`import '${ importValue }'`);
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
			imports.push(`import '${ editorPath }'`);
		}

		return {
			examples,
			content,
		};
	};


	for await (const [ , path ] of [ ...markdownCache.cache ]) {
		const parsed = parse(path);
		const moduleId = createModuleIdFromPath(path);
		const projectIndexPath = join(
			parsed.dir
				.replace(root, '')
				.replace(rootForwardSlash, '')
				.slice(1), parsed.name,
		).replaceAll('\\', '/');

		//#region Create the index file
		const indexFile = join(parsed.dir, parsed.name + '.html');
		await promises.writeFile(
			indexFile,
			indexPageTemplate({
				title:        createComponentNameFromPath(path),
				moduleId,
				stylelinks,
				scriptlinks,
				darkModeLink,
				lightModeLink,
				componentTag: createComponentTagFromPath(path),
			}),
		);
		//#endregion


		//#region Add to routes
		const routePath = projectIndexPath.replaceAll('\\', '/');
		routes.push(routePath);
		//#endregion


		//#region Register as a multi page app entrypoint.
		Object.assign(input, { [projectIndexPath]: indexFile });
		//#endregion


		//#region Create doc page code.
		virtualMap.set(moduleId, await createComponentFromMarkdown(path));
		//#endregion
	}
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


	for await (const [ , path ] of [ ...editorCache.cache ]) {
		const parsed = parse(path);
		const moduleId = createModuleIdFromPath(path);
		const projectIndexPath = join(
			parsed.dir
				.replace(root, '')
				.replace(rootForwardSlash, '')
				.slice(1), parsed.name,
		).replaceAll('\\', '/');


		//#region Create the index file
		const indexFile = join(parsed.dir, parsed.name + '.html');
		await promises.writeFile(
			indexFile,
			indexPageTemplate({
				title:        createComponentNameFromPath(path),
				moduleId,
				stylelinks,
				scriptlinks,
				darkModeLink,
				lightModeLink,
				componentTag: createComponentTagFromPath(path),
			}),
		);
		//#endregion


		//#region Add to routes
		const routePath = projectIndexPath.replaceAll('\\', '/');
		routes.push(routePath);
		//#endregion


		//#region Register as a multi page app entrypoint.
		Object.assign(input, { [projectIndexPath]: indexFile });
		//#endregion


		//#region Create doc page code.
		virtualMap.set(moduleId, await createEditorFromFile(path));
		//#endregion
	}
	//#endregion


	virtualMap.set(
		'virtual:routes.ts',
		`export default [ ${ routes.map(r => `'${ r }'`).join(',\n') } ]`,
	);

	const docConfig: UserConfigExport = {
		appType: 'mpa',

		root,

		publicDir: 'public',

		build: {
			outDir,
			emptyOutDir:   true,
			rollupOptions: {
				input,
			},
		},

		optimizeDeps: {
			exclude: [ '@roenlie/mirage-docs' ],
		},

		plugins: [
			((): Plugin => {
				return {
					name: 'mirage-docs',

					configResolved: (cfg) => {
						config = cfg;
					},
					resolveId: (id) => {
						if (virtualMap.has(id))
							return id;
					},
					load: (id) => {
						if (virtualMap.has(id))
							return virtualMap.get(id);


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

						const id = createModuleIdFromPath(file);
						const module = server.moduleGraph.getModuleById(id);

						if (module) {
							server.moduleGraph.invalidateModule(module);
							virtualMap.set(id, await createComponentFromMarkdown(file));

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
