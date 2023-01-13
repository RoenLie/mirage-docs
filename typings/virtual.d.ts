declare module '@vite/client';
declare module 'virtual:*';


declare module 'alias:routes.js' {
	export = routes as string[]
}


declare module 'alias:site-config.js' {
	export = siteConfig as SiteConfig
}


interface SiteConfig {
	styles: {
		layout: string;
		sidebar: string;
		pathTree: string;
		metadata: string;
		cmpEditor: string;
		pageHeader: string;
		sourceEditor: string;
		pageTemplate: string;
	},
	sidebar: {
		nameReplacements: [from: string, to: string][];
	}
	links: {
		styles: string[];
		scripts: string[];
		darkTheme: string;
		lightTheme: string;
	}
	internal: {
		libDir: string;
		rootDir: string;
		entryDir: string;
	}
}
