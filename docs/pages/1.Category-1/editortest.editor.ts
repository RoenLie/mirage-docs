import { editorComponent } from '@roenlie/mirage-docs/editor-component.js';


export default editorComponent(({ html, css }) => {
	return {
		render() {
			return html`
			<div>Hello there</div>
			`;
		},
	};
});
