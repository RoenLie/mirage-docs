import './sidebar.cmp.js';

import { css, html, LitElement, PropertyValues, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import siteConfig from 'virtual:siteconfig.ts';

import { buttonStyle } from '../styles/button.styles.js';
import { componentStyles } from '../styles/component.styles.js';


@customElement('midoc-layout')
export class MiDocLayoutCmp extends LitElement {

	@property() public logo = '';
	@property() public logoHeight = '';
	@property() public heading = '';
	@state() protected activeFrame = '';
	@query('iframe') protected frameQry: HTMLIFrameElement;
	@query('midoc-sidebar') protected sidebarQry: LitElement;

	protected transitionSet = new Set<Promise<void>>();
	protected navClosedClass = 'nav--closed';
	protected navStorageProp = 'midocNavClosed';
	protected scrollStorageProp = 'midocScrollCache';

	public override connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener('hashchange', this.handleHashChange, { passive: true });
		this.handleHashChange();
		this.handleNavToggle(true);
		this.handleColorSchemeToggle(true);
	}

	protected override async firstUpdated(props: PropertyValues): Promise<void> {
		super.firstUpdated(props);
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener('hashchange', this.handleHashChange);
	}

	protected handleFrameLoad = () => {
		Object.assign(this.frameQry.style, { opacity: 1 });

		const currentTheme = document.documentElement.getAttribute('color-scheme') ?? 'dark';
		this.frameQry.contentDocument?.documentElement.setAttribute('color-scheme', currentTheme);

		const frameWindow = this.frameQry.contentWindow;
		if (frameWindow) {
			const scrollVal = Number(localStorage.getItem('pageScrollValue') ?? 0);
			frameWindow.scrollTo(0, scrollVal);
			frameWindow.addEventListener('scroll', this.handleFramePageScroll);
		}
	};

	protected handleFramePageScroll = () => {
		const frameWindow = this.frameQry.contentWindow;
		if (frameWindow)
			localStorage.setItem('pageScrollValue', String(frameWindow.scrollY ?? 0));
	};

	protected handleTransitionEnd = () => {
		this.frameQry.addEventListener('load', this.handleFrameLoad, { once: true });
		const hash = location.hash.split('#').filter(Boolean).at(0);
		if (hash)
			this.activeFrame = hash + '.html';
	};

	protected blockTransition = () => {
		const promise = new Promise<void>(resolve => {
			this.frameQry.addEventListener(
				'transitionend',
				() => {
					this.transitionSet.delete(promise);
					resolve();
				},
				{ once: true },
			);

			Object.assign(this.frameQry.style, { opacity: 1 });
		});

		return promise;
	};

	protected handleHashChange = async (_ev?: HashChangeEvent) => {
		await this.updateComplete;

		while (this.transitionSet.size)
			await Promise.all([ ...this.transitionSet ]);

		if (this.frameQry.style.opacity === '0')
			return this.transitionSet.add(this.blockTransition());

		this.frameQry.contentWindow
			?.removeEventListener('scroll', this.handleFramePageScroll);

		this.frameQry.addEventListener(
			'transitionend', this.handleTransitionEnd, { once: true },
		);

		Object.assign(this.frameQry.style, { opacity: 0 });
	};

	protected handleColorSchemeToggle(reset?: boolean) {
		const localTheme = localStorage.getItem('midocColorScheme') ?? 'dark';
		const currentTheme = document.documentElement.getAttribute('color-scheme') ?? localTheme;
		let nextTheme = currentTheme;

		if (!reset)
			nextTheme = currentTheme === 'light' ? 'dark' : 'light';

		document.documentElement.setAttribute('color-scheme', nextTheme);
		localStorage.setItem('midocColorScheme', nextTheme);

		if (this.frameQry)
			this.frameQry.contentDocument?.documentElement.setAttribute('color-scheme', nextTheme);

		this.requestUpdate();
	}

	protected async setNavState(state?: boolean) {
		this.classList.toggle(this.navClosedClass, state);
		localStorage.setItem(this.navStorageProp, String(this.classList.contains(this.navClosedClass)));

		if (!this.classList.contains(this.navClosedClass)) {
			this.sidebarQry?.addEventListener(
				'transitionend',
				() => {
					this.sidebarQry.renderRoot.querySelector('input')?.focus();
				},
				{ once: true },
			);
		}
	}

	protected handleNavToggle(reset?: boolean) {
		if (reset) {
			const state = (localStorage.getItem(this.navStorageProp) ?? false) === 'true';
			this.setNavState(state);
		}
		else {
			this.setNavState();
		}
	}

	public override render() {
		return html`
			<midoc-sidebar
				logo=${ this.logo }
				logoHeight=${ this.logoHeight }
				heading=${ this.heading }
			></midoc-sidebar>
			<main>
				<iframe src=${ this.activeFrame }></iframe>
			</main>

			<div class="nav-toggle">
				<button class="toggle" @click=${ () => this.handleNavToggle() }>
					☰
				</button>
			</div>

			<div class="theme-toggle">
				<button class="toggle" @click=${ () => this.handleColorSchemeToggle() }>
					${ document.documentElement.getAttribute('color-scheme') === 'light'
						? '☀️'
						: '🌙'
					}
				</button>
			</div>
		`;
	}

	public static override styles = [
		componentStyles,
		css`
		:host {
			height: 100%;
			display: grid;
			grid-template-rows: 1fr;
			grid-template-columns: auto 1fr;
			grid-template-areas: "sidebar frame" "sidebar frame";
			background-color: var(--midoc-background);
			color: var(--midoc-on-background);
			overflow: hidden;
		}
		${ buttonStyle('toggle', 50, 28) }
		.nav-toggle,
		.theme-toggle {
			position: fixed;
			margin: 8px 12px;
			backdrop-filter: blur(1px);
			border-radius: 999px;
			overflow: hidden;
		}
		.nav-toggle:focus-visible,
		.theme-toggle:focus-visible {
			outline: 2px solid var(--midoc-tertiary-hover);
			outline-offset: -2px;
		}
		.theme-toggle {
			top: 0;
			right: 0;
		}

		:host(.nav--closed) midoc-sidebar {
			width: 0vw;
		}

		midoc-sidebar {
			transition: width 0.3s ease;
			width: 250px;
			grid-area: sidebar;
			border-right: 1px solid var(--midoc-surface-variant);
		}

		main {
			grid-area: frame;
			display: grid;
			grid-template-rows: 1fr;
			grid-template-columns: 1fr;
		}

		iframe {
			transition: opacity 0.2s linear;
			opacity: 1;
			height: 100%;
			width: 100%;
			border: none;
		}
		`,
		unsafeCSS(siteConfig.styles.layout),
	];

}


declare global {
	interface HTMLElementTagNameMap {
		'midoc-layout': MiDocLayoutCmp;
	}
}
