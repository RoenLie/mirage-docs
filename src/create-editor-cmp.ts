import { promises } from 'fs';

import { editorPageTemplate } from './app/generators/editor-page-template.js';
import { DocPath } from './build/helpers/docpath.js';
import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';


export const createEditorComponent = async (
	targetPath: string,
	path: string,
	content?: string,
) => {
	if (!content)
		content = await promises.readFile(path, { encoding: 'utf8' });

	const componentTag      = createComponentTagFromPath(path);
	const componentClass    = createComponentNameFromPath(path);

	content = content
		.replaceAll('`', '\\`')
		.replaceAll('$', '\\$');

	content = editorPageTemplate({
		editorId: '@roenlie/mirage-docs/dist/app/components/component-editor.js',
		codeId:   '/' + targetPath.replaceAll('\\', '/'),
		tag:      componentTag,
		class:    componentClass,
		code:     content,
	});

	return {
		content,
	};
};
