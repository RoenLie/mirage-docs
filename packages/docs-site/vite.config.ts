import { defineDocConfig } from '@roenlie/mirage-docs/server';


export default defineDocConfig({
	build: {
		outDir: '../dist/preview',
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
