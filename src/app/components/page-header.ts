import { css, html, LitElement, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import siteConfig from 'virtual:siteconfig.ts';

import { toPascalCase } from '../../build/helpers/to-pascal-case.js';
import { toWords } from '../../build/helpers/to-words.js';
import type { Declarations } from '../../build/manifest/metadata.types.js';
import { componentStyles } from '../styles/component.styles.js';


@customElement('midoc-page-header')
export class MiDocHeaderCmp extends LitElement {

	@property({ type: Boolean }) public editor?: boolean;
	@property({ type: Object }) public declaration: Declarations;
	@property({ attribute: 'component-name' }) public set componentName(v: string) {
		let old = this._name;
		this._slug = v.slice(v.indexOf('-') + 1);
		this._name = toWords(toPascalCase(this._slug));
		this.requestUpdate('name', old);
	}

	protected _name = '';
	protected _slug = '';

	public override render() {
		const clsname = this.declaration?.name;
		const tagname = this.declaration?.tagName;

		return html`
		<div class="base">
			<div class="header">
				<div>
					<h1><a class="header-anchor" href="#${ this._slug }">${ this._name }</a></h1>
				</div>
			</div>

			<div class="footer">
				<span class="cmp-text">
					${ '<' + tagname + '></' + tagname + '>' } | ${ clsname }
				</span>
			</div>
		</div>
		`;
	}

	public static override styles = [
		componentStyles,
		css`
		:host {
			display: block;
		}
		.base {
			display: flex;
			flex-flow: column nowrap;
			border-bottom: 1px solid var(--midoc-primary);
			padding-bottom: 1em;
			margin-bottom: 2em;
		}

		.header {
			display: flex;
			flex-flow: row nowrap;
			justify-content: space-between;
			align-items: center;
		}
		es-button {
			color: var(--midoc-tertiary);
		}
		h1 {
			text-size-adjust: 100%;
			color: var(--color-fg-default);
			overflow-wrap: break-word;
			padding-bottom: 0.3em;
			font-size: 2em;
			margin-top: 24px;
			margin-bottom: 0px;
			font-weight: 600;
			line-height: 1.25;
			font-size: 16px;
		}
		h1 a {
			text-size-adjust: 100%;
			overflow-wrap: break-word;
			font-size: 2em;
			font-weight: 600;
			line-height: 1.25;
			background-color: transparent;
			color: var(--midoc-primary);
			text-decoration: none;
		}
		@media (pointer: fine) {
			h1 a:hover {
				text-decoration: underline
			}
		}
		.cmp-text {
			font-size: 1.25em;
			opacity: 0.8;
			color: var(--midoc-tertiary);
		}
		`,
		unsafeCSS(siteConfig.styles.pageHeader),
	];

}


declare global {
	interface HTMLElementTagNameMap {
		'midoc-page-header': MiDocHeaderCmp;
	}
}
