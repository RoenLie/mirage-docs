import { promises } from 'fs';

import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';
import { editorPageTemplate } from './generators/editor-page-template.js';


export const createEditorComponent = async (
	targetPath: string,
	path: string,
) => {
	let content = await promises.readFile(path, { encoding: 'utf8' });
	const componentTag   = createComponentTagFromPath(path);
	const componentClass = createComponentNameFromPath(path);

	content = content
		.replaceAll('`', '\\`')
		.replaceAll('$', '\\$');

	content = editorPageTemplate({
		editorId: '@roenlie/mirage-docs/app/components/component-editor.js',
		codeId:   targetPath,
		tag:      componentTag,
		class:    componentClass,
		code:     content,
	});

	return content;
};
