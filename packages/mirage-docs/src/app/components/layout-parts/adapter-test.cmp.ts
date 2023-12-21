import { Adapter, AegisComponent, ContainerModule, customElement, inject } from '@roenlie/lit-aegis/ts';
import { html } from 'lit';


export class AdapterTestAdapter extends Adapter {

	@inject('test-value') protected testValue: string;

	public override render(): unknown {
		console.log(this.testValue);

		return html`
		Hei, this is adapter test component, ${ this.testValue }
		`;
	}

}


@customElement('midoc-adapter-test')
export class AdapterTestCmp extends AegisComponent {

	constructor() {
		super(AdapterTestAdapter, moduleTest);
	}

}


export const moduleTest = new ContainerModule(({ bind }) => {
	bind('test-value').toConstantValue('testValue');
});
