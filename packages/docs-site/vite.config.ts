import { defineDocConfig } from '@roenlie/mirage-docs/server';


export default defineDocConfig({
	build: {
		emptyOutDir: true,
		outDir:      './dist',
	},
}, {
	debug:      false,
	base:       '/mirage-docs',
	root:       '/',
	source:     '/src/pages',
	siteConfig: {
		links: {
			scripts: [ '/bootstrap.ts' ],
		},
		layout: {
			headingText: 'Mirage Docs',
			logoHeight:  '40px',
			logoSrc:     'logo.svg',
		},
	},
	autoImport: {
		tagPrefixes:   [ 'mm' ],
		loadWhitelist: [ /\.ts/ ],
	},
});
