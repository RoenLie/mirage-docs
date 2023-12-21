import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';
import { indexPageTemplate } from './generators/index-page-template.js';


export const createIndexFile = (
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

	return content;
};