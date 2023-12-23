import { type SiteConfig } from '../../shared/config.types.js';


declare global {
	// eslint-disable-next-line no-var
	var miragedocs: IMirageDocs;

	interface Window {
		miragedocs: IMirageDocs;
	}

	interface Document {
		miragedocs: IMirageDocs;
	}

	interface IMirageDocs {
		routes: string[];
		siteConfig: SiteConfig;
	}

}
