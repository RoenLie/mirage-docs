import { css, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import { FocusableElement, tabbable } from 'tabbable';

import { buttonStyle } from '../styles/button.styles.js';
import { componentStyles } from '../styles/component.styles.js';
import { findActiveElement } from '../utilities/domquery.js';


export type TreeRecord<T = any, TEnd = any> = {
	[P in keyof T]: TreeRecord<T[P]> | TEnd;
};


@customElement('midoc-path-tree')
export class MidocPathTreeCmp extends LitElement {

	@property({ type: Array }) public paths: string[] = [];
	@property({ type: Array }) public nameReplacements: [from: string, to: string][] = [];
	@property() public delimiter = '_';
	@state() protected groupState: Record<string, boolean> = {};
	protected hierarchy: TreeRecord = {};

	public override connectedCallback(): void {
		super.connectedCallback();

		this.addEventListener('keydown', this.handleKeydown);

		this.groupState = JSON.parse(localStorage.getItem('midocMenuState') ?? '{}');
	}

	protected override firstUpdated(properties: PropertyValues): void {
		super.firstUpdated(properties);

		this.dispatchEvent(new CustomEvent('load', {
			cancelable: false,
			bubbles:    false,
			composed:   false,
		}));
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener('keydown', this.handleKeydown);
	}

	protected override willUpdate(props: PropertyValues): void {
		if (props.has('paths')) {
			this.hierarchy = {};

			const createSegmentedPath = (path: string) => {
				const segments = path.split('/');
				const filtered = [
					...segments
						.filter(s => s.startsWith(this.delimiter))
						.map(s => s.replace(this.delimiter, '')
							.replaceAll('-', ' ')),
					segments.at(-1)!,
				];

				return filtered;
			};

			const comparer = (a: string, b: string) => {
				const aOrder = parseInt(a.split('.').at(0) ?? '');
				const bOrder = parseInt(b.split('.').at(0) ?? '');
				let value = 0;

				if (isNaN(aOrder) && isNaN(bOrder))
					value = a.localeCompare(b);
				else
					value = aOrder - bOrder;

				return value;
			};

			this.paths.sort((a, b) => {
				const aSegments = createSegmentedPath(a);
				const bSegments = createSegmentedPath(b);

				for (let i = 0; i < aSegments.length; i++) {
					const aSeg = aSegments[i] ?? '';
					const bSeg = bSegments[i] ?? '';

					const value = comparer(aSeg, bSeg);
					if (value !== 0)
						return value;
				}

				return 0;
			}).forEach(path => {
				/* Split the path into segments */
				const segments = path.split('/');

				/* Filter out any non grouping segments */
				const filtered = [
					/* Filter out the non grouping segments and
					remove the delimiter from the segment */
					...segments
						.filter(s => s.startsWith(this.delimiter))
						.map(s => s.replace(this.delimiter, '')
							.replaceAll('-', ' ')
							.replaceAll(/\d+\./g, '')),
					/* Add the last segment after performing string replacements
					to use as the last part of path */
					this.nameReplacements.reduce(
						(acc, [ from, to ]) => acc.replaceAll(from, to),
						(segments.at(-1) ?? '').replaceAll(/\d+\./g, ''),
					),
				];

				filtered.reduce((acc, cur, i, { length }) => {
					if (i === length - 1)
						acc[cur] = path;

					acc[cur] ??= {};

					return acc[cur];
				}, this.hierarchy);
			});
		}

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

		const hash = '#/' + route;
		if (location.hash === hash)
			return;

		history.pushState({}, '', '/' + hash);
		dispatchEvent(new HashChangeEvent('hashchange'));
	};

	protected handleToggleClick = (key: string) => {
		this.groupState = { ...this.groupState, [key]: !this.groupState[key] };
		this.dispatchEvent(new CustomEvent('toggle', { detail: { state: this.groupState } }));
	};

	protected handleKeydown = (ev: KeyboardEvent) => {
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
					href=${ '/' + next }
					tabindex="0"
					@click=${ (ev: Event) => this.handleLinkClick(ev, next as string) }
				>
					${ dir }
				</a>
				`,
				() => html`
				<div class="group">
					<div class="heading" @click=${ () => this.handleToggleClick(dir) }>
						<button class="toggle" data-collapsed=${ !this.groupState[dir] }>
							${ this.groupState[dir] ? '🞃' : '🞂' }
						</button>
						<label>
							${ dir }
						</label>
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
		${ buttonStyle('toggle', 30, 20) }
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
			gap: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
		}
		.items {
			font-size: 14px;
			display: flex;
			flex-flow: column nowrap;
			padding-left: 8px;
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
		a {
			white-space: nowrap;
			text-overflow: ellipsis;
			text-decoration: none;
			color: unset;
			padding: 8px;
		}
		.heading:hover,
		a:hover {
			background-color: var(--midoc-tertiary-hover);
		}
		.heading:has(button:focus-visible),
		a:focus-visible {
			outline: 2px solid var(--midoc-tertiary-hover);
			outline-offset: -2px;
		}
		`,
	];

}
