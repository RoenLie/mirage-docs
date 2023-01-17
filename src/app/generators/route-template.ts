import { stringDedent } from '../../build/helpers/string-dedent.js';

export const routeTemplate = (routes: string[]) => {
	return stringDedent(`
	export default [
		${ routes.map(r => `'${ r }'`).join(',\n') }
	]`);
};
