import { RetrievedDoc, type SearchParams, SearchResult } from '@lyrasearch/lyra';
import { type defaultHtmlSchema } from '@lyrasearch/plugin-parsedoc';
import { css, html, LitElement, render } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import { componentStyles } from '../styles/component.styles.js';


@customElement('docs-global-search')
export class GlobalSearch extends LitElement {

	@state() searchResult: RetrievedDoc<typeof defaultHtmlSchema>[] = [];
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
		this.searchWorker.terminate();
	}

	//#region events
	protected handleClick() {
		const dialogEl = this.renderRoot.querySelector('dialog');
		if (dialogEl)
			dialogEl.showModal();
	}

	protected handleDialogOpen() {
		console.log('modal opened');
	}

	protected handleDialogClose() {
		console.log('modal closed');
	}

	protected handleDialogInput(ev: InputEvent & {target: HTMLInputElement}) {
		const value = ev.target.value;

		this.requestWorkerResponse({
			term:       value,
			properties: '*',
		});
	}

	protected handleLinkClick = (ev: Event, route: string) => {
		ev.preventDefault();

		const hash = '#/' + route;
		if (location.hash === hash)
			return;

		history.pushState({}, '', '/' + hash);
		dispatchEvent(new HashChangeEvent('hashchange'));
	};
	//#endregion


	//#region Worker
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

		this.searchResult = data.hits;
	};
	//#endregion


	//#region Template
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

	protected buttonTemplate() {
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
		`;
	}

	protected dialogTemplate() {
		return html`
		<dialog
			class="search"
			@open=${ this.handleDialogOpen.bind(this) }
			@close=${ this.handleDialogClose.bind(this) }
		>
		<div class="base">
			<input @input=${ this.handleDialogInput.bind(this) } />
			<div class="results">
				<ul>
					${ map(this.searchResult, (result) => {
						const text = result.document.content.slice(0, 100);
						const link = result.document.path.split(':').at(0) ?? '';

						return html`
						<li>
							<a
								href    =${ '/' + link }
								@click  =${ (ev: Event) => this.handleLinkClick(ev, link) }
							>
							<div>
								${ link }
							</div>
							<div>
								${ text }
							</div>
							</a>
						</li>
						`;
					}) }
				</ul>
			</div>
		</div>
		</dialog>
		`;
	}

	protected override render() {
		return html`
		${ this.buttonTemplate() }
		${ this.dialogTemplate() }
		`;
	}
	//#endregion


	//#region Style
	public static override styles = [
		componentStyles,
		css`
		:host {
			display: block;

			--button-border-color: rgb(50,50,50);
			--button-background-color: rgb(30,35,35);
			--button-box-shadow-color: rgb(30 30 30);

			--hotkey-border-color: rgb(50, 50, 50);
			--hotkey-background-color: rgb(30,30,30);

			--dialog-border-color: rgb(50,50,50);
			--dialog-background-color: rgb(30,35,35);

			--item-border-color: rgb(50, 50, 50);
			--item-background-color: rgb(30,30,30);
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
			border: 1px solid var(--button-border-color);
			border-radius: 6px;
			background-color: var(--button-background-color);
			box-shadow: 0px 0px 4px var(--button-box-shadow-color);
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
			border: 1px solid var(--hotkey-border-color);
			background-color: var(--hotkey-background-color);
			border-radius: 4px;
			font-size: 0.7em;
			padding-inline: 4px;
			padding-block: 3px;
			font-weight: bold;
		}
		dialog.search {
			color: var(--midoc-on-background);
			border-radius: var(--midoc-border-radius-m);
			border: 1px solid var(--dialog-border-color);
			background-color: var(--dialog-background-color);
			margin-top: 100px;
			width: 400px;
			height: 400px;
		}
		dialog .base {
			height: 100%;
			display: grid;
			grid-template-rows: auto 1fr;
			gap: 8px;
		}
		dialog .results {
			display: grid;
			border: 1px solid orange;
			padding: 8px;
			border-radius: 6px;
		}
		.results ul li {
			list-style: none;
			padding: 4px;
			border: 1px solid var(--item-border-color);
			background-color: var(--item-background-color);
		}
		.results ul li a {
			text-decoration: none;
			color: inherit;
			display: flex;
			flex-flow: column nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			background-color: rgb(teal / 50%);
		}
		`,
	];
	//#endregion

}
