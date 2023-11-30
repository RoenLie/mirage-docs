import { LitElement } from 'lit';


const subscribers = new Set<WeakRef<LitElement>>();


export const subscribeToColorChange = (element: LitElement) => {
	subscribers.add(new WeakRef(element));
};


const updateScheme = () => {
	const mode = document.documentElement.getAttribute('color-scheme') ?? 'dark';
	const schemeLink = document.head.querySelector<HTMLLinkElement>('link#color-scheme');
	const href = (mode === 'dark'
		? miragedocs.siteConfig.links.darkTheme
		: miragedocs.siteConfig.links.lightTheme) ?? '';

	if (!schemeLink) {
		const schemeLink = document.createElement('link');
		Object.assign(schemeLink, { id: 'color-scheme', rel: 'stylesheet', href });
		document.head.appendChild(schemeLink);
	}
	else {
		schemeLink.href = href;
	}

	subscribers.forEach(ref => {
		const el = ref.deref();
		!el ? subscribers.delete(ref) : el?.requestUpdate();
	});
};


declare global {
	interface Window {
		updateColorScheme: typeof updateScheme
	}

	interface Document {
		updateColorScheme: typeof updateScheme
	}
}


Object.assign(window, {
	updateColorScheme: updateScheme,
});
