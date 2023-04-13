import type { CSSResult, CSSResultGroup, TemplateResult } from 'lit';

type EditorComponentBuilder = (api: {
	html: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;
	css: (strings: TemplateStringsArray, ...values: (CSSResultGroup | number)[]) => CSSResult;
}) => ({
	connectedCallback?(this: EditorElement): void;
	disconnectedCallback?(this: EditorElement): void;
	render?(this: EditorElement): TemplateResult;
	styles?(this: EditorElement): CSSResult;
});

declare class EditorElement {

	public requestUpdate(): void;

}


export declare const editorComponent: (builder: EditorComponentBuilder) => EditorComponentBuilder;
