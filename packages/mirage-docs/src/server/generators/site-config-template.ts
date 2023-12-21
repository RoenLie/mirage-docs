import { type SiteConfig } from '../../shared/config.types.js';


export const siteConfigTemplate = (siteConfig: Partial<SiteConfig>, routes: string[]) =>
`
import { ContainerLoader, ContainerModule } from '@roenlie/lit-aegis/ts'

const siteConfig = ${ JSON.stringify(siteConfig, null, 3) };
const routes = ${ JSON.stringify(routes, null, 3) };

ContainerLoader.load(new ContainerModule(({bind}) => {
	bind('site-config').toConstantValue(siteConfig);
	bind('routes').toConstantValue(routes);
}));
`;
