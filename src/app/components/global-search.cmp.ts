import { type SearchParams, SearchResult } from '@lyrasearch/lyra';
import { type defaultHtmlSchema } from '@lyrasearch/plugin-parsedoc';
import { css, html, LitElement, render } from 'lit';
import { customElement } from 'lit/decorators.js';

import { componentStyles } from '../styles/component.styles.js';


@customElement('docs-global-search')
export class GlobalSearch extends LitElement {

	protected searchWorker: Worker;

	public override connectedCallback() {
		super.connectedCallback();

		this.searchWorker = new Worker(
			new URL('../workers/search-worker.ts', import.meta.url),
			{ type: 'module' },
		);

		this.searchWorker.onmessage = this.handleWorkerResponse;
	}

	public override disconnectedCallback() {
		super.disconnectedCallback();
	}

	//#region events
	protected handleClick() {
		const dialogEl = this.renderRoot.querySelector('dialog');
		if (dialogEl) {
			dialogEl.showModal();
			dialogEl.setAttribute('modal', '');
			dialogEl.addEventListener('close', () => {
				dialogEl.removeAttribute('modal');
				console.log('modal closed');
			});
		}
	}
	//#endregion

	protected requestWorkerResponse = async (
		search: SearchParams<typeof defaultHtmlSchema>,
	) => {
		this.searchWorker.postMessage(search);
	};

	protected handleWorkerResponse = async (
		msg: MessageEvent<SearchResult<typeof defaultHtmlSchema>>,
	) => {
		let data = msg.data;
		console.log(data);
	};

	protected searchIconTemplate() {
		return html`
		<svg xmlns="http://www.w3.org/2000/svg" color="currentColor" viewBox="0 0 512 512">
			<path fill="currentColor"
				d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0
				45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0
				322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288
				144 144 0 1 0 0 288z" />
		</svg>
		`;
	}

	protected dialogTemplate() {
		return html`
		<dialog class="search">
			<h3>HALLO?</h3>
		</dialog>
		`;
	}

	protected override render() {
		return html`
		<button class="button" @click=${ this.handleClick.bind(this) }>
			<span class="icon">
			${ this.searchIconTemplate() }
			</span>
			<span class="label">
				Search
			</span>
			<span class="hotkey">
				Ctrl K
			</span>
		</button>

		${ this.dialogTemplate() }
		`;
	}

	public static override styles = [
		componentStyles,
		css` // host
		:host() {
			display: block;
		}
		button.button {
			user-select: none;
			display: flex;
			flex-flow: row nowrap;
			place-items: center;
			width: max-content;
			height: max-content;
			gap: 8px;
			padding: 8px;
			border: 1px solid rgb(50,50,50);
			border-radius: 6px;
			background-color: rgb(30,35,35);
			box-shadow: 0px 0px 4px rgb(30 30 30);
		}
		button.button:hover {
			outline: 1px solid orange;
			outline-offset: 2px;
			cursor: pointer;
		}
		.icon {
			display: grid;
			place-items: center;
		}
		.icon svg {
			height: 1em;
			width: 1em;
		}
		.label {
			font-weight: bold;
			line-height: 1em;
		}
		.hotkey {
			padding: 3px;
			border: 1px solid grey;
			border-radius: 4px;

			line-height: 1em;
			background-color: rgb(30,30,30);
			border: 1px solid rgb(50, 50, 50);
			border-radius: 4px;
			font-size: 0.7em;
			padding-inline: 4px;
			padding-block: 3px;
			font-weight: bold;
		}
		dialog.search {
			color: var(--midoc-on-background);
			background-color: var(--midoc-surface-variant);
			border: 1px solid var(--midoc-tertiary-active);
			border-radius: var(--midoc-border-radius-m);
			margin-top: 100px;
			width: 400px;
			height: 400px;
		}
		`,
	];

}
