export const trim = (string: string[]) => {
	let trimmed = string.join('/').replaceAll('./', '/');
	while (trimmed.includes('//'))
		trimmed = trimmed.replaceAll('//', '/');

	return trimmed;
};


export const expandHash = (prefix: string, hash: string) => {
	hash = trim([ prefix, '/', hash ]);
	hash = hash.slice([ ...hash ].findIndex(c => c !== '/'));

	return hash;
};

export const trimHash = (prefix: string, hash: string) => {
	hash = trim(hash.replace(prefix, '').split('/'));
	hash = hash.slice([ ...hash ].findIndex(c => c !== '/'));

	return hash;
};
