import { stringDedent } from '../../build/helpers/string-dedent.js';


export const indexPageTemplate = (props: {
	title: string;
	moduleId: string;
	stylelinks: string[];
	scriptlinks: string[];
	componentTag: string;
}) => {
	return stringDedent(`
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${ props.title }</title>

		<script type="module">
			import "@roenlie/mirage-docs/assets/index.css";
		</script>

		${ props.stylelinks.map(
			l => `<link rel="stylesheet" href="${ l }">`,
		).join('\n	') }

		${ props.scriptlinks.map(
			l => `<script type="module" src="${ l }"></script>`,
		).join('\n	') }

		<script type="module" src="${ props.moduleId }"></script>
	</head>
	<body>
		<${ props.componentTag }></${ props.componentTag }>
	</body>
	</html>
	`);
};
