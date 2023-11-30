import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { shortenUrl } from '../../utilities/url.js';


@customElement('mm-test-component')
export class AComponent extends LitElement {

	public override connectedCallback(): void {
		super.connectedCallback();

		shortenUrl('hei', 'ja', 'nei');
	}

	protected override render() {
		return html`
		this is component
		`;
	}

}
