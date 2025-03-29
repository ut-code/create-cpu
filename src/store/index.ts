import { type CCComponent, CCComponentStore } from "./component";
import { type CCComponentPin, CCComponentPinStore } from "./componentPin";
import { type CCConnection, CCConnectionStore } from "./connection";
import * as intrinsics from "./intrinsics/definitions";
import { type CCNode, CCNodeStore } from "./node";
import { type CCNodePin, CCNodePinStore } from "./nodePin";
import TransactionManager from "./transaction";

/**
 * Properties of CCStore from JSON used when restoring store from JSON
 */
export type CCStorePropsFromJson = {
	components: CCComponent[];
	nodes: CCNode[];
	componentPins: CCComponentPin[];
	nodePins: CCNodePin[];
	connections: CCConnection[];
};

/**
 * Store of components, nodes, pins, and connections
 */
export default class CCStore {
	components: CCComponentStore;

	nodes: CCNodeStore;

	componentPins: CCComponentPinStore;

	nodePins: CCNodePinStore;

	connections: CCConnectionStore;

	transactionManager = new TransactionManager();

	/**
	 * Constructor of CCStore
	 * @param rootComponent root component
	 * @param props properties of store from JSON used when restoring store from JSON
	 */
	constructor(props?: CCStorePropsFromJson) {
		this.components = new CCComponentStore(this);
		this.nodes = new CCNodeStore(this);
		this.componentPins = new CCComponentPinStore(this);
		this.nodePins = new CCNodePinStore(this);
		this.connections = new CCConnectionStore(this);
		if (props) {
			const { components, nodes, componentPins, nodePins, connections } = props;
			this.components.import(components);
			this.nodes.import(nodes);
			this.componentPins.import(componentPins);
			this.nodePins.import(nodePins);
			this.connections.import(connections);
		}

		for (const definition of Object.values(intrinsics.definitions)) {
			this.components.register(definition.component);
			for (const pin of definition.allPins) {
				this.componentPins.register(pin);
			}
		}

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
			components: this.components.getMany(),
			nodes: this.nodes.getMany(),
			componentPins: this.componentPins.getMany(),
			nodePins: this.nodePins.getMany(),
			connections: this.connections.getMany(),
		});
	}
}
