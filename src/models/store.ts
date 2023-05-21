import { Point } from "pixi.js";
import type { CCComponentId } from "../types";
import CCComponent from "./component";
import CCNode from "./node";

export default class CCStore {
  // #ccTags: Map<string, CCTag>;

  #ccComponents: Map<CCComponentId, CCComponent>;

  #ccNodes: Map<string, CCNode>;

  // #ccConnection: Map<string, CCConnection>;

  constructor() {
    // this.#ccTags = new Map();
    this.#ccComponents = new Map();
    const rootComponent = new CCComponent(this, "", true);
    const sampleComponent = new CCComponent(this, "Sample");
    this.#ccComponents.set(rootComponent.id, rootComponent);
    this.#ccComponents.set(sampleComponent.id, sampleComponent);
    this.#ccNodes = new Map();
    const sampleNode = new CCNode({
      store: this,
      componentId: sampleComponent.id,
      parentComponentId: rootComponent.id,
      position: new Point(0, 0),
    });
    this.#ccNodes.set(sampleNode.id, sampleNode);
    this.#ccComponents.get(sampleComponent.id)!.registerNodes();
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

  addCCNodeInCCComponent(node: CCNode) {
    this.#ccNodes.set(node.id, node);
    this.#ccComponents.get(node.ccComponentId)!.registerNodes();
  }
}
