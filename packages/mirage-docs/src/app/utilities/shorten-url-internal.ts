export const _shortenUrl = (libDir: string, entryDir: string, url: string) => {
	const splitPath = url.replace(/^\.+/, '').split('/').filter(Boolean);
	const splitLib = libDir.split('/').filter(Boolean);
	const splitEntry = entryDir.replace(/^\.+/, '').split('/').filter(Boolean);

	splitLib.concat(splitEntry)
		.forEach(pt => splitPath[0] === pt && splitPath.shift());

	return '/' + splitPath.join('/');
};


export const _expandUrl = (libDir: string, entryDir: string, url: string) => {
	const splitPath = url.split('/').filter(Boolean);
	const splitLib = libDir.split('/').filter(Boolean);
	const splitEntry = entryDir.replace(/^\.+/, '').split('/').filter(Boolean);

	if (splitEntry.length === 1)
		splitEntry.length = 0;

	return '/' + [ ...splitLib, ...splitEntry, ...splitPath ].join('/');
};
