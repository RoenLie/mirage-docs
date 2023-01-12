export {};

const anchorSnatcher = (event: MouseEvent) => {
	const path = event.composedPath();

	const anchor = path.find(el => el instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
	if (anchor) {
		event.preventDefault();

		const route = new URL(anchor.href);
		const path = route.pathname.replace('.md', '');
		const hash = '#' + path;

		if (location.pathname !== path) {
			const parent = globalThis.top;
			if (parent) {
				if (location.origin !== route.origin) {
					parent.open(route.href, '_self');
				}
				else {
					parent.history.pushState({}, '', '/' + hash);
					parent.dispatchEvent(new HashChangeEvent('hashchange'));
				}
			}
		}
		else if (location.hash !== route.hash) {
			globalThis.history.pushState({}, '', route.origin + route.pathname + route.hash);
			globalThis.dispatchEvent(new HashChangeEvent('hashchange'));
		}
	}
};

globalThis.removeEventListener('click', anchorSnatcher);
globalThis.addEventListener('click', anchorSnatcher);
