import { _expandUrl, _shortenUrl } from './shorten-url-internal.js';


const { libDir, entryDir } = globalThis.miragedocs.siteConfig?.internal ?? {};

export const shortenUrl = (url: string) => _shortenUrl(libDir!, entryDir!, url);
export const expandUrl = (url: string) => _expandUrl(libDir!, entryDir!, url);
