import invariant from "tiny-invariant";
import {
  CCComponentStore,
  type CCComponent,
  type CCComponentId,
} from "./component";
import { CCNodeStore, type CCNode } from "./node";
import { CCPinStore, type CCPin } from "./pin";
import { CCConnectionStore, type CCConnection } from "./connection";
import { registerIntrinsics } from "./intrinsics";
import TransactionManager from "./transaction";

export type CCStorePropsFromJson = {
  rootComponentId: CCComponentId;
  components: CCComponent[];
  nodes: CCNode[];
  pins: CCPin[];
  connections: CCConnection[];
};

export default class CCStore {
  components: CCComponentStore;

  nodes: CCNodeStore;

  pins: CCPinStore;

  connections: CCConnectionStore;

  transactionManager = new TransactionManager();

  constructor(rootComponent?: CCComponent, props?: CCStorePropsFromJson) {
    if (rootComponent) {
      this.components = new CCComponentStore(this, rootComponent);
      this.nodes = new CCNodeStore(this);
      this.pins = new CCPinStore(this);
      this.connections = new CCConnectionStore(this);
    } else {
      invariant(props);
      const { rootComponentId, components, nodes, pins, connections } = props;
      this.components = new CCComponentStore(
        this,
        undefined,
        rootComponentId,
        components
      );
      this.nodes = new CCNodeStore(this, nodes);
      this.pins = new CCPinStore(this, pins);
      this.connections = new CCConnectionStore(this, connections);
    }
    registerIntrinsics(this);
  }

  toJSON() {
    return JSON.stringify({
      rootComponentId: this.components.rootComponentId,
      components: this.components.toArray(),
      nodes: this.nodes.toArray(),
      pins: this.pins.toArray(),
      connections: this.connections.toArray(),
    });
  }
}
