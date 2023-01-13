import { stringDedent } from '../../build/helpers/string-dedent.js';


export const docPageTemplate = (props: {
	hoisted: string;
	imports: string;
	examples: string;
	metadata: string;
	markdown: string;
	componentName: string;
	componentTag: string;
}) => stringDedent(`
	import { css, html, LitElement, unsafeCSS } from 'lit';
	import { customElement } from 'lit/decorators.js';
	import { BaseDocElement } from '@roenlie/mirage-docs/dist/app/components/base-doc-element.js'
	// injected imports
	${ props.imports }

	// hoisted
	${ props.hoisted }


	@customElement('${ props.componentTag }')
	export class ${ props.componentName } extends BaseDocElement {

		//#region properties
		protected examples: Record<string, string> = ${ props.examples };
		protected metadata: Record<string, string> = ${ props.metadata };
		//#endregion

		//#region template
		public override render() {
			return html\`
				<div id="page-start" style="display:none;"></div>
				<div class="markdown-body" color-scheme=\${ this.colorScheme }>
					${ props.markdown }
				</div>
			\`;
		}
		//#endregion
	}
`);
