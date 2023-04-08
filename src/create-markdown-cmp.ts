import { promises, readFileSync } from 'fs';
import { dirname, join, normalize } from 'path';

import { docPageTemplate } from './app/generators/doc-page-template.js';
import { getUsedTags } from './build/cache/create-tag-cache.js';
import { isEmptyObject } from './build/helpers/is-empty-object.js';
import { stringDedent } from './build/helpers/string-dedent.js';
import { toCamelCase } from './build/helpers/to-camel-case.js';
import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';
import { Declarations } from './build/manifest/metadata.types.js';
import { markdownIt } from './build/markdown/markdown-it.js';


export const createMarkdownComponent = (
	projectRoot: string,
	tagCache: Map<string, string>,
	manifestCache: Map<string, Declarations>,
	targetPath: string,
	path: string,
	content?: string,
) => {
	const addUsedTags = (content: string, imports: string[]) => {
		/* save the matching tags to a set, to avoid duplicates */
		const componentImportPaths = new Set<string>();

		/* loop through and cache paths for all tags that match the expression and whitelist. */
		getUsedTags(content, [ /es-/, /midoc-/ ]).forEach(tag => {
			let path = tagCache.get(tag);
			if (path)
				componentImportPaths.add(path);
		});

		const relativeComponentImports = [ ...componentImportPaths ]
			.map(path => path
				.replace(projectRoot, '')
				.replace(projectRoot.replaceAll('\\', '/'), ''));

		imports.push(...relativeComponentImports.map(f => `import '${ f }';`));
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


	const combineParts = async (path: string, content?: string) => {
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

		content = docPageTemplate({
			componentName: createComponentNameFromPath(path),
			componentTag:  createComponentTagFromPath(path),
			examples:      JSON.stringify(examples.examples, null, 3),
			metadata:      JSON.stringify(metadata, null, 3),
			hoisted:       '',
			imports:       imports.join('\n'),
			markdown:      markdownIt.render(content),
		});

		return {
			content,
		};
	};


	return combineParts(path, content);
};
