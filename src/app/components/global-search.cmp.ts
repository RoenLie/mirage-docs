import { type SearchParams, SearchResult } from '@lyrasearch/lyra';
import { type defaultHtmlSchema } from '@lyrasearch/plugin-parsedoc';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';


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

	protected requestWorkerResponse = async (
		search: SearchParams<typeof defaultHtmlSchema>,
	) => {
		this.searchWorker.postMessage(search);
	};


	protected handleWorkerResponse = async (msg: MessageEvent<SearchResult<typeof defaultHtmlSchema>>) => {
		let data = msg.data;

		console.log(data);
	};

	protected override render() {
		return html`
		<div>I AM SUPPOSED TO BE SEARCH</div>
		<button @click=${ () => {
			this.requestWorkerResponse({
				term:       'hello',
				properties: '*',
			});
		} }>CLICK ME</button>
		`;
	}

}
