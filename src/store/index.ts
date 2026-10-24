import { CCStoreAutoSaver } from "./autoSaver";
import {
	CCComponentStore,
	ccComponentStoreChangeEventTypes,
} from "./component";
import {
	CCComponentPinStore,
	ccComponentPinStoreChangeEventTypes,
} from "./componentPin";
import {
	CCConnectionStore,
	ccConnectionStoreChangeEventTypes,
} from "./connection";
import * as intrinsics from "./intrinsics/definitions";
import { CCNodeStore } from "./node";
import { CCNodePinStore, ccNodePinStoreChangeEventTypes } from "./nodePin";
import TransactionManager from "./transaction";

/**
 * Store of components, nodes, pins, and connections
 */
export default class CCStore {
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
	 * changes. Moving a node does not change the circuit, so it does not count.
	 */
	get revision(): number {
		return this.#revision;
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

		const countRevision = () => {
			this.#revision += 1;
		};
		for (const eventType of ccComponentStoreChangeEventTypes) {
			this.components.on(eventType, countRevision);
		}
		for (const eventType of ccComponentPinStoreChangeEventTypes) {
			this.componentPins.on(eventType, countRevision);
		}
		// `didUpdate` of the node store also fires for position changes, which the circuit
		// does not depend on, so only the config is watched here.
		for (const eventType of [
			"didRegister",
			"didUnregister",
			"didUpdateConfig",
		] as const) {
			this.nodes.on(eventType, countRevision);
		}
		for (const eventType of ccNodePinStoreChangeEventTypes) {
			this.nodePins.on(eventType, countRevision);
		}
		for (const eventType of ccConnectionStoreChangeEventTypes) {
			this.connections.on(eventType, countRevision);
		}
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
