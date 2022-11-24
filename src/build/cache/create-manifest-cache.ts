import { createManifest } from '../manifest/create.js';
import { CustomElementManifest, Declarations } from '../manifest/metadata.types.js';

export const createManifestCache = (
	/** Map of tag and path to where that component is declared */
	tagCache: Map<string, string>,
) => {
	const paths = Array.from(tagCache).map(([ _, path ]) => path);

	const manifest = createManifest(paths) as CustomElementManifest;
	const cache = new Map<string, Declarations>();

	manifest.modules.forEach(module => module.declarations.forEach(dec => {
		if (!dec.customElement)
			return;

		cache.set(dec.tagName!, dec);
	}));

	return cache;
};
