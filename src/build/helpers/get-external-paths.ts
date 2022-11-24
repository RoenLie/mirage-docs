import Fs from 'fs';
import path from 'path';


/**
 * Convert a `generated` async iterable to an array promise.
 * This is the same as in @eyeshare/shared
 * duplicate put in here to avoid needing a dependency on shared.
 */
export async function genToArray<T>(generated: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const x of generated)
		out.push(x);

	return out;
}

/**
 * Async generator for retrieving file paths matching a `pattern` in a `directory` using Node.JS.
 * Includes sub folders.
 */
export async function* getFiles(directory: string, pattern?: RegExp): AsyncGenerator<string, void, string | undefined> {
	const dirents = await Fs.promises.readdir(directory, { withFileTypes: true });
	for (const dirent of dirents) {
		const res = path.resolve(directory, dirent.name);
		if (dirent.isDirectory())
			yield* getFiles(res, pattern);
		else if (pattern?.test(res) ?? true)
			yield res;
	}
}


export const getImportPaths = (filepath: string, excludePrefix?: string) => {
	const fileContent = Fs.readFileSync(filepath, { encoding: 'utf8' });
	const paths = new Set<string>();

	const wildImports = fileContent.matchAll(/import (['"].+?['"])/gs);
	const normalImports = fileContent.matchAll(/import .+? from (.+?);/gs);
	const dynamicImports = fileContent.matchAll(/import\((.+?)\)/gs);

	[ ...wildImports, ...normalImports, ...dynamicImports ].forEach(ent => {
		const [ , capture ] = [ ...ent ];
		const trimmed = capture!.slice(1, -1);

		if (excludePrefix) {
			if (trimmed.startsWith(excludePrefix))
				return;
		}

		paths.add(capture!.slice(1, -1));
	});

	return [ ...paths ];
};

export const getAllExternalImportPaths = async (from: string, exclude: string[] = []) => {
	const pathSet = new Set<string>();
	let files = (await genToArray(getFiles(from)));
	for (const file of files)
		getImportPaths(file, '.').forEach(path => pathSet.add(path));

	exclude.forEach(name => pathSet.delete(name));

	return [ ...pathSet ];
};
