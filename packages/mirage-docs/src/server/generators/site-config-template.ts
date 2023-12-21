import { type SiteConfig } from '../../shared/config.types.js';


export const siteConfigTemplate = (siteConfig: Partial<SiteConfig>, routes: string[]) =>
`export {};

declare global {
	var miragedocs: any;
}

window.miragedocs ??= {};

Object.assign(window.miragedocs, {
	siteConfig: ${ JSON.stringify(siteConfig, null, 3) },
	routes: ${ JSON.stringify(routes, null, 3) }
});

const deepFreeze = (object: Record<keyof any, any>) => {
	// Retrieve the property names defined on object
	const propNames = Reflect.ownKeys(object);

	// Freeze properties before freezing self
	for (const name of propNames) {
		const value = object[name];
		if ((value && typeof value === "object") || typeof value === "function")
			deepFreeze(value);
	}

	return Object.freeze(object);
}

deepFreeze(window.miragedocs);
`;
