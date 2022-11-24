import { ScriptTarget, transpile } from 'typescript';


self.onconnect = (e) => {
	const port = e.ports[0]!;

	port.addEventListener('message', (e: MessageEvent<string>) => {
		const transpiledCode = transpile(e.data ?? '', { target: ScriptTarget.ESNext });
		port.postMessage(transpiledCode);
	});

	port.start(); // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
};
