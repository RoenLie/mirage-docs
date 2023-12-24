import { promises } from 'node:fs';

import type { Plugin, ResolvedConfig } from 'vite';

import type { Declarations } from '../shared/metadata.types.js';
import type { FilePathCache } from './build/cache/create-file-cache.js';
import { componentAutoImportLoad } from './build/component/auto-import.js';
import { DocPath } from './build/helpers/docpath.js';
import type { ConfigProperties } from './create-files.js';
import { MarkdownComponentFactory } from './create-markdown-cmp.js';


export const createPlugin = (args: {
	props: ConfigProperties;
	tagCache: Map<string, string>;
	manifestCache: Map<string, Declarations>;
	markdownCache: FilePathCache;
	markdownComponentPaths: Set<string>;
	siteconfigImportPath: string;
	absoluteLibDir: string;
	absoluteSourceDir: string;
}): Plugin => {
	let config: ResolvedConfig;
	const {
		props,
		tagCache,
		manifestCache,
		markdownCache,
		markdownComponentPaths,
		siteconfigImportPath,
		absoluteLibDir,
		absoluteSourceDir,
	} = args;

	return {
		name: 'mirage-docs',
		configResolved(cfg) {
			config = cfg;
		},
		transformIndexHtml: {
			order:   'pre',
			handler: (html, ctx) => {
				// Only transform the root index.html file.
				// This isn't a perfect way to check, but we are not generting other index.html
				// files in mirage-docs, so it can only fail if user ends up adding one as an input.
				if (!ctx.filename.endsWith('index.html'))
					return;

				return {
					html,
					tags: [
						{
							tag:      'script',
							attrs:    { type: 'module' },
							injectTo: 'head-prepend',
							children: 'import "@roenlie/mirage-docs/assets/index.css"',
						},
						{
							tag:   'script',
							attrs: {
								id:   'site-config',
								type: 'module',
								src:  siteconfigImportPath,
							},
							injectTo: 'head-prepend',
						},
						{
							tag:      'script',
							attrs:    { type: 'module' },
							injectTo: 'head-prepend',
							children: `
							import "@roenlie/mirage-docs/app/components/layout-parts/layout.cmp.js"
							document.body.appendChild(document.createElement('midoc-layout'));
							`,
						},
					],
				};
			},
		},
		buildStart() {
			// Watch markdown files for changes.
			for (const [ , path ] of markdownCache.cache)
				this.addWatchFile(path);
		},
		load(id) {
			this.addWatchFile(id);

			/* if auto importer is being used, transform matching modules */
			if (props.autoImport) {
				const transformed = componentAutoImportLoad({
					id,
					config,
					tagCache,
					tagPrefixes:    props.autoImport.tagPrefixes,
					loadWhitelist:  props.autoImport.loadWhitelist,
					loadBlacklist:  props.autoImport.loadBlacklist,
					tagCaptureExpr: props.autoImport.tagCaptureExpr,
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

			// Add custom hot reload handling for main component when in dev mode.
			if (config.env['DEV'] && markdownComponentPaths.has(id)) {
				code = `
				const __$original = window.customElements.define;
				window.customElements.define = function(...args) {
					try {
						__$original.call(this, ...args);
					} catch(err) { /*  */ }
				}
				\n` + code + `
				if (import.meta.hot) {
					import.meta.hot.accept();
					import.meta.hot.on('vite:beforeUpdate', () => {
						window.top?.postMessage('hmrReload', location.origin);
					});
				}
				`;

				return code;
			}
		},
		async watchChange(id) {
			if (!id.endsWith('.md'))
				return;

			const absoluteCmpPath = DocPath.createFileCachePath(
				id, absoluteSourceDir, absoluteLibDir, 'ts',
			);

			const rootDepth = props.root.split('/').filter(Boolean).length;
			const factory = new MarkdownComponentFactory({
				path: id,
				tagCache,
				rootDepth,
				manifestCache,
			});

			const file = await factory.create();

			await promises.writeFile(absoluteCmpPath, file);
		},
	};
};
