import { css, html, LitElement, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { type IDisposable } from 'monaco-editor';
import siteConfig from 'virtual:siteconfig.ts';

import { monaco } from '../../build/helpers/monaco.js';
import { unpkgReplace } from '../../build/helpers/unpkg-replace.js';
import editorCmpTypes from '../types/editor-component.d.ts?raw';
import { EsSourceEditor } from './source-editor.js';


@customElement('docs-component-editor')
export class EsComponentEditor extends EsSourceEditor {

	public override maxHeight = Infinity;
	protected override editorLang = 'typescript' as const;
	protected tsWorker: SharedWorker;
	protected languageDisposable: IDisposable[] = [];

	public override async firstUpdated(): Promise<void> {
		this.languageDisposable.push(
			(await monaco).languages.typescript.typescriptDefaults.addExtraLib(editorCmpTypes),
		);

		this.tsWorker = new SharedWorker(
			new URL('../workers/typescript-worker.ts', import.meta.url),
			{ type: 'module' },
		);

		this.tsWorker.port.addEventListener('message', this.handleWorkerResponse);
		this.tsWorker.port.start();

		await super.firstUpdated();
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.languageDisposable.forEach(d => d.dispose());
		this.tsWorker.port.close();
	}

	protected override updateHeight() {
		const contentHeight = Math.min(this.maxHeight, this.editorWrapperQry.clientHeight ?? 0 - 50);
		const editorWidth = this.editorQry.clientWidth;

		this.editor?.layout({ width: editorWidth, height: contentHeight });
	}

	protected override async execute() {
		let content = this.editor.getValue();
		content = `const EditorComponent = (builder) => builder;\n` + content;

		const js = unpkgReplace(content);
		this.tsWorker.port.postMessage(js);
	}

	protected handleWorkerResponse = async (msg: MessageEvent<string>) => {
		let data = msg.data;

		try {
			const encodedJs = encodeURIComponent(data);
			const dataUri = `data:text/javascript;charset=utf-8,${ encodedJs }`;
			const mixins = (await import(/* @vite-ignore */ dataUri)).default({ html, css });

			this.content = html``;
			await this.updateComplete;
			this.content = html`
			<es-editor-scratchpad .mixins=${ mixins }></es-editor-scratchpad>
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
		unsafeCSS(siteConfig.styles.cmpEditor),
	];

}


@customElement('es-editor-scratchpad')
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
