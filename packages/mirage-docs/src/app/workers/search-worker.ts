import { ContainerLoader } from '@roenlie/lit-aegis/ts';

import type { SiteConfig } from '../../shared/config.types.js';


export const createSearchWorker = () => {
	const { base, libDir } = ContainerLoader.get<SiteConfig>('site-config').internal;

	return new Worker(base + '/' + libDir + '/workers/search-worker.js', { type: 'module' });
};
