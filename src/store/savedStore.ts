import CCStore, { CCStoreJsonError } from ".";
import { setupDefaultSample } from "./samples/default";

/**
 * The store saved as `json`, not mounted yet, checked to be one the editor can work on.
 * @throws {CCStoreJsonError} if it is not
 */
export function importStoreJson(json: string): CCStore {
	const store = new CCStore();
	try {
		store.importJson(json);
	} catch (error) {
		if (error instanceof CCStoreJsonError) throw error;
		throw new CCStoreJsonError("The store cannot be imported", {
			cause: error,
		});
	}
	const [inconsistency] = store.findInconsistencies();
	if (inconsistency) {
		throw new CCStoreJsonError(`In the store, ${inconsistency}`);
	}
	return store;
}

/**
 * Saved at once, as the auto saver waits for a change and a reload would otherwise bring
 * back the store this one replaces
 * @throws {CCStoreJsonError} if `json` is not a store that can be imported
 */
export function createSavedStore(json?: string): CCStore {
	const store = json === undefined ? new CCStore() : importStoreJson(json);
	store.mount();
	if (json === undefined) setupDefaultSample(store);
	store.autoSaver.watch();
	store.autoSaver.save();
	return store;
}

/**
 * A saved store of `json`, or of the sample, to take the place of `current`, which stops
 * saving. If the new store cannot be made or saved, `current` keeps saving.
 */
export function replaceSavedStore(current: CCStore, json?: string): CCStore {
	const store = createSavedStore(json);
	current.autoSaver.unwatch();
	return store;
}
