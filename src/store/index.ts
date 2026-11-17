import { CCStoreAutoSaver } from "./autoSaver";
import { CCComponentStore } from "./component";
import { CCComponentPinStore } from "./componentPin";
import {
	CCConnectionStore,
	ccConnectionStoreChangeEventTypes,
} from "./connection";
import * as intrinsics from "./intrinsics/definitions";
import { CCNodeStore } from "./node";
import { CCNodePinStore, ccNodePinStoreChangeEventTypes } from "./nodePin";
import TransactionManager from "./transaction";
import type { CCObjectStore, CCObjectType } from "./types";

type CCObjectStores = { [K in CCObjectType]: CCObjectStore<K> };

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
	 * Constructor of CCStore
	 * @param rootComponent root component
	 * @param props properties of store from JSON used when restoring store from JSON
	 */
	constructor() {
		this.components = new CCComponentStore(this);
		this.nodes = new CCNodeStore(this);
		this.componentPins = new CCComponentPinStore(this);
		this.nodePins = new CCNodePinStore(this);
		this.connections = new CCConnectionStore(this);
		this.transactionManager = new TransactionManager();
		this.autoSaver = new CCStoreAutoSaver(this);

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
		const subscriptions: (() => void)[] = [];
		const subscribe = <Events extends object>(
			emitter: {
				on(event: keyof Events, listener: () => void): unknown;
				off(event: keyof Events, listener: () => void): unknown;
			},
			eventTypes: readonly (keyof Events)[],
		) => {
			for (const eventType of eventTypes) {
				emitter.on(eventType, listener);
				subscriptions.push(() => emitter.off(eventType, listener));
			}
		};
		// Renames and moves emit only `didUpdate`, which is left out here since they do not
		// change the circuit
		subscribe(this.components, ["didRegister", "didUnregister"] as const);
		subscribe(this.componentPins, ["didRegister", "didUnregister"] as const);
		subscribe(this.nodes, [
			"didRegister",
			"didUnregister",
			"didUpdateConfig",
		] as const);
		subscribe(this.nodePins, ccNodePinStoreChangeEventTypes);
		subscribe(this.connections, ccConnectionStoreChangeEventTypes);
		return () => {
			for (const unsubscribe of subscriptions) unsubscribe();
		};
	}

	getObjectStore<K extends CCObjectType>(
		this: CCObjectStores,
		type: K,
	): CCObjectStore<K> {
		return this[type];
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
			JSON.parse(json);
		this.components.import(components);
		this.nodes.import(nodes);
		this.componentPins.import(componentPins);
		this.nodePins.import(nodePins);
		this.connections.import(connections);
	}
}
