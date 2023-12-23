export const editorPageTemplate = (props: {
	tag:      string;
	code:     string;
	class:    string;
	codeId:   string;
}) =>
`
import '@roenlie/mirage-docs/app/components/page-parts/component-editor.js';
import '${ props.codeId }';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { BaseDocElement } from '@roenlie/mirage-docs/app/components/page-parts/base-doc-element.js';


@customElement('${ props.tag }')
export class ${ props.class } extends BaseDocElement {

	protected content: string = \`${ props.code }\`;

	public override render() {
		return html\`
			<docs-component-editor immediate .source=\${this.content}>
			</docs-component-editor>
		\`;
	}

	public static override styles = [
		css\`
		:host {
			display: grid;
			overflow: hidden;
		}
		\`,
	]
}
`;
