import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';


@customElement('mm-test-component')
export class AComponent extends LitElement {

	protected override render() {
		return html`
		this is component
		`;
	}

}
