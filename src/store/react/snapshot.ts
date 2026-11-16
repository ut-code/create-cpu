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
