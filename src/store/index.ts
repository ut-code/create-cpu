import { CCStoreAutoSaver } from "./autoSaver";
import { CCComponentStore } from "./component";
import { CCComponentPinStore } from "./componentPin";
import { CCConnectionStore } from "./connection";
import * as intrinsics from "./intrinsics/definitions";
import { CCNodeStore } from "./node";
import { CCNodePinStore } from "./nodePin";
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
