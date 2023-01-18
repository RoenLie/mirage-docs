import './path-tree.cmp.js';

import { css, html, LitElement, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

import { buttonStyle } from '../styles/button.styles.js';
import { componentStyles } from '../styles/component.styles.js';
import { inputStyle } from '../styles/input.styles.js';
import { chevronDownIcon, chevronRightIcon, Icon } from './icons.js';
import type { MidocPathTreeCmp } from './path-tree.cmp.js';


@customElement('midoc-sidebar')
export class MiDocSidebarCmp extends LitElement {

	@property() public logo = '';
	@property() public logoHeight = '';
	@property() public heading = '';
	@property({ type: Array }) public nameReplacements: [from: string, to: string][] = window.miragedocs.siteConfig.sidebar.nameReplacements!;
	@state() protected toggleAllValue = false;
	@state() protected toggleIndeterminate = false;
	@state() protected filteredRoutes: string[] = [];
	@query('midoc-path-tree') protected pathTreeQry: MidocPathTreeCmp;
	protected scrollValue = 0;
	protected searchValue = localStorage.getItem('midocSidebarSearch') ?? '';
	protected allRoutes: string[] = window.miragedocs.routes;

	public override connectedCallback(): void {
		super.connectedCallback();

		this.addEventListener('scroll', this.handleScroll);

		this.setIndeterminateState();
		this.handleSearch(this.searchValue, true);
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener('scroll', this.handleScroll);
	}

	public toggleAll = () => {
		this.toggleAllValue = this.toggleIndeterminate === true
			? false
			: !this.toggleAllValue;

		this.toggleIndeterminate = this.toggleAllValue;

		this.pathTreeQry.toggleAll(this.toggleAllValue);
	};

	protected setIndeterminateState = (override?: boolean) => {
		const menustate = JSON.parse(localStorage.getItem('midocMenuState') ?? '{}');
		this.toggleIndeterminate = override ?? Object.values(menustate).some(Boolean);
		if (!this.toggleIndeterminate)
			this.toggleAllValue = false;
	};

	protected handleScroll = () => {
		this.scrollValue = this.scrollTop;
		localStorage.setItem('midocSidebarScrollValue', String(this.scrollValue));
	};

	protected handleLoad = () => {
		setTimeout(() => {
			this.scrollTop	= Number(localStorage.getItem('midocSidebarScrollValue')) ?? 0;

			if (this.searchValue)
				this.pathTreeQry?.toggleAll(this.toggleAllValue);
		});
	};

	protected handleToggle = (ev: CustomEvent<{state: Record<string, boolean>}>) => {
		this.setIndeterminateState(Object.values(ev.detail.state).some(Boolean));
	};

	protected handleSearchInput = (ev: Event) => {
		const search = (ev.target as HTMLInputElement).value;

		this.handleSearch(search);
	};

	protected handleSearch = (search: string, initial?: boolean) => {
		const stringReplacement = (str: string) => {
			return this.nameReplacements.reduce(
				(acc, [ from, to ]) => acc.replaceAll(from, to), str,
			);
		};

		this.filteredRoutes = this.allRoutes.filter(path => {
			const name = stringReplacement(path.split('/').at(-1)!);

			return name.toUpperCase().includes(search.toUpperCase());
		});

		if ((this.searchValue && !search) || search)
			this.toggleAllValue = !!search;

		this.searchValue = search;
		localStorage.setItem('midocSidebarSearch', search);

		if (!initial) {
			this.updateComplete.then(() => {
				this.pathTreeQry?.toggleAll(this.toggleAllValue);
				this.setIndeterminateState(this.toggleAllValue);
			});
		}
	};

	public override render() {
		return html`
			<div class="greeting">
				${ when(this.logo, () => html`
				<picture>
					<img height=${ this.logoHeight } src=${ this.logo } alt="Logo">
				</picture>
				`) }

				<div class="title">
					${ this.heading }
				</div>
			</div>

			<div class="menu-actions">
				<span class="toggle-wrapper">
					<button class="toggle" @click=${ () => this.toggleAll() }>
						${ this.toggleAllValue || this.toggleIndeterminate
							? Icon(chevronDownIcon)
							: Icon(chevronRightIcon) }
					</button>
				</span>

				<input
					class="search"
					type="search"
					.value=${ this.searchValue }
					@input=${ this.handleSearchInput }
				/>
			</div>

			<div class="menu-wrapper">
				<midoc-path-tree
					.paths=${ this.filteredRoutes }
					.nameReplacements=${ this.nameReplacements }
					@load=${ this.handleLoad }
					@toggle=${ this.handleToggle }
				></midoc-path-tree>
			</div>
		`;
	}

	public static override styles = [
		componentStyles,
		css`
		:host {
			overflow: hidden;
			display: flex;
			flex-flow: column nowrap;
			gap: 8px;
			overflow-y: auto;
			overflow-x: hidden;
			--scrollbar-width: 0px;
			--scrollbar-height: 0px;
		}
		picture {
			display: grid;
		}
		.greeting {
			display: grid;
			place-items: center;
			grid-auto-columns: min-content;
			grid-auto-rows: min-content;
			padding-block: 16px;
			padding-left: 74px;
			color: var(--midoc-on-surface-variant);
		}
		.greeting .title {
			font-size: 22px;
			font-weight: 600;
		}
		.menu-actions {
			white-space: nowrap;
			display: flex;
			place-items: center start;
			gap: 8px;
			padding-inline-start: 1rem;
			padding-inline-end: 0.5rem;
		}
		.toggle-wrapper {
			padding-inline-start: 4px
		}
		${ buttonStyle('toggle', 30, 20) }
		${ inputStyle('search') }

		.menu-wrapper {
			padding-left: 1rem;
			padding-right: 0.5rem;
			padding-bottom: 2rem;

			display: flex;
			flex-flow: column nowrap;
		}
		`,
		unsafeCSS(window.miragedocs.siteConfig.styles.sidebar),
	];

}


declare global {
	interface HTMLElementTagNameMap {
		'midoc-sidebar': MiDocSidebarCmp;
	}
}
