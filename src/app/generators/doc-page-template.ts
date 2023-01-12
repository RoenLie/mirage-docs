export const docPageTemplate = (props: {
	hoisted: string;
	imports: string;
	examples: string;
	metadata: string;
	markdown: string;
	componentName: string;
	componentTag: string;
}) => `
import { css, html, LitElement, PropertyValueMap, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { componentStyles } from '@roenlie/mirage-docs/dist/app/styles/component.styles.js'
import { markdownStyles } from '@roenlie/mirage-docs/dist/app/styles/markdown.styles.js';
import { highlightjsStyles } from '@roenlie/mirage-docs/dist/app/styles/highlightjs.styles.js';
import siteConfig from 'virtual:siteconfig.ts';
// injected imports
${ props.imports }

// hoisted
${ props.hoisted }


@customElement('${ props.componentTag }')
export class ${ props.componentName } extends LitElement {

	//#region properties
	protected examples: Record<string, string> = ${ props.examples };
	protected metadata: Record<string, string> = ${ props.metadata };

	protected get colorScheme() {
		return document.documentElement.getAttribute('color-scheme') ?? 'dark';
	}
	//#endregion


	//#region observers
	protected readonly documentElementObserver = (() => {
		const obs = new MutationObserver((_mutations) => {
			this.requestUpdate()
		});
		obs.observe(document.documentElement, {
			attributes:      true,
			attributeFilter: [ 'color-scheme' ],
		});

		return obs;
	})();

	protected resizeObserver = new ResizeObserver(([ entry ]) => {
		const height = entry!.contentRect.height;

		let stringValue = this.style.minHeight;
		if (!stringValue) {
			stringValue = height + 'px';
			this.style.setProperty('minHeight', Math.round(height) + 'px');
		}

		const previousMinHeight = Number(stringValue.replaceAll(/[^\\d.]/g, ''));

		if (height < previousMinHeight)
			this.style.removeProperty('minHeight');
		else
			this.style.setProperty('minHeight', Math.round(height) + 'px');
	});
	//#endregion


	//#region lifecycle
	public override connectedCallback() {
		super.connectedCallback();
		document.documentElement.setAttribute('color-scheme', 'dark');

		this.insertFontLink();
		this.resizeObserver.observe(this);

		window.addEventListener('hashchange', this.handleHashChange);
	}

	public override disconnectedCallback() {
		super.disconnectedCallback();
		window.removeEventListener('hashchange', this.handleHashChange);
	}
	//#endregion


	//#region logic
	protected handleHashChange = () => {
		const hash = window.location.hash;
		const anchor = this.renderRoot.querySelector('a[href="' + hash + '"].header-anchor');
		anchor?.scrollIntoView({
			behavior: "smooth",
			block: "start",
			inline: "nearest"
		});
	}

	protected insertFontLink() {
		const fontRef = 'https://fonts.googleapis.com/css?family=Roboto+Mono';
		const linkId = 'code-preview-font';
		const linkHref = fontRef;
		let fontLink = document.head.querySelector<HTMLLinkElement>('[href="' + fontRef + '"]');
		if (!fontLink) {
			fontLink = document.createElement('link');
			Object.assign(fontLink, {
				id:   linkId,
				type: 'text/css',
				rel:  'stylesheet',
				href: linkHref,
			});

			document.head.appendChild(fontLink);
		}

		const fontFamily = fontRef
			.slice(fontRef.lastIndexOf('=') + 1)
			.replace('+', ' ');

		this.style.setProperty('--code-font', fontFamily);
	}
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


	//#region styles
	public static override styles = [
		componentStyles,
		highlightjsStyles,
		markdownStyles,
		css\`
		:host {
			--code-font: Roboto Mono;

			display: block;
			min-height: 100vh;

			border-radius: 4px;
			padding-top: 50px;
			padding-inline: 24px;
		}
		.markdown-body {
			display: grid;
			background: none;
			padding-bottom: 200px;
		}
		.markdown-body pre {
			border: 1px solid var(--midoc-surface-variant);
		}
		.markdown-body pre code {
			font-family: var(--code-font);
		}
		\`,
		unsafeCSS(siteConfig.styles.pageTemplate),
	];
	//#endregion

}
`;
