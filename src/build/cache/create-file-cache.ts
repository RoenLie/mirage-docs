import Path from 'path';

import { genToArray, getFiles } from '../helpers/get-files.js';


export interface FilePathCache {
	cache: Map<string, string>;
	recreate: () => Promise<void>;
}

export const createFileCache = async (options: {
	directories: { path: string; pattern: RegExp }[];
	cache?: Map<string, string>;
}): Promise<FilePathCache> => {
	const { cache = new Map<string, string>() } = options;

	for (const { path, pattern } of options.directories) {
		let files = await genToArray(getFiles(path, pattern));
		files = files.filter(pth => pattern.test(pth));

		files.forEach(file => {
			let name = Path.parse(file).name;
			cache.set(name, file.replaceAll('\\', '/'));
		});
	}

	return {
		cache,
		recreate: async () => {
			cache.clear();
			await createFileCache({ ...options, cache: cache });
		},
	};
};
