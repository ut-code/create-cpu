import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import * as PIXI from "pixi.js";
import { MultiMap } from "mnemonist";
import nullthrows from "nullthrows";
import type CCStore from ".";
import type { CCComponentId } from "./component";
// import { hasVariablePinCount } from "./intrinsics";

export type CCNodeId = Opaque<string, "CCNodeId">;

export type CCNode = {
  readonly id: CCNodeId;
  readonly parentComponentId: CCComponentId;
  readonly componentId: CCComponentId;
  position: PIXI.Point;
  /** The dynamic pin count exclusive to certain intrinsic components */
  intrinsicVariablePinCount: number | null;
};

export type CCNodeStoreEvents = {
  didRegister(node: CCNode): void;
  willUnregister(node: CCNode): void;
  didUnregister(node: CCNode): void;
  didUpdate(node: CCNode): void;
};

export class CCNodeStore extends EventEmitter<CCNodeStoreEvents> {
  #store: CCStore;

  #nodes: Map<CCNodeId, CCNode> = new Map();

  #parentComponentIdToNodeIds = new MultiMap<CCComponentId, CCNodeId>(Set);

  constructor(store: CCStore, nodes?: CCNode[]) {
    super();
    this.#store = store;
    if (nodes) {
      for (const node of nodes) {
        node.position = new PIXI.Point(node.position.x, node.position.y);
        this.register(node);
      }
    }
  }

  register(node: CCNode): void {
    invariant(this.#store.components.get(node.componentId));
    invariant(this.#store.components.get(node.parentComponentId));
    this.#nodes.set(node.id, node);
    this.#parentComponentIdToNodeIds.set(node.parentComponentId, node.id);
    this.emit("didRegister", node);
  }

  async unregister(ids: CCNodeId[]): Promise<void> {
    const nodes = ids.map((id) => nullthrows(this.#nodes.get(id)));
    await this.#store.transactionManager.runInTransaction(() => {
      for (const node of nodes) {
        this.emit("willUnregister", node);
        this.#parentComponentIdToNodeIds.remove(
          node.parentComponentId,
          node.id
        );
        this.#nodes.delete(node.id);
      }
    });
    for (const node of nodes) {
      this.emit("didUnregister", node);
    }
  }

  get(id: CCNodeId): CCNode | undefined {
    return this.#nodes.get(id);
  }

  getAll(): CCNode[] {
    return [...this.#nodes.values()];
  }

  getNodeIdsByParentComponentId(parentComponentId: CCComponentId): CCNodeId[] {
    return [...(this.#parentComponentIdToNodeIds.get(parentComponentId) ?? [])];
  }

  update(id: CCNodeId, value: Pick<CCNode, "position">): void {
    const node = this.#nodes.get(id);
    invariant(node);
    this.#nodes.set(id, { ...node, ...value });
    this.emit("didUpdate", node);
  }

  static create(partialNode: Omit<CCNode, "id">): CCNode {
    // invariant(
    //   hasVariablePinCount(partialNode.componentId)
    //     ? partialNode.intrinsicVariablePinCount !== null
    //     : partialNode.intrinsicVariablePinCount === null
    // );
    return {
      id: crypto.randomUUID() as CCNodeId,
      ...partialNode,
    };
  }

  toArray(): CCNode[] {
    return [...this.#nodes.values()];
  }
}
