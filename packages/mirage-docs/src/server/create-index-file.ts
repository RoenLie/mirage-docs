import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';
import { indexPageTemplate } from './generators/index-page-template.js';


export const createIndexFile = (
	styleLinks: string[] | undefined,
	scriptLinks: string[] | undefined,
	indexPath: string,
	componentPath: string,
	siteConfigPath: string,
) => {
	const content = indexPageTemplate({
		title:        createComponentNameFromPath(indexPath),
		moduleId:     componentPath,
		siteConfigId: siteConfigPath,
		stylelinks:   styleLinks ?? [],
		scriptlinks:  scriptLinks ?? [],
		componentTag: createComponentTagFromPath(indexPath),
	});

	return content;
};
