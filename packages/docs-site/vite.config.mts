import { defineDocConfig } from '@roenlie/mirage-docs/server';


export default defineDocConfig({
	build: {
		emptyOutDir: false,
		outDir:      '../dist/preview',
		sourcemap:   true,
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
	},
	autoImport: {
		tagPrefixes:   [ 'mm' ],
		loadWhitelist: [ /\.ts/ ],
	},
});
