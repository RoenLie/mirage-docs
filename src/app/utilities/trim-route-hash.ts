import { expandHash as hashExpand, trim, trimHash as hashTrim } from '../../build/helpers/string.js';


const { rootDir, libDir } = globalThis.miragedocs.siteConfig?.internal ?? {};
const prefix = trim([ rootDir!, libDir! ]);


export const expandHash = (hash: string) => hashExpand(prefix, hash);

export const trimHash = (hash: string) => hashTrim(prefix, hash);
