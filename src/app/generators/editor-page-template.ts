import { stringDedent } from '../../build/helpers/string-dedent.js';

export const editorPageTemplate = (props: {
	tag:      string;
	code:     string;
	class:    string;
	codeId:   string;
	editorId: string;
}) => stringDedent(`
	import '${ props.editorId }';
	import '${ props.codeId }';
	import { css, html, LitElement } from 'lit';
	import { customElement, property, query, state } from 'lit/decorators.js';
	import { BaseDocElement } from '@roenlie/mirage-docs/dist/app/components/base-doc-element.js';


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
`);
