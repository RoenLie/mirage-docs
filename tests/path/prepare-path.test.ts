import { describe, expect, it } from 'vitest';

import { DocPath } from '../../src/build/helpers/docpath.js';


describe('suite', () => {
	const projectPath = 'C:\\Devstuff\\Development_Next_client_v2\\repos\\es-web-components';
	const filePath = 'C:\\Devstuff\\Development_Next_client_v2\\repos\\es-web-components\\src\\components\\310.Grid\\filter-build\\filter-builder.docs.md';

	it('should remove anything above the current project path', () => {
		const expected = 'src\\components\\310.Grid\\filter-build\\filter-builder.docs.md';
		const actual = DocPath.preparePath(projectPath, filePath);

		expect(actual).to.equal(expected);
	});

	it('should make a markdown file path target the lib folder with a new extension', () => {
		const preparedPath = DocPath.preparePath(projectPath, filePath);

		const expected = 'src\\.mirage\\310.Grid\\filter-build\\filter-builder.docs.html';
		const actual = DocPath.targetLibDir(preparedPath, './src', './components', '.mirage', 'html');

		expect(actual).to.equal(expected);
	});
});
