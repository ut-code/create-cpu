import EventEmitter from "eventemitter3";
import type CCStore from ".";

/** Events emitted by every object-specific store */
export type CCBaseStoreEvents<T> = {
	didRegister(object: T): void;
	willUnregister(object: T): void;
	didUnregister(object: T): void;
};

/** Base class of the object-specific stores (components, nodes, pins, and connections) */
export abstract class CCBaseStore<
	Id extends string,
	T extends { readonly id: Id },
	Events extends CCBaseStoreEvents<T>,
> extends EventEmitter<Events> {
	protected readonly store: CCStore;

	readonly #objects: Map<Id, T> = new Map();

	protected get objects(): ReadonlyMap<Id, T> {
		return this.#objects;
	}

	protected setObject(
		object: T,
		{ changesCircuit = true }: { changesCircuit?: boolean } = {},
	): void {
		this.#objects.set(object.id, object);
		if (changesCircuit) this.store.countCircuitChange();
	}

	protected deleteObject(id: Id): void {
		this.#objects.delete(id);
		this.store.countCircuitChange();
	}

	constructor(store: CCStore) {
		super();
		this.store = store;
	}

	/** Subscribe to the events of other stores. Called after all stores are constructed. */
	abstract mount(): void;

	/**
	 * Get an object by id
	 * @param id id of object
	 * @returns object of `id`
	 */
	get(id: Id): T | undefined {
		return this.objects.get(id);
	}

	/**
	 * Get array of objects
	 * @returns array of objects
	 */
	getMany(): T[] {
		return [...this.objects.values()];
	}
}
