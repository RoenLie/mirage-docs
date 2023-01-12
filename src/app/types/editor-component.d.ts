import type { CSSResult, CSSResultGroup, LitElement, TemplateResult } from 'lit';


declare global {

	type EditorComponentBuilder = (api: {
		html: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;
		css: (strings: TemplateStringsArray, ...values: (CSSResultGroup | number)[]) => CSSResult;
	}) => ({
		connectedCallback?(this: EditorElement): void;
		disconnectedCallback?(this: EditorElement): void;
		render?(this: EditorElement): TemplateResult;
		styles?(this: EditorElement): CSSResult;
	});

	// eslint-disable-next-line no-var
	var EditorComponent: (builder: EditorComponentBuilder) => EditorComponentBuilder;

	class EditorElement extends LitElement {

		public requestUpdate(): void;

	}
}
