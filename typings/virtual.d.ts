declare module '@vite/client';
declare module 'virtual:*';

declare module 'virtual:routes.ts' {
	export = routes as string[]
}

declare module 'virtual:siteconfig.ts' {
	export = routes as {
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
	}
}
