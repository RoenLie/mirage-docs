import type { CSSResult, CSSResultGroup, LitElement as LitEl, TemplateResult } from 'lit';


declare global {

	type EditorComponentBuilder = (api: {
		html: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;
		css: (strings: TemplateStringsArray, ...values: (CSSResultGroup | number)[]) => CSSResult;
	}) => ({
		connectedCallback?(this: LitEl): void;
		disconnectedCallback?(this: LitEl): void;
		render?(this: LitEl): TemplateResult;
		styles?(this: LitEl): CSSResult;
	});

	// eslint-disable-next-line no-var
	var EditorComponent: (builder: EditorComponentBuilder) => EditorComponentBuilder;

	class LitElement {

		public requestUpdate(): void;

	}
}
