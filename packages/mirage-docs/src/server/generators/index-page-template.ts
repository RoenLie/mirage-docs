import type { SiteConfig } from '../../shared/config.types.js';


export const indexPageTemplate = (props: {
	title: string;
	moduleId: string;
	siteConfigId: string;
	styleLinks: SiteConfig['pages']['styles'],
	scriptLinks: SiteConfig['pages']['scripts'],
	componentTag: string;
}) => {
	interface HeadTemplate { template: string; order: number; }

	const styleTemplate = (src: string) => `<link rel="stylesheet" href="${ src }">`;
	const scriptTemplate = (src: string) => `<script type="module" src="${ src }"></script>`;
	const setOrder = (order?: number | 'post' | 'pre') =>
		order === 'post' ? 800
			: order === 'pre' ? 300
				: order ?? 500;

	const styleLinks: HeadTemplate[] = (props.styleLinks ?? [])
		.map(({ src, order }) => ({ template: styleTemplate(src), order: setOrder(order) }));

	const scriptLinks: HeadTemplate[] = (props.scriptLinks ?? [])
		.map(({ src, order }) => ({ template: scriptTemplate(src), order: setOrder(order) }));

	const links = [
		...styleLinks,
		...scriptLinks,
		{
			template: '<script type="module">import "@roenlie/mirage-docs/assets/index.css";</script>',
			order:    400,
		},
		{
			template: `<script type="module" src="${ props.siteConfigId }"></script>`,
			order:    600,
		},
		{
			template: `<script type="module" src="${ props.moduleId }"></script>`,
			order:    700,
		},
	].sort((a, b) => a.order - b.order).map(link => link.template).join('\n	');

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${ props.title }</title>
	${ links }
</head>
<body>
	<${ props.componentTag }></${ props.componentTag }>
</body>
</html>
`;
};
