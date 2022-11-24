export const indexPageTemplate = (props: {
	title: string;
	moduleId: string;
	stylelinks: string[];
	scriptlinks: string[];
	darkModeLink: string;
	lightModeLink: string;
	componentTag: string;
}) => {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${ props.title }</title>
	<link rel="stylesheet" href="/node_modules/@roenlie/mirage-docs/dist/index.css">

	${ props.stylelinks.map(
		l => `<link rel="stylesheet" href="${ l }">`,
	).join('\n	') }

	${ props.scriptlinks.map(
		l => `<script type="module" src="${ l }"></script>`,
	).join('\n	') }

	<script type="module">
		import "${ props.moduleId }";
	</script>

	<script type="module">
		import { subscribeToColorScheme } from "@roenlie/mirage-docs/dist/app/utilities/color-subscription";
		subscribeToColorScheme({
			darkModeLink: '${ props.darkModeLink }',
			lightModeLink: '${ props.lightModeLink }',
		})
	</script>
</head>
<body>
	<${ props.componentTag }></${ props.componentTag }>
</body>
</html>
`.trim();
};
