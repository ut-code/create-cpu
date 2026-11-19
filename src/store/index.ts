import { CCStoreAutoSaver } from "./autoSaver";
import { CCComponentStore } from "./component";
import { CCComponentPinStore } from "./componentPin";
import {
	CCConnectionStore,
	ccConnectionStoreChangeEventTypes,
} from "./connection";
import { listenToEvents } from "./events";
import * as intrinsics from "./intrinsics/definitions";
import { CCNodeStore } from "./node";
import { CCNodePinStore, ccNodePinStoreChangeEventTypes } from "./nodePin";
import TransactionManager from "./transaction";
import {
	type CCObjectByType,
	type CCObjectId,
	type CCObjectStore,
	type CCObjectType,
	ccObjectTypes,
} from "./types";

type CCObjectStores = { [K in CCObjectType]: CCObjectStore<K> };

export type CCStoreJson = { [K in CCObjectType]: CCObjectByType[K][] };

export class CCStoreJsonError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "CCStoreJsonError";
	}
}

/**
 * Parse a store saved with {@link CCStore.toJSON}. Only its outline is checked, which
 * tells a file exported from this app from any other.
 * @throws {CCStoreJsonError} if the text is not such a store
 */
export function parseStoreJson(json: string): CCStoreJson {
	let data: unknown;
	try {
		data = JSON.parse(json);
	} catch (error) {
		throw new CCStoreJsonError("The text is not JSON", { cause: error });
	}
	if (typeof data !== "object" || data === null) {
		throw new CCStoreJsonError("The JSON is not an object");
	}
	for (const key of ccObjectTypes) {
		if (!Array.isArray((data as Record<string, unknown>)[key])) {
			throw new CCStoreJsonError(`The JSON has no list of ${key}`);
		}
	}
	return data as CCStoreJson;
}

/**
 * Store of components, nodes, pins, and connections
 */
export default class CCStore implements CCObjectStores {
	components: CCComponentStore;

	nodes: CCNodeStore;

	componentPins: CCComponentPinStore;

	nodePins: CCNodePinStore;

	connections: CCConnectionStore;

	transactionManager: TransactionManager;

	autoSaver: CCStoreAutoSaver;

	#revision = 0;

	/**
	 * How many circuit changes the store has seen. Anything derived from the circuit, such
	 * as a simulation netlist, can be cached against this number and rebuilt once it
	 * changes. Moving a node or renaming does not change the circuit, so it does not count.
	 *
	 * A change is counted when it is made, not when it is announced, since a removal is
	 * announced only when its transaction ends.
	 */
	get revision(): number {
		return this.#revision;
	}

	countCircuitChange(): void {
		this.#revision += 1;
	}

	/**
	 * @param options.storageKey where the auto saver keeps the store in the local storage
	 */
	constructor(options: { storageKey?: string } = {}) {
		this.components = new CCComponentStore(this);
		this.nodes = new CCNodeStore(this);
		this.componentPins = new CCComponentPinStore(this);
		this.nodePins = new CCNodePinStore(this);
		this.connections = new CCConnectionStore(this);
		this.transactionManager = new TransactionManager();
		this.autoSaver = new CCStoreAutoSaver(this, options.storageKey);

		for (const definition of Object.values(intrinsics.definitions)) {
			this.components.register(definition.component);
			for (const pin of definition.allPins) {
				this.componentPins.register(pin);
			}
		}
	}

	/**
	 * Listen to the announcements of the changes of the circuit. Anything derived from
	 * more than one object, such as a bit width that a change in another component can
	 * alter, has to be recomputed on any of them.
	 * @param listener called synchronously on each change
	 * @returns a function to stop listening
	 */
	subscribeToCircuitChanges(listener: () => void): () => void {
		// Renames and moves emit only `didUpdate`, which is left out here since they do not
		// change the circuit
		const unsubscribes = [
			listenToEvents(
				this.components,
				["didRegister", "didUnregister"] as const,
				listener,
			),
			listenToEvents(
				this.componentPins,
				["didRegister", "didUnregister"] as const,
				listener,
			),
			listenToEvents(
				this.nodes,
				["didRegister", "didUnregister", "didUpdateConfig"] as const,
				listener,
			),
			listenToEvents(this.nodePins, ccNodePinStoreChangeEventTypes, listener),
			listenToEvents(
				this.connections,
				ccConnectionStoreChangeEventTypes,
				listener,
			),
		];
		return () => {
			for (const unsubscribe of unsubscribes) unsubscribe();
		};
	}

	getObjectStore<K extends CCObjectType>(
		this: CCObjectStores,
		type: K,
	): CCObjectStore<K> {
		return this[type];
	}

	/**
	 * Each way the objects contradict what the editor relies on, e.g. `nodes.componentId
	 * of <id> refers to nothing`
	 */
	findInconsistencies(): string[] {
		const inconsistencies = ccObjectTypes.flatMap((type) =>
			this.#findBrokenReferencesOf(type).map(
				(reference) => `${reference} refers to nothing`,
			),
		);
		for (const pin of this.componentPins.getMany()) {
			const component = this.components.get(pin.componentId);
			if (component && !component.intrinsicType && pin.implementation === null)
				inconsistencies.push(
					`componentPins.implementation of ${pin.id} is missing`,
				);
		}
		const connectedInputs = new Set<string>();
		for (const connection of this.connections.getMany()) {
			if (connectedInputs.has(connection.to))
				inconsistencies.push(
					`nodePins ${connection.to} is the input of more than one connection`,
				);
			connectedInputs.add(connection.to);
		}
		return inconsistencies;
	}

	#findBrokenReferencesOf<K extends CCObjectType>(type: K): string[] {
		const objectStore = this.getObjectStore(type);
		const references = Object.entries(objectStore.references) as [
			keyof CCObjectByType[K],
			CCObjectType,
		][];
		return objectStore.getMany().flatMap((object) =>
			references
				.filter(([field, targetType]) => {
					const targetId = object[field] as CCObjectId | null;
					return (
						targetId !== null && !this.getObjectStore(targetType).get(targetId)
					);
				})
				.map(([field]) => `${type}.${String(field)} of ${object.id}`),
		);
	}

	mount() {
		this.components.mount();
		this.nodes.mount();
		this.componentPins.mount();
		this.nodePins.mount();
		this.connections.mount();
	}

	/**
	 * Get the JSON representation of the store
	 * @returns JSON representation of the store
	 */
	toJSON() {
		return JSON.stringify({
			// Only export non-intrinsic components
			components: this.components.getMany().filter((c) => !c.intrinsicType),
			nodes: this.nodes.getMany(),
			componentPins: this.componentPins.getMany(),
			nodePins: this.nodePins.getMany(),
			connections: this.connections.getMany(),
		});
	}

	/**
	 * Restore the objects of a store saved with {@link toJSON}. Some stores add them
	 * without announcing them, so this must run before {@link mount}.
	 */
	importJson(json: string) {
		const { components, nodes, componentPins, nodePins, connections } =
			parseStoreJson(json);
		this.components.import(components);
		this.nodes.import(nodes);
		this.componentPins.import(componentPins);
		this.nodePins.import(nodePins);
		this.connections.import(connections);
	}
}
