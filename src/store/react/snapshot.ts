/**
 * The previous list if it holds the same items in the same order, or else the next one.
 * `useSyncExternalStore` re-renders whenever the snapshot is a different object, so a
 * list read afresh from the store keeps its identity this way while nothing changed.
 * @param previous the list handed out last time, or null on the first read
 * @param next the list just read
 */
export function reuseIfSameItems<T>(
	previous: readonly T[] | null,
	next: readonly T[],
): readonly T[] {
	if (
		previous !== null &&
		previous.length === next.length &&
		previous.every((item, index) => Object.is(item, next[index]))
	) {
		return previous;
	}
	return next;
}
