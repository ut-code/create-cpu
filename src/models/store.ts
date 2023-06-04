import { Point } from "pixi.js";
import type { CCComponentId, CCConnectionId } from "../types";
import CCComponent, { CCPin } from "./component";
import CCNode from "./node";
import CCConnection from "./connection";

export default class CCStore {
  // #ccTags: Map<string, CCTag>;

  #ccComponents: Map<CCComponentId, CCComponent>;

  #ccNodes: Map<string, CCNode>;

  #ccConnections: Map<string, CCConnection>;

  constructor() {
    // this.#ccTags = new Map();
    this.#ccComponents = new Map();
    this.#ccConnections = new Map();
    const rootComponent = new CCComponent(this, "", true);
    const sampleComponent = new CCComponent(this, "Sample");
    const sampleComponentInputPin1: CCPin = {
      id: crypto.randomUUID(),
      name: "A",
    };
    const sampleComponentInputPin2: CCPin = {
      id: crypto.randomUUID(),
      name: "B",
    };
    sampleComponent.inputPins = [
      sampleComponentInputPin1,
      sampleComponentInputPin2,
    ];
    const sampleComponentOutputPin1: CCPin = {
      id: crypto.randomUUID(),
      name: "X",
    };
    sampleComponent.outputPins = [sampleComponentOutputPin1];
    this.#ccComponents.set(rootComponent.id, rootComponent);
    this.#ccComponents.set(sampleComponent.id, sampleComponent);
    this.#ccNodes = new Map();
    const sampleNode1 = new CCNode({
      store: this,
      componentId: sampleComponent.id,
      parentComponentId: rootComponent.id,
      position: new Point(0, 0),
    });
    const sampleNode2 = new CCNode({
      store: this,
      componentId: sampleComponent.id,
      parentComponentId: rootComponent.id,
      position: new Point(400, 0),
    });
    this.#ccNodes.set(sampleNode1.id, sampleNode1);
    this.#ccNodes.set(sampleNode2.id, sampleNode2);
    const sampleConnection = new CCConnection(
      {
        nodeId: sampleNode1.id,
        pinId: sampleComponentOutputPin1.id,
      },
      {
        nodeId: sampleNode2.id,
        pinId: sampleComponentInputPin2.id,
      },
      rootComponent.id
    );
    this.#ccConnections.set(sampleConnection.id, sampleConnection);
    rootComponent.registerNodes();
    rootComponent.registerConnections();
  }

  getComponent(componentId: CCComponentId): CCComponent {
    return this.#ccComponents.get(componentId)!;
  }

  getCCNodesInCCComponent(ccComponentId: CCComponentId): CCNode[] {
    return Array.from(this.#ccNodes.values()).filter(
      (ccNode) => ccNode.parentComponentId === ccComponentId
    );
  }

  getCCNode(nodeId: string): CCNode {
    return this.#ccNodes.get(nodeId) as CCNode;
  }

  getCCNodes(): Map<string, CCNode> {
    return this.#ccNodes;
  }

  addCCNodeInCCComponent(node: CCNode) {
    this.#ccNodes.set(node.id, node);
    this.#ccComponents.get(node.ccComponentId)!.registerNodes();
  }

  getCCConnection(connectionId: CCConnectionId) {
    return this.#ccConnections.get(connectionId);
  }

  getCCConnectionsInCCComponent(ccComponentId: CCComponentId): CCConnection[] {
    return Array.from(this.#ccConnections.values()).filter(
      (ccConnection) => ccConnection.parentComponentId === ccComponentId
    );
  }

  addCCConnectionInComponent(connection: CCConnection) {
    this.#ccConnections.set(connection.id, connection);
    this.#ccComponents.get(connection.parentComponentId)!.registerConnections();
  }

  getCCConnectionFromEndpoint(nodeId: string, pinId: string) {
    return Array.from(this.#ccConnections.values()).find(
      (connection) =>
        (connection.fromEndpoint.nodeId === nodeId &&
          connection.fromEndpoint.pinId === pinId) ||
        (connection.toEndpoint.nodeId === nodeId &&
          connection.toEndpoint.pinId === pinId)
    );
  }
}
