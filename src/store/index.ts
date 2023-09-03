import { CCComponentStore, type CCComponent } from "./component";
import { CCNodeStore } from "./node";
import { CCPinStore } from "./pin";
import { CCConnectionStore } from "./connection";
import { registerIntrinsics } from "./intrinsics";

export default class CCStore {
  components: CCComponentStore;

  nodes: CCNodeStore;

  pins: CCPinStore;

  connections: CCConnectionStore;

  constructor(rootComponent: CCComponent) {
    this.components = new CCComponentStore(this, rootComponent);
    this.nodes = new CCNodeStore(this);
    this.pins = new CCPinStore(this);
    this.connections = new CCConnectionStore(this);
    registerIntrinsics(this);
  }
}
