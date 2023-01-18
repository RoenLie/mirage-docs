const trim = (string: string[]) => string.join('/').replaceAll('./', '/').replaceAll('//', '/').replaceAll('//', '/');
const { rootDir, libDir } = window.miragedocs.siteConfig?.internal ?? {};
const prefix = trim([ rootDir!, libDir! ]);


export const expandHash = (hash: string) => {
	return trim([ prefix, '/', hash ]);
};

export const trimHash = (hash: string) => {
	return hash.replace(prefix, '');
};
