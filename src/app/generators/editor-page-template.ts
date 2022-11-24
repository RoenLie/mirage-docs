export const editorPageTemplate = (props: {
	editorId: string;
	codeId: string;
	tag: string;
	class: string;
	code: string;
}) => `
import '${ props.editorId }';
import '${ props.codeId }';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

@customElement('${ props.tag }')
export class ${ props.class } extends LitElement {

	protected content: string = \`${ props.code }\`;

	public override render() {
		return html\`
			<docs-component-editor immediate .source=\${this.content}>
			</docs-component-editor>
		\`;
	}

	public static override styles = css\`
		:host {
			display: grid;
			overflow: hidden;
		}
	\`
}
`;
