import { css, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';

import { buttonStyle } from '../styles/button.styles.js';
import { componentStyles } from '../styles/component.styles.js';


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

		this.groupState = JSON.parse(localStorage.getItem('midocMenuState') ?? '{}');
	}

	protected override firstUpdated(properties: PropertyValues): void {
		super.firstUpdated(properties);

		this.dispatchEvent(new CustomEvent('load', { cancelable: false, bubbles: false, composed: false }));
	}

	protected override willUpdate(props: PropertyValues): void {
		if (props.has('paths')) {
			this.hierarchy = {};

			this.paths.sort((a, b) => {
				const aFile = a.split('/').at(-1) ?? '';
				const bFile = b.split('/').at(-1) ?? '';

				return aFile.localeCompare(bFile);
			}).forEach(path => {
				/* Split the path into segments */
				const segments = path.split('/');

				/* Filter out any non grouping segments */
				const filtered = [
					/* Filter out the non grouping segments and
					remove the delimiter from the segment */
					...segments
						.filter(s => s.startsWith(this.delimiter))
						.map(s => s.replace(this.delimiter, '')),
					/* Add the last segment after performing string replacements
					to use as the last part of path */
					this.nameReplacements.reduce(
						(acc, [ from, to ]) => acc.replaceAll(from, to), segments.at(-1)!,
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
						<button class="toggle">
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
