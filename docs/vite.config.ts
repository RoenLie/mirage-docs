import { defineDocConfig } from '@roenlie/mirage-docs';


export default defineDocConfig({
	base:  '/mirage-docs',
	build: {
		emptyOutDir: false,
		outDir:      '../dist/preview',
		sourcemap:   true,
	},
}, {
	root:       '/docs',
	source:     '/docpages/pages',
	siteConfig: {
		links: {
			scripts: [ '/bootstrap.ts' ],
		},
	},
	autoImport: {
		tagPrefixes:   [ 'mm' ],
		loadWhitelist: [ /\.ts/ ],
	},
});
