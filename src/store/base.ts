import EventEmitter from "eventemitter3";
import type CCStore from ".";
import type {
	CCObject,
	CCObjectByType,
	CCObjectId,
	CCObjectStore,
	CCObjectType,
	CCReferences,
} from "./types";

/** Events emitted by every object-specific store */
export type CCObjectStoreEvents<T> = {
	didRegister(object: T): void;
	willUnregister(object: T): void;
	didUnregister(object: T): void;
};

/** Base class of the object-specific stores (components, nodes, pins, and connections) */
export abstract class CCObjectStoreBase<
		K extends CCObjectType,
		Events extends CCObjectStoreEvents<CCObjectByType[K]>,
	>
	extends EventEmitter<Events>
	implements CCObjectStore<K>
{
	protected readonly store: CCStore;

	readonly #objects: Map<CCObjectId<K>, CCObjectByType[K]> = new Map();

	protected get objects(): ReadonlyMap<CCObjectId<K>, CCObjectByType[K]> {
		return this.#objects;
	}

	/**
	 * Fields of the objects holding the id of another object, mapped to the object type of that id.
	 * Every such field must be listed with its correct object type.
	 */
	abstract readonly references: CCReferences<CCObjectByType[K]>;

	protected setObject(
		object: CCObjectByType[K] & CCObject<K>,
		{ changesCircuit = true }: { changesCircuit?: boolean } = {},
	): void {
		this.#objects.set(object.id, object);
		if (changesCircuit) this.store.countCircuitChange();
	}

	protected deleteObject(id: CCObjectId<K>): void {
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
	get(id: CCObjectId<K>): CCObjectByType[K] | undefined {
		return this.objects.get(id);
	}

	/**
	 * Get array of objects
	 * @returns array of objects
	 */
	getMany(): CCObjectByType[K][] {
		return [...this.objects.values()];
	}
}
