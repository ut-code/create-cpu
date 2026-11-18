type CCEventEmitter<Events extends object> = {
	on(event: keyof Events, listener: () => void): unknown;
	off(event: keyof Events, listener: () => void): unknown;
};

/** @returns a function to stop listening */
export function listenToEvents<Events extends object>(
	emitter: CCEventEmitter<Events>,
	eventTypes: readonly (keyof Events)[],
	listener: () => void,
): () => void {
	for (const eventType of eventTypes) emitter.on(eventType, listener);
	return () => {
		for (const eventType of eventTypes) emitter.off(eventType, listener);
	};
}
