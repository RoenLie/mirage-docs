import { trimHash } from './trim-route-hash.js';


const _anchorSnatcher = (event: MouseEvent) => {
	const path = event.composedPath();

	const anchor = path.find(el => el instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
	if (anchor) {
		event.preventDefault();

		const route = new URL(anchor.href);
		const path = route.pathname.replace('.md', '');
		const hash = trimHash('#' + path);

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
		else {
			globalThis.history.pushState({}, '', route.origin + route.pathname + route.hash);
			globalThis.dispatchEvent(new HashChangeEvent('hashchange'));
		}
	}
};


export const anchorSnatcher = {
	register:   () => globalThis.addEventListener('click', _anchorSnatcher),
	unregister: () => globalThis.removeEventListener('click', _anchorSnatcher),
};
