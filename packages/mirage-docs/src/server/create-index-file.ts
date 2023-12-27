import type { SiteConfig } from '../shared/config.types.js';
import { createComponentNameFromPath, createComponentTagFromPath } from './build/helpers/virtual-helpers.js';
import { indexPageTemplate } from './generators/index-page-template.js';


export const createIndexFile = (
	styleLinks: NonNullable<SiteConfig['pages']>['styles'],
	scriptLinks: NonNullable<SiteConfig['pages']>['scripts'],
	indexPath: string,
	componentPath: string,
	siteConfigPath: string,
) => {
	const content = indexPageTemplate({
		title:        createComponentNameFromPath(indexPath),
		moduleId:     componentPath,
		siteConfigId: siteConfigPath,
		styleLinks:   styleLinks,
		scriptLinks:  scriptLinks,
		componentTag: createComponentTagFromPath(indexPath),
	});

	return content;
};
