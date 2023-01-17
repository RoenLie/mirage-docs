import { indexPageTemplate } from './app/generators/index-page-template.js';
import { DocPath } from './build/helpers/docpath.js';
import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';


export const createIndexFile = (
	projectRoot: string,
	rootDir: string,
	entryDir: string,
	libDir: string,
	styleLinks: string[],
	scriptLinks: string[],
	indexPath: string,
	componentPath: string,
) => {
	const content = indexPageTemplate({
		title:        createComponentNameFromPath(indexPath),
		moduleId:     componentPath,
		stylelinks:   styleLinks,
		scriptlinks:  scriptLinks,
		componentTag: createComponentTagFromPath(indexPath),
	});

	const preparedPath = DocPath.preparePath(projectRoot, indexPath);
	const targetLibPath = DocPath.targetLibDir(preparedPath, rootDir, entryDir, libDir, 'html');
	const forwardTarget = targetLibPath.replaceAll('\\', '/');

	return {
		file: {
			original: preparedPath,
			path:     targetLibPath,
			content:  content,
		},
		inputEntry: {
			from: forwardTarget,
			to:   forwardTarget,
		},
		route: forwardTarget,
	};
};
