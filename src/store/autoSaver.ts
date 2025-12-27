import debounce from "debounce";
import type CCStore from ".";
import { ccComponentStoreChangeEventTypes } from "./component";
import { ccComponentPinStoreChangeEventTypes } from "./componentPin";
import { ccConnectionStoreChangeEventTypes } from "./connection";
import { ccNodeStoreChangeEventTypes } from "./node";
import { ccNodePinStoreChangeEventTypes } from "./nodePin";

export class CCStoreAutoSaver {
	#store: CCStore;

	static localStorageKey = "ccStoreAutoSaverState";

	constructor(store: CCStore) {
		this.#store = store;
	}

	watch() {
		const save = debounce(this.save.bind(this), 1000);
		for (const eventType of ccComponentStoreChangeEventTypes) {
			this.#store.components.addListener(eventType, save);
		}
		for (const eventType of ccComponentPinStoreChangeEventTypes) {
			this.#store.componentPins.addListener(eventType, save);
		}
		for (const eventType of ccNodeStoreChangeEventTypes) {
			this.#store.nodes.addListener(eventType, save);
		}
		for (const eventType of ccNodePinStoreChangeEventTypes) {
			this.#store.nodePins.addListener(eventType, save);
		}
		for (const eventType of ccConnectionStoreChangeEventTypes) {
			this.#store.connections.addListener(eventType, save);
		}
	}

	save(): void {
		window.localStorage.setItem(
			CCStoreAutoSaver.localStorageKey,
			this.#store.toJSON()
		);
	}

	tryRestore(): boolean {
		const json = window.localStorage.getItem(CCStoreAutoSaver.localStorageKey);
		if (json) {
			this.#store.importJson(json);
			return true;
		} else {
			return false;
		}
	}
}
