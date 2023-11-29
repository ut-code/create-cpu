import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import * as PIXI from "pixi.js";
import { MultiMap } from "mnemonist";
import type CCStore from ".";
import type { CCComponentId } from "./component";

export type CCNodeId = Opaque<string, "CCNodeId">;

export type CCNode = {
  readonly id: CCNodeId;
  readonly parentComponentId: CCComponentId;
  readonly componentId: CCComponentId;
  position: PIXI.Point;
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

  unregister(ids: CCNodeId[]): void {
    for (const id of ids) {
      const node = this.#nodes.get(id);
      if (!node) throw new Error(`Node ${id} not found`);
      this.emit("willUnregister", node);
      this.#parentComponentIdToNodeIds.remove(node.parentComponentId, node.id);
      this.#nodes.delete(id);
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
    return {
      id: crypto.randomUUID() as CCNodeId,
      ...partialNode,
    };
  }

  toArray(): CCNode[] {
    return [...this.#nodes.values()];
  }
}
