import siteConfig from 'alias:site-config.js';


const trim = (string: string[]) => string.join('/').replaceAll('./', '/').replaceAll('//', '/').replaceAll('//', '/');
const { rootDir, libDir } = siteConfig?.internal ?? {};
const prefix = trim([ rootDir, libDir ]);


export const expandHash = (hash: string) => {
	return trim([ prefix, '/', hash ]);
};

export const trimHash = (hash: string) => {
	return hash.replace(prefix, '');
};
