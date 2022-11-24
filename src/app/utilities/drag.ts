interface DragOptions {
	/** Callback that runs as dragging occurs. */
	onMove: (options: { x: number, y: number, event: PointerEvent }) => void;
	/** Callback that runs when dragging stops. */
	onStop: (options: { x: number, y: number, event: PointerEvent }) => void;
	/**
	 * When an initial event is passed, the first drag will be triggered immediately using the coordinates therein. This
	 * is useful when the drag is initiated by a mousedown/touchstart event but you want the initial "click" to activate
	 * a drag (e.g. positioning a handle initially at the click target).
	 */
	initialEvent: PointerEvent;
}

export const drag = (container: HTMLElement, options?: Partial<DragOptions>) => {
	const getXY = (ev: PointerEvent) => {
		let dims = container.getBoundingClientRect();
		let defaultView = container.ownerDocument.defaultView!;
		let offsetX = dims.left + defaultView.scrollX;
		let offsetY = dims.top + defaultView.scrollY;
		let x = ev.pageX - offsetX;
		let y = ev.pageY - offsetY;

		return { x, y };
	};

	const move = (ev: PointerEvent) => {
		if (options?.onMove) {
			let { x, y } = getXY(ev);
			options.onMove({ x, y, event: ev });
		}
	};

	const unsubscribe = () => {
		document.removeEventListener('pointermove', move);
		document.removeEventListener('pointerup', stop);
	};

	const stop = (ev: PointerEvent) => {
		unsubscribe();

		if (options?.onStop) {
			let { x, y } = getXY(ev);
			options.onStop({ x, y, event: ev });
		}
	};

	document.addEventListener('pointermove', move, { passive: true });
	document.addEventListener('pointerup', stop);

	// If an initial event is set, trigger the first drag immediately
	if (options?.initialEvent)
		move(options.initialEvent);

	return { unsubscribe };
};
