export const indexPageTemplate = (props: {
	title: string;
	moduleId: string;
	siteConfigId: string;
	stylelinks: string[];
	scriptlinks: string[];
	componentTag: string;
}) => {
	const stylelinks = props.stylelinks.map(
		l => `<link rel="stylesheet" href="${ l }">`,
	).join('\n	');

	const scriptlinks = props.scriptlinks.map(
		l => `<script type="module" src="${ l }"></script>`,
	).join('\n	');

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${ props.title }</title>

	<script type="module">import "@roenlie/mirage-docs/assets/index.css";</script>
	<script type="module" src="${ props.siteConfigId }"></script>
	<script type="module" src="${ props.moduleId }"></script>
	${ stylelinks }
	${ scriptlinks }
</head>
<body>
	<${ props.componentTag }></${ props.componentTag }>
</body>
</html>
	`;
};
