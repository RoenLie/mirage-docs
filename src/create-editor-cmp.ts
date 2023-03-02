import { promises } from 'fs';

import { editorPageTemplate } from './app/generators/editor-page-template.js';
import { DocPath } from './build/helpers/docpath.js';
import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';


export const createEditorComponent = async (
	projectRoot: string,
	rootDir: string,
	entryDir: string,
	libDir: string,
	path: string,
	content?: string,
) => {
	if (!content)
		content = await promises.readFile(path, { encoding: 'utf8' });

	const componentTag      = createComponentTagFromPath(path);
	const componentClass    = createComponentNameFromPath(path);
	const preparedPath = DocPath.preparePath(projectRoot, path);
	const targetLibPath = DocPath.targetLibDir(preparedPath, rootDir, entryDir, libDir, 'ts');

	content = content
		.replaceAll('`', '\\`')
		.replaceAll('$', '\\$');

	content = editorPageTemplate({
		editorId: '@roenlie/mirage-docs/dist/app/components/component-editor.js',
		codeId:   '/' + targetLibPath.replaceAll('\\', '/'),
		tag:      componentTag,
		class:    componentClass,
		code:     content,
	});

	return {
		path: targetLibPath,
		content,
	};
};
