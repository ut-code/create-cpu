import invariant from "tiny-invariant";
import { CCComponentStore, type CCComponent } from "./component";
import { CCNodeStore, type CCNode } from "./node";
import { CCComponentPinStore, type CCComponentPin } from "./componentPin";
import { CCNodePinStore, type CCNodePin } from "./nodePin";
import { CCConnectionStore, type CCConnection } from "./connection";
import { registerIntrinsics } from "./intrinsics";
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
      invariant(props);
      const { components, nodes, componentPins, nodePins, connections } = props;
      this.components.import(components);
      this.nodes.import(nodes);
      this.componentPins.import(componentPins);
      this.nodePins.import(nodePins);
      this.connections.import(connections);
    }
    registerIntrinsics(this);
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
      components: this.components.toArray(),
      nodes: this.nodes.toArray(),
      componentPins: this.componentPins.toArray(),
      nodePins: this.nodePins.toArray(),
      connections: this.connections.toArray(),
    });
  }
}
