import { indexPageTemplate } from './app/generators/index-page-template.js';
import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';


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


	return {
		content,
	};
};
