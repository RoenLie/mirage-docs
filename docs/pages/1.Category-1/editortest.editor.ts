import { editorComponent } from '@roenlie/mirage-docs';


export default editorComponent(({ html, css }) => {
	return {
		render() {
			return html`
			<div>Hello there</div>
			`;
		},
	};
});
