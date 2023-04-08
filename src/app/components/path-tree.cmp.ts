import { css, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import { FocusableElement, tabbable } from 'tabbable';

import { buttonStyle } from '../styles/button.styles.js';
import { componentStyles } from '../styles/component.styles.js';
import { findActiveElement } from '../utilities/domquery.js';
import { pathsToTree, TreeRecord } from '../utilities/paths-to-tree.js';
import { trimHash } from '../utilities/trim-route-hash.js';
import { chevronDownIcon, chevronRightIcon, Icon } from './icons.js';


@customElement('midoc-path-tree')
export class MidocPathTreeCmp extends LitElement {

	@property({ type: Array }) public paths: string[] = [];
	@property({ type: Array }) public nameReplacements: [from: string, to: string][] = [];
	@property() public delimiter = '_';
	@property() public activeHref = '';
	@state() protected groupState: Record<string, boolean> = {};
	protected hierarchy: TreeRecord = {};

	public override connectedCallback(): void {
		super.connectedCallback();

		this.addEventListener('keydown', this.handleKeydown);
		window.addEventListener('hashchange', this.handleHashChange, { passive: true });

		this.groupState = JSON.parse(localStorage.getItem('midocMenuState') ?? '{}');

		setTimeout(async () => {
			await this.updateComplete;
			this.dispatchEvent(new CustomEvent('load', {
				cancelable: false,
				bubbles:    false,
				composed:   false,
			}));

			this.handleHashChange();
		}, 0);
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener('keydown', this.handleKeydown);
		window.removeEventListener('hashchange', this.handleHashChange);
	}

	protected override willUpdate(props: PropertyValues): void {
		if (props.has('paths'))
			this.hierarchy = pathsToTree(this.paths, this.delimiter, this.nameReplacements);

		if (props.has('groupState'))
			localStorage.setItem('midocMenuState', JSON.stringify(this.groupState));

		super.updated(props);
	}

	public toggleAll(value: boolean) {
		const toggle = (hierarchy: Record<string, string | any>) => {
			Object.entries(hierarchy).forEach(([ dir, next ]) => {
				if (typeof next !== 'string') {
					this.groupState[dir] = value;
					toggle(next);
				}
			});
		};

		toggle(this.hierarchy);
		this.groupState = { ...this.groupState };
	}

	protected handleLinkClick = (ev: Event, route: string) => {
		ev.preventDefault();

		const hash = trimHash('#' + route);
		if (location.hash === hash)
			return;

		history.pushState({}, '', '/' + hash);
		dispatchEvent(new HashChangeEvent('hashchange'));
	};

	protected handleToggleClick = (key: string) => {
		this.groupState = { ...this.groupState, [key]: !this.groupState[key] };
		this.dispatchEvent(new CustomEvent('toggle', { detail: { state: this.groupState } }));
	};

	protected handleHashChange = () => {
		let hash = location.hash.split('#').filter(Boolean).at(0) ?? '';
		this.activeHref = hash.slice(Array.from(hash).findIndex(c => c !== '/'));
	};

	protected handleKeydown = (ev: KeyboardEvent) => {
		if (ev.code === 'Tab') {
			this.setAttribute('inert', '');
			setTimeout(() => this.removeAttribute('inert'), 0);
		}

		if (![ 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight' ].includes(ev.code))
			return;

		const tabbableElements = tabbable(this, { getShadowRoot: true });
		const activeElement = findActiveElement(this) as HTMLElement | null;

		const indexOfActive = tabbableElements.findIndex(el => el === activeElement) ?? 0;
		let nextIndex = indexOfActive;
		let nextElement: FocusableElement | undefined;

		if (ev.code === 'ArrowUp') {
			ev.preventDefault();
			nextIndex = indexOfActive - 1;
			nextElement = tabbableElements.at(nextIndex);
		}
		if (ev.code === 'ArrowDown') {
			ev.preventDefault();
			nextIndex = (indexOfActive + 1) > tabbableElements.length - 1
				? 0
				: (indexOfActive + 1);

			nextElement = tabbableElements.at(nextIndex);
		}

		if ([ 'ArrowLeft', 'ArrowRight' ].includes(ev.code)) {
			if (activeElement?.classList.contains('toggle')) {
				const dataset = activeElement.dataset;
				const collapsed = dataset['collapsed'] === 'true' ? true : false;

				if (ev.code === 'ArrowLeft') {
					if (!collapsed) {
						activeElement.click();
					}
					else {
						nextElement = tabbableElements.slice(0, indexOfActive)
							.reverse()
							.find(el => el.classList.contains('toggle'));
					}
				}
				if (ev.code === 'ArrowRight') {
					if (collapsed) {
						activeElement.click();
					}
					else {
						nextElement = tabbableElements.slice(indexOfActive + 1)
							.find(el => el.classList.contains('toggle'));
					}
				}
			}
			else {
				if (ev.code === 'ArrowLeft') {
					nextElement = tabbableElements.slice(0, indexOfActive)
						.reverse()
						.find(el => el.classList.contains('toggle'));
				}
				if (ev.code === 'ArrowRight') {
					nextElement = tabbableElements.slice(indexOfActive)
						.find(el => el.classList.contains('toggle'));
				}
			}
		}

		if (nextElement)
			nextElement?.focus();
	};

	protected groupTemplate = (group: TreeRecord): TemplateResult => {
		return html`
		${ map(
			Object.entries(group),
			([ dir, next ]: [string, Record<string, any> | string]) => html`

			${ when(
				typeof next === 'string',
				() => html`
				<a
					tabindex="0"
					class   =${ classMap({ active: this.activeHref === trimHash(next as string) }) }
					href    =${ '/' + next }
					@click  =${ (ev: Event) => this.handleLinkClick(ev, next as string) }
				>
					${ dir }
				</a>
				`,
				() => html`
				<div class="group">
					<div class="heading" @click=${ () => this.handleToggleClick(dir) }>
						<label>
							${ dir }
						</label>
						<button class="toggle" data-collapsed=${ !this.groupState[dir] }>
							${ this.groupState[dir]
								? Icon(chevronDownIcon)
								: Icon(chevronRightIcon) }
						</button>
					</div>
					<div class="items">
						${ when(
							this.groupState[dir],
							() => this.groupTemplate(next as TreeRecord),
						) }
					</div>
				</div>
				`,
			) }
			`,
		) }
		`;
	};

	public override render() {
		return this.groupTemplate(this.hierarchy);
	}

	public static override styles = [
		componentStyles,
		css`
		${ buttonStyle('button.toggle', 30, 20) }
		button.toggle:hover::after {
			display: none;
		}
		:host {
			display: flex;
			flex-flow: column nowrap;
			gap: 8px;
		}
		.group {
			display: flex;
			flex-flow: column nowrap;
		}
		.heading {
			display: flex;
			flex-flow: row nowrap;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
		}
		.items {
			font-size: 14px;
			display: flex;
			flex-flow: column nowrap;
			padding-left: 16px;
		}
		.heading,
		a {
			cursor: pointer;
			border-radius: var(--midoc-border-radius-s);
			text-transform: capitalize;
		}
		.heading {
			padding: 4px;
		}
		.heading label {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		a {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			text-decoration: none;
			color: unset;
			padding: 8px;
		}
		a.active {
			background-color: var(--midoc-tertiary-active);
		}
		.heading:hover,
		a:hover {
			background-color: var(--midoc-tertiary-hover);
		}
		a:active {
			background-color: var(--midoc-tertiary-press);
		}
		.heading:has(button:focus-visible),
		a:focus-visible {
			outline: 2px solid var(--midoc-tertiary-hover);
			outline-offset: -2px;
		}
		`,
		unsafeCSS(window.miragedocs.siteConfig.styles.pathTree),
	];

}
