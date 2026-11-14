import EventEmitter from "eventemitter3";
import type CCStore from ".";
import type {
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

	protected readonly objects: Map<CCObjectId<K>, CCObjectByType[K]> = new Map();

	/**
	 * Fields of the objects holding the id of another object, mapped to the object type of that id.
	 * Every such field must be listed with its correct object type.
	 */
	abstract readonly references: CCReferences<CCObjectByType[K]>;

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
