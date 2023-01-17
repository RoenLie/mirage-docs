import path, { normalize, resolve } from 'path';

export const DocPath = (() => {
	return {
		preparePath: (projectPath: string, filePath: string) => {
			const absFilePath = resolve(filePath);
			const absProjectPath = resolve(projectPath);

			const splitFilePath = normalize(absFilePath).split(path.sep);
			const splitProjPath = normalize(absProjectPath).split(path.sep);

			return splitFilePath.slice(splitProjPath.length).join(path.sep);
		},

		targetLibDir: (preparedPath: string, rootDir: string, entryDir: string, libDir: string, extension: string) => {
			const invalidChars = [ './', '/', '\\' ];
			const cleanSegment = (string: string) => {
				let char = '';
				while ((char = invalidChars.find(str => string.startsWith(str)) ?? '') && char)
					string = string.slice(char.length);
				while ((char = invalidChars.find(str => string.endsWith(str)) ?? '') && char)
					string = string.slice(0, -char.length);

				return normalize(string);
			};

			// Clean rootdir and entry variable of anything but valid characters.
			rootDir = cleanSegment(rootDir);
			entryDir = cleanSegment(entryDir);

			// Replace the entry dir with lib dir.
			const libTargetPath = preparedPath.replace(entryDir, libDir);

			// Replace the extension with the new one.
			const replacedExtension = libTargetPath
				.split('.').slice(0, -1).join('.') + '.' + extension;

			return replacedExtension;
		},
	};
})();