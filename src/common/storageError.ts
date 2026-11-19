export function isStorageFull(error: unknown): boolean {
	return error instanceof DOMException && error.name === "QuotaExceededError";
}
