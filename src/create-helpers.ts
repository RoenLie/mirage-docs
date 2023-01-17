
export const makePathRelativeFromRoot = (path: string, root: string) => {
	return path
		.replace(root, '')
		.replace(root.replaceAll('\\', '/'), '');
};

export const removePathExtension = (path: string) => {
	return path.split(/\./).slice(0, -1).join('.');
};

export const removeExtraPathParts = (path: string, ...extras: string[]) => {
	return extras.reduce((prev, cur) => {
		return prev.replaceAll(cur, '');
	}, path);
};

export const cleanPath = (path: string) => {
	return path
		.replaceAll('.\\', '\\')
		.replaceAll('\\\\', '\\')
		.replaceAll('\\', '/')
		.replaceAll('./', '/')
		.replaceAll('//', '/');
};

export const splitFileAndDir = (path: string) => {
	const segments = path.replaceAll('\\', '/').split('/');

	return {
		dir:  segments.slice(0, -1).join('/'),
		file: segments.at(-1)!,
	};
};
