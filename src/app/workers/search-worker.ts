import { create, type Data, load, type Lyra, type PropertiesSchema, search } from '@lyrasearch/lyra';
import { type defaultHtmlSchema } from '@lyrasearch/plugin-parsedoc';


export const restoreFromObject  = async <T extends PropertiesSchema>(
	data: Data<any>,
): Promise<Lyra<T>> => {
	const db = await create<any>({
		edge:   true,
		schema: {
			__placeholder: 'string',
		},
	});

	await load(db, data);

	return db as unknown as Lyra<T>;
};


const fn = async () => {
	const searchData = await fetch('/searchIndexes.json').then(d => d.json()).then(d => d);

	const db = await restoreFromObject<typeof defaultHtmlSchema>(searchData);
	console.log(db);

	self.onmessage = async (ev: MessageEvent<any>) => {
		const searchParams = ev.data;
		const result = await search<typeof defaultHtmlSchema>(db, searchParams);

		postMessage(result);
	};
};

fn();
