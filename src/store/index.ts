import invariant from "tiny-invariant";
import {
  CCComponentStore,
  type CCComponent,
  type CCComponentId,
} from "./component";
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
  rootComponentId: CCComponentId;
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
  constructor(rootComponent?: CCComponent, props?: CCStorePropsFromJson) {
    if (rootComponent) {
      this.components = new CCComponentStore(this, rootComponent);
      this.nodes = new CCNodeStore(this);
      this.componentPins = new CCComponentPinStore(this);
      this.nodePins = new CCNodePinStore(this);
      this.connections = new CCConnectionStore(this);
    } else {
      invariant(props);
      const {
        rootComponentId,
        components,
        nodes,
        componentPins,
        nodePins,
        connections,
      } = props;
      this.components = new CCComponentStore(
        this,
        undefined,
        rootComponentId,
        components
      );
      this.nodes = new CCNodeStore(this, nodes);
      this.componentPins = new CCComponentPinStore(this, componentPins);
      this.nodePins = new CCNodePinStore(this, nodePins);
      this.connections = new CCConnectionStore(this, connections);
    }
    registerIntrinsics(this);
  }

  /**
   * Get the JSON representation of the store
   * @returns JSON representation of the store
   */
  toJSON() {
    return JSON.stringify({
      rootComponentId: this.components.rootComponentId,
      components: this.components.toArray(),
      nodes: this.nodes.toArray(),
      componentPins: this.componentPins.toArray(),
      nodePins: this.nodePins.toArray(),
      connections: this.connections.toArray(),
    });
  }
}
