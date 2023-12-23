export interface SiteConfig {
	styles: Partial<{
		layout: string;
		sidebar: string;
		pathTree: string;
		metadata: string;
		cmpEditor: string;
		pageHeader: string;
		sourceEditor: string;
		pageTemplate: string;
	}>,
	layout: Partial<{
		logoSrc: string;
		logoHeight: string;
		headingText: string;
	}>
	sidebar: Partial<{
		nameReplacements: [from: string, to: string][];
		delimiter: string;
	}>
	links: Partial<{
		styles: string[];
		scripts: string[];
		darkTheme: string;
		lightTheme: string;
	}>
	internal: Partial<{
		base: string;
		libDir: string;
		rootDir: string;
		entryDir: string;
		viteRoot: string;
	}>
}
