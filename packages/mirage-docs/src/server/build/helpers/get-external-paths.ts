import fs from 'node:fs';

import { genToArray, getFiles } from './get-files.js';


const _getImportPaths = (filepath: string) => {
	const fileContent = fs.readFileSync(filepath, { encoding: 'utf8' });
	const paths = new Set<string>();

	const wildImports = fileContent.matchAll(/import ['"](.+?)['"]/gs);
	const normalImports = fileContent.matchAll(/import (?!['"]).+? from ['"](.+?)['"];/gs);
	const dynamicImports = fileContent.matchAll(/import\(['"](.+?)['"]\)/gs);

	[ ...wildImports, ...normalImports, ...dynamicImports ].forEach(ent => {
		const [ , capture ] = [ ...ent ];
		if (capture)
			paths.add(capture);
	});

	return [ ...paths ];
};


export const getImportPaths = async (
	from: string,
	options?: {
		exclude?: Partial<{
			file?: Partial<{
				startsWith: string[];
				includes: string[];
				endsWith: string[];
			}>
			path: Partial<{
				startsWith: string[];
				includes: string[];
				endsWith: string[];
			}>;
		}>
	},
) => {
	const pathSet = new Set<string>();
	let files = (await genToArray(getFiles(from)));

	const { exclude = {} } = options ?? {};

	if (exclude?.file) {
		const { startsWith, includes, endsWith } = exclude.file;

		files = files.filter(file => {
			const notStartsWith = !startsWith?.some(w => file.startsWith(w));
			const notIncludes   = !includes?.some(w => file.includes(w));
			const notEndsWith   = !endsWith?.some(w => file.endsWith(w));

			return notStartsWith && notIncludes && notEndsWith;
		});
	}

	for (const file of files)
		_getImportPaths(file).forEach(path => pathSet.add(path));

	let paths = [ ...pathSet ];

	if (exclude?.path) {
		const { startsWith, includes, endsWith } = exclude.path;

		paths = paths.filter(file => {
			const notStartsWith = !startsWith?.some(w => file.startsWith(w));
			const notIncludes   = !includes?.some(w => file.includes(w));
			const notEndsWith   = !endsWith?.some(w => file.endsWith(w));

			return notStartsWith && notIncludes && notEndsWith;
		});
	}

	return paths;
};


export const getExternalImportPaths = async (...[ from, options ]: Parameters<typeof getImportPaths>) => {
	options ??= {};
	options.exclude ??= {};
	options.exclude.path ??= {};
	options.exclude.path.startsWith ??= [];
	options.exclude.path.startsWith.push('.');

	return getImportPaths(from, options);
};
