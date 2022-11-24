/**
 * Debounce implementation that returns a curry function used for assigning a callback
 * to each individual usage scenario.
 *
 * Using the curry functionality is not mandatory.
 * @example
 * ```ts
 * 	const debouncedFilter = debounce(500, (value: string) => navMenuService.filterMenu(value));
 *
 * 	debouncedFilter(value)(res => navMenu = res);
 * ```
 * .
 */
export const curryDebounce = <
	T extends ((...args: any[]) => ReturnType<T>) | ((...args: any[]) => Promise<ReturnType<T>>)
>(
	timeout = 300,
	fn: T = (() => {}) as T,
) => {
	const callbacks = new Map<string, Function>();
	let timer: number;

	const debounceFn = (...args: any[]) => {
		clearTimeout(timer);

		timer = setTimeout(async () => {
			const result = await fn(...args);

			callbacks.forEach(c => c(result));
			callbacks.clear();
		}, timeout, ...args);

		return (callback: T) => {
			callbacks.set(callback.toString(), callback);
		};
	};

	return debounceFn as unknown as (...args: Parameters<T>) =>
		(callback: (result: Awaited<ReturnType<T>>) => void) => void;
};
