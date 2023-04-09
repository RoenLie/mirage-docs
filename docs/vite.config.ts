import { defineDocConfig } from '@roenlie/mirage-docs';
import { UserConfig } from 'vite';


export default defineDocConfig({
	//base:      '/mirage-docs',
	publicDir: 'docs/assets/',
	build:     {
		outDir:    './dist/preview',
		sourcemap: true,
	},
	plugins: [],
}, {
	cacheDir: './docs',
	entryDir: './docs/pages',
	//siteConfig: {
	//links: {
	//	//styles: [
	//	//	'https://fonts.googleapis.com/css?family=Roboto',
	//	//	//'/assets/tokens/css/variables-extra.css',
	//	//],
	//	//scripts: [ '/docs/bootstrap.ts' ],
	//	//darkTheme:  '/vendor/tokens/css/variables-dark.css',
	//	//lightTheme: '/vendor/tokens/css/variables-light.css',
	//},
	//},
	//autoImport: {
	//	tagPrefixes:   [],
	//	loadWhitelist: [ /\.ts/ ],
	//},
}) as Promise<UserConfig>;
