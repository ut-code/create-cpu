import debounce from "debounce";
import type CCStore from ".";
import { ccComponentStoreChangeEventTypes } from "./component";
import { ccComponentPinStoreChangeEventTypes } from "./componentPin";
import { ccConnectionStoreChangeEventTypes } from "./connection";
import { listenToEvents } from "./events";
import { ccNodeStoreChangeEventTypes } from "./node";
import { ccNodePinStoreChangeEventTypes } from "./nodePin";

export class CCStoreAutoSaver {
	#store: CCStore;

	#unwatch: (() => void) | null = null;

	#ignoresChanges = false;

	static localStorageKey = "ccStoreAutoSaverState";

	readonly storageKey: string;

	constructor(store: CCStore, storageKey = CCStoreAutoSaver.localStorageKey) {
		this.#store = store;
		this.storageKey = storageKey;
	}

	watch() {
		this.unwatch();
		const debouncedSave = debounce(this.save.bind(this), 1000);
		const save = () => {
			if (!this.#ignoresChanges) debouncedSave();
		};
		const store = this.#store;
		const unlistens = [
			listenToEvents(store.components, ccComponentStoreChangeEventTypes, save),
			listenToEvents(
				store.componentPins,
				ccComponentPinStoreChangeEventTypes,
				save,
			),
			listenToEvents(store.nodes, ccNodeStoreChangeEventTypes, save),
			listenToEvents(store.nodePins, ccNodePinStoreChangeEventTypes, save),
			listenToEvents(
				store.connections,
				ccConnectionStoreChangeEventTypes,
				save,
			),
		];
		this.#unwatch = () => {
			debouncedSave.clear();
			for (const unlisten of unlistens) unlisten();
		};
	}

	/** Stop saving, including a save still waiting, e.g. once the store is replaced */
	unwatch() {
		this.#unwatch?.();
		this.#unwatch = null;
	}

	/** For changes made again on every load, which alone are not worth saving */
	changeWithoutSaving(change: () => void): void {
		this.#ignoresChanges = true;
		try {
			change();
		} finally {
			this.#ignoresChanges = false;
		}
	}

	save(): void {
		window.localStorage.setItem(this.storageKey, this.#store.toJSON());
	}

	static readSaved(
		storageKey = CCStoreAutoSaver.localStorageKey,
	): string | null {
		return window.localStorage.getItem(storageKey);
	}
}
