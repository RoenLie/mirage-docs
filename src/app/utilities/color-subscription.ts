let observer: MutationObserver;


export const subscribeToColorScheme = (args: {
	darkModeLink: string;
	lightModeLink: string;
}) => {
	const updateScheme = () => {
		const mode = document.documentElement.getAttribute('color-scheme') ?? 'dark';
		const schemeLink = document.head.querySelector<HTMLLinkElement>('link#color-scheme');
		const href = mode === 'dark' ? args.darkModeLink : args.lightModeLink;

		if (!schemeLink) {
			const schemeLink = document.createElement('link');
			Object.assign(schemeLink, { id: 'color-scheme', rel: 'stylesheet', href });
			document.head.appendChild(schemeLink);
		}
		else {
			schemeLink.href = href;
		}
	};

	observer = new MutationObserver((_mutations) => updateScheme());

	observer.observe(document.documentElement, {
		attributes:      true,
		attributeFilter: [ 'color-scheme' ],
	});

	updateScheme();
};
