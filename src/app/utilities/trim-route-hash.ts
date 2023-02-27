const trim = (string: string[]) => {
	let trimmed = string.join('/').replaceAll('./', '/');
	while (trimmed.includes('//'))
		trimmed = trimmed.replaceAll('//', '/');

	return trimmed;
};


const { rootDir, libDir } = globalThis.miragedocs.siteConfig?.internal ?? {};


const prefix = trim([ rootDir!, libDir! ]);


export const expandHash = (hash: string) => {
	hash = trim([ prefix, '/', hash ]);
	hash = hash.slice([ ...hash ].findIndex(c => c !== '/'));

	return hash;
};

export const trimHash = (hash: string) => {
	hash = trim(hash.replace(prefix, '').split('/'));
	hash = hash.slice([ ...hash ].findIndex(c => c !== '/'));

	return hash;
};
