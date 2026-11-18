const languageStorageKey = "ccLanguage";

// The language is only a preference, so the app goes on without the storage, which can
// be full, or blocked so that even reaching it throws
export function readSavedLanguage(storage: () => Storage): string | null {
	try {
		return storage().getItem(languageStorageKey);
	} catch (error) {
		console.warn("Could not read the saved language", error);
		return null;
	}
}

export function saveLanguage(storage: () => Storage, language: string): void {
	try {
		storage().setItem(languageStorageKey, language);
	} catch (error) {
		console.warn("Could not save the language", error);
	}
}
