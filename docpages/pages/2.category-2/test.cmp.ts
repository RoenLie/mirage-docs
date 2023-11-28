import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';


@customElement('mm-test-component')
export class AComponent extends LitElement {

	public override connectedCallback(): void {
		super.connectedCallback();
	}

	protected override render() {
		return html`
		this is component
		`;
	}

}


const shortenUrl = (libDir: string, entryDir: string, url: string) => {
	const splitPath = url.replace(/^\.+/, '').split('/').filter(Boolean);
	const splitLib = libDir.split('/').filter(Boolean);
	const splitEntry = entryDir.replace(/^\.+/, '').split('/').filter(Boolean);

	const prefix = [ ...splitLib, ...splitEntry  ].join('/');
	const path = splitPath.join('/').slice(prefix.length);

	return path;
};

const expandUrl = (libDir: string, entryDir: string, url: string) => {
	const splitPath = url.replace(/^\.+/, '').split('/').filter(Boolean);
	const splitLib = libDir.split('/').filter(Boolean);
	const splitEntry = entryDir.replace(/^\.+/, '').split('/').filter(Boolean);

	return '/' + [ ...splitLib, ...splitEntry, ...splitPath ].join('/');
};
