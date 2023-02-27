import './sidebar.cmp.js';
import './global-search.cmp.js';
import '../types/globals.js';

import { css, html, LitElement, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

import { buttonStyle } from '../styles/button.styles.js';
import { componentStyles } from '../styles/component.styles.js';
import { expandHash, trimHash } from '../utilities/trim-route-hash.js';
import { chevronUpIcon, Icon, listIcon, moonIcon, spinningCircleIcon, sunIcon } from './icons.js';


@customElement('midoc-layout')
export class MiDocLayoutCmp extends LitElement {

	@property() public logo = '';
	@property() public logoHeight = '';
	@property() public heading = '';
	@state() protected loading = false;
	@query('iframe') protected frameQry: HTMLIFrameElement;
	@query('midoc-sidebar') protected sidebarQry: LitElement;
	@query('.scrollback') protected scrollbackQry: HTMLElement;

	protected activeFrame = '';
	protected transitionSet = new Set<Promise<void>>();
	protected navClosedClass = 'nav--closed';
	protected navStorageProp = 'midocNavClosed';

	public override connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener('hashchange', this.handleHashChange, { passive: true });
		this.handleHashChange();
		this.handleNavToggle(true);
		this.handleColorSchemeToggle(true);
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener('hashchange', this.handleHashChange);
	}

	protected handleFrameLoad = () => {
		Object.assign(this.frameQry.style, { opacity: 1 });

		const currentTheme = document.documentElement.getAttribute('color-scheme') ?? 'dark';

		if (this.frameQry) {
			const contentWindow   = this.frameQry.contentWindow;
			const documentElement = this.frameQry.contentDocument?.documentElement;

			if (documentElement)
				documentElement.setAttribute('color-scheme', currentTheme);

			if (contentWindow) {
				contentWindow?.updateColorScheme?.();

				const scrollVal = Number(localStorage.getItem('pageScrollValue') ?? 0);
				contentWindow.scrollTo(0, scrollVal);
				contentWindow.addEventListener('scroll', this.handleFramePageScroll);
			}
		}

		this.loading = false;
	};

	protected handleFramePageScroll = () => {
		const frameWindow = this.frameQry.contentWindow;
		const scrollValue = frameWindow?.scrollY;
		if (!scrollValue)
			return;

		localStorage.setItem('pageScrollValue', String(scrollValue));
		if (scrollValue > frameWindow.innerHeight) {
			if (this.scrollbackQry.classList.contains('hidden'))
				this.scrollbackQry.classList.remove('hidden');
		}
		else {
			if (!this.scrollbackQry.classList.contains('hidden'))
				this.scrollbackQry.classList.add('hidden');
		}
	};

	protected handleTransitionEnd = () => {
		const hash = location.hash.split('#').filter(Boolean).at(0) ?? '';
		if (hash) {
			this.loading = true;
			this.activeFrame = hash + '.html';

			const frame = this.frameQry.cloneNode() as HTMLIFrameElement;
			frame.src = expandHash(this.activeFrame);

			this.frameQry.replaceWith(frame);
			this.frameQry.addEventListener('load', this.handleFrameLoad, { once: true });
		}
		else {
			this.loading = false;
			Object.assign(this.frameQry.style, { opacity: 1 });
		}
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
		let hash = location.hash.split('#').filter(Boolean).at(0) ?? '';
		if (!hash) {
			hash = window.miragedocs.routes[0] ?? '';
			history.pushState({}, '', '#/' + trimHash(hash));
			dispatchEvent(new HashChangeEvent('hashchange'));

			return;
		}

		if (this.activeFrame === hash)
			return;

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

		if (this.frameQry) {
			const contentWindow   = this.frameQry.contentWindow;
			const documentElement = this.frameQry.contentDocument?.documentElement;

			documentElement?.setAttribute('color-scheme', nextTheme);
			contentWindow?.updateColorScheme?.();
		}

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

	protected handleScrollback() {
		this.frameQry.contentDocument?.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
	}

	public override render() {
		return html`
			<midoc-sidebar
				logo=${ this.logo }
				logoHeight=${ this.logoHeight }
				heading=${ this.heading }
			></midoc-sidebar>
			<main>
				<div class="header">
					<div class="start">
						<div class="nav-toggle">
							<button class="toggle" @click=${ () => this.handleNavToggle() }>
								${ Icon(listIcon) }
							</button>
						</div>
					</div>

					<div class="middle">
						<div class="global-search">
							<docs-global-search></docs-global-search>
						</div>
					</div>

					<div class="end">
						<div class="theme-toggle">
							<button class="toggle" @click=${ () => this.handleColorSchemeToggle() }>
							${ document.documentElement.getAttribute('color-scheme') === 'light'
								? Icon(sunIcon)
								: Icon(moonIcon)
							}
							</button>
						</div>
					</div>
				</div>

				<section>
					<iframe src=${ this.activeFrame ? expandHash(this.activeFrame) : '' }></iframe>
				</section>

				${ when(this.loading, () => html`
					<div class="loader">
						${ Icon(spinningCircleIcon) }
					</div>
					`) }
			</main>

			<div class="scrollback">
				<button class="toggle" @click=${ () => this.handleScrollback() }>
					${ Icon(chevronUpIcon) }
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
		.header {
			display: grid;
			grid-template-columns: auto 1fr auto;
			grid-template-rows: auto;
		}
		${ buttonStyle('toggle', 40, 24) }
		.nav-toggle,
		.theme-toggle,
		.scrollback {
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
		.scrollback {
			position: fixed;
			bottom: 25px;
			right: 20px;
		}
		.hidden {
			display: none;
		}
		.loader {
			position: absolute;
			place-self: center;
			font-size: 50px;
			padding: 12px;
			color: var(--midoc-tertiary);
			border: 1px solid var(--midoc-surface-variant);
			border-radius: 8px;
			background-color: var(--midoc-background);
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
			position: relative;
			grid-area: frame;
			display: grid;
			grid-template-rows: auto 1fr;
			grid-template-columns: 1fr;
		}
		section {
			display: grid;
		}
		iframe {
			transition: opacity 0.2s linear;
			opacity: 1;
			height: 100%;
			width: 100%;
			border: none;
		}
		`,
		unsafeCSS(window.miragedocs.siteConfig.styles.layout),
	];

}


declare global {
	interface HTMLElementTagNameMap {
		'midoc-layout': MiDocLayoutCmp;
	}
}
