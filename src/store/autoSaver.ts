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

	static localStorageKey = "ccStoreAutoSaverState";

	constructor(store: CCStore) {
		this.#store = store;
	}

	watch() {
		this.unwatch();
		const save = debounce(this.save.bind(this), 1000);
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
			save.clear();
			for (const unlisten of unlistens) unlisten();
		};
	}

	/** Stop saving, including a save still waiting, e.g. once the store is replaced */
	unwatch() {
		this.#unwatch?.();
		this.#unwatch = null;
	}

	save(): void {
		window.localStorage.setItem(
			CCStoreAutoSaver.localStorageKey,
			this.#store.toJSON(),
		);
	}

	static readSaved(): string | null {
		return window.localStorage.getItem(CCStoreAutoSaver.localStorageKey);
	}
}
