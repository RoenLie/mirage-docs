import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';


@customElement('mm-docs-demo')
export class DemoComponent extends LitElement {

	protected override render() {
		return html`
		DEMO COMPONENT

		<mm-test-component></mm-test-component>

		<button @click=${ () => {
			window.top?.postMessage('hmrReload', location.origin);
			console.log('sending message');
		} }>
			SEND MESSAGE
		</button>
		`;
	}

}
