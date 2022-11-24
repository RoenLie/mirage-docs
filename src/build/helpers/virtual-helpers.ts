import { parse } from 'path';

import { toPascalCase } from './to-pascal-case.js';
import { toTagName } from './to-tag-name.js';


export const createModuleIdFromPath = (path: string) => {
	let fileInfo = parse(path);

	return 'virtual:' + fileInfo.name.replaceAll('.', '-') + '.ts';
};


export const createComponentTagFromPath = (path: string) => {
	let fileInfo = parse(path);
	let tagname = toTagName(fileInfo.name, 'midoc');

	const folders = path.split('/')
		.reduce((p, c) => {
			c.startsWith('_') && p.push(c.replace('_', ''));

			return p;
		}, <string[]>[]);

	folders.push(tagname);

	return folders.join('-').toLowerCase();
};


export const createComponentNameFromPath = (path: string) => {
	let fileInfo = parse(path);

	return toPascalCase('Midoc' + fileInfo.name + 'Cmp');
};
