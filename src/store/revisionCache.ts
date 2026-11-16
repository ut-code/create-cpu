import type CCStore from ".";

/** Values derived from the circuit, kept until the revision of the store changes. */
export class CCRevisionCache<Key, Value extends object> {
	readonly #store: CCStore;

	#revision = -1;

	readonly #values = new Map<Key, Value>();

	constructor(store: CCStore) {
		this.#store = store;
	}

	get(key: Key, compute: () => Value): Value {
		if (this.#revision !== this.#store.revision) {
			this.#values.clear();
			this.#revision = this.#store.revision;
		}
		const cached = this.#values.get(key);
		if (cached) return cached;
		const value = compute();
		this.#values.set(key, value);
		return value;
	}
}
