import Fs from 'fs';

import { genToArray, getFiles } from '../helpers/get-files.js';


export const createTagCache = async (options: {
	directories: { path: string; whitelist?: RegExp[]; blacklist?: RegExp[] }[];
	componentTagCache?: Map<string, string>;
	tagCapturePatterns?: RegExp[];
}) => {
	const { componentTagCache = new Map<string, string>() } = options;

	options.tagCapturePatterns = [
		...options.tagCapturePatterns ?? [],
		/@customElement\([`'"](.+?)[`'"]\)/g,
		/customElements\s*\.define\(\s*[`'"](.*?)[`'"],/g,
	];

	/* scan for all files from directories after captured tag names */
	for (const { path, whitelist, blacklist } of options.directories) {
		let files = await genToArray(getFiles(path));
		files = files.filter(pth => {
			const whitelisted = whitelist?.some(reg => reg.test(pth));
			const blacklisted = blacklist?.some(reg => reg.test(pth));

			return whitelisted || !blacklisted;
		});

		for (const file of files) {
			const fileContent = Fs.readFileSync(file, { encoding: 'utf8' });
			options.tagCapturePatterns.forEach(expr => {
				fileContent.replaceAll(expr, (val, tag) => {
					componentTagCache.set(tag, file.replaceAll('\\', '/'));

					return val;
				});
			});
		}
	}

	return componentTagCache;
};

export const getUsedTags = (
	text: string,
	whitelist: RegExp[],
	tagExp = /<\/([\w-]+)>/g,
) => {
	return [
		...new Set([ ...text.matchAll(tagExp) ]
			.map(([ _, tagName ]) => tagName)
			.filter((tag): tag is string => !!tag && whitelist.some(wl => wl.test(tag)))),
	];
};
