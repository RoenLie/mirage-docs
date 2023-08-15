import { defineDocConfig } from '@roenlie/mirage-docs';


export default defineDocConfig({
	build: {
		emptyOutDir: false,
		outDir:      '../dist/preview',
		sourcemap:   true,
	},
}, {
	debug:      true,
	base:       '/mirage-docs',
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
