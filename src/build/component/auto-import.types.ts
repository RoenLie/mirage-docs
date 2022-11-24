import { ResolvedConfig } from 'vite';

export type AutoImportPluginProps = {
	tagPrefixes: string[],
	loadWhitelist: RegExp[],
	loadBlacklist?: RegExp[];
	tagCaptureExpr?: RegExp;
}

export type AutoImportLoadProps = {
	id: string;
	config: ResolvedConfig;
	tagCache: Map<string, string>;
	tagPrefixes: string[];
	loadWhitelist: RegExp[];
	loadBlacklist?: RegExp[];
	tagCaptureExpr?: RegExp;
}
