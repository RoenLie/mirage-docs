import { css, html, LitElement, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { type IDisposable } from 'monaco-editor';

import { monaco } from '../../build/helpers/monaco.js';
import { unpkgReplace } from '../../build/helpers/unpkg-replace.js';
import editorCmpTypes from '../types/editor-component.d.ts?raw';
import { EsSourceEditor } from './source-editor.js';


const base = window.miragedocs.siteConfig.internal.base ?? '';


@customElement('docs-component-editor')
export class EsComponentEditor extends EsSourceEditor {

	public override maxHeight = Infinity;
	protected override editorLang = 'typescript' as const;
	protected tsWorker: Worker;
	protected languageDisposable: IDisposable[] = [];

	public override async firstUpdated(): Promise<void> {
		this.languageDisposable.push(
			(await monaco).languages.typescript.typescriptDefaults.addExtraLib(editorCmpTypes),
		);

		/** This is here so the worker is included in the build. */
		(() => new Worker(new URL(
			'../workers/typescript-worker.ts', import.meta.url,
		), { type: 'module' }).terminate());

		/** This is the actual creating of the worker. */
		this.tsWorker = new Worker(
			base + '/.mirage/workers/typescript-worker.js', { type: 'module' },
		);
		this.tsWorker.onmessage = this.handleWorkerResponse;

		await super.firstUpdated();
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.languageDisposable.forEach(d => d.dispose());
		this.tsWorker.terminate();
	}

	protected override async updateHeight() {
		const editor = await this.editor;
		const contentHeight = Math.min(this.maxHeight, this.editorWrapperQry.clientHeight ?? 0 - 50);
		const editorWidth = this.editorQry.clientWidth;

		editor.layout({ width: editorWidth, height: contentHeight });
	}

	protected override handleSlotChange() {
		super.handleSlotChange();
		this.source = this.source
			.replace(/^import { editorComponent }.+/, '')
			.trim();
	}

	protected override async execute() {
		const editor = await this.editor;
		let content = editor.getValue();
		content = `const editorComponent = (builder) => builder;\n` + content;

		const js = unpkgReplace(content);
		this.tsWorker.postMessage(js);
	}

	protected handleWorkerResponse = async (msg: MessageEvent<string>) => {
		const data = msg.data;

		try {
			const encodedJs = encodeURIComponent(data);
			const dataUri = `data:text/javascript;charset=utf-8,${ encodedJs }`;
			const mixins = (await import(/* @vite-ignore */ dataUri)).default({ html, css });

			this.content = html``;
			await this.updateComplete;
			this.content = html`
			<docs-editor-scratchpad .mixins=${ mixins }></docs-editor-scratchpad>
			`;
		}
		catch (error) {
			console.warn('Import failed. Reason:', error);
		}

		this.requestUpdate();
	};

	public static override styles = [
		...EsSourceEditor.styles,
		css`
		:host {
			grid-template-rows: 1fr auto auto;
			border: none;
			padding-top: 50px;
		}
		.editor-section {
			resize: none;
			height: auto;
		}
		.resizer {
			border-top: 1px solid var(--midoc-surface-variant);
		}
		`,
		unsafeCSS(window.miragedocs.siteConfig.styles.cmpEditor),
	];

}


@customElement('docs-editor-scratchpad')
export class EsEditorScratchpad extends LitElement {

	@property({ type: Object, attribute: false }) public mixins: {
		connectedCallback?(): void;
		disconnectedCallback?(): void;
		render?(): string;
		styles?(): string;
	};

	public override connectedCallback(): void {
		super.connectedCallback();
		this.mixins.connectedCallback?.apply(this);
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.mixins.disconnectedCallback?.apply(this);
	}

	protected override render() {
		const styles = unsafeHTML(`
		<style>${ this.mixins.styles?.apply(this) ?? '' }</style>
		`);

		const template = this.mixins.render?.apply(this);

		return html`
		${ styles ?? '' }
		${ template ?? '' }
		`;
	}

}
