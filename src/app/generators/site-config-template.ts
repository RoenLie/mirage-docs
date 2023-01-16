import { SiteConfig } from '../../build/config.types.js';
import { stringDedent } from '../../build/helpers/string-dedent.js';


export const siteConfigTemplate = (siteConfig?: Partial<SiteConfig>) => stringDedent(`
const styles = {
	layout: \`${ siteConfig?.styles?.layout ?? '' }\`,
	sidebar: \`${ siteConfig?.styles?.sidebar ?? '' }\`,
	pathTree: \`${ siteConfig?.styles?.pathTree ?? '' }\`,
	metadata: \`${ siteConfig?.styles?.metadata ?? '' }\`,
	cmpEditor: \`${ siteConfig?.styles?.cmpEditor ?? '' }\`,
	pageHeader: \`${ siteConfig?.styles?.pageHeader ?? '' }\`,
	sourceEditor: \`${ siteConfig?.styles?.sourceEditor ?? '' }\`,
	pageTemplate: \`${ siteConfig?.styles?.pageTemplate ?? '' }\`,
}

const sidebar = {
	nameReplacements: ${
		JSON.stringify(siteConfig?.sidebar?.nameReplacements ?? [
			[ '.docs', '' ],
			[ '.editor', ' Editor' ],
			[ '-', ' ' ],
		])
	}
}

const links = {
	styles: ${ JSON.stringify(siteConfig?.links?.styles ?? []) },
	scripts: ${ JSON.stringify(siteConfig?.links?.scripts ?? []) },
	darkTheme: \`${ siteConfig?.links?.darkTheme ?? '' }\`,
	lightTheme: \`${ siteConfig?.links?.darkTheme ?? '' }\`,
}

const internal = {
	libDir: \`${ siteConfig!.internal!.libDir }\`,
	rootDir: \`${ siteConfig!.internal!.rootDir }\`,
	entryDir: \`${ siteConfig!.internal!.entryDir }\`,
}

export default {
	styles,
	sidebar,
	links,
	internal,
}
`);
