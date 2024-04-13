import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import * as PIXI from "pixi.js";
import { MultiMap } from "mnemonist";
import nullthrows from "nullthrows";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import { hasVariablePinCount } from "./intrinsics";

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

/**
 * Store of nodes
 */
export class CCNodeStore extends EventEmitter<CCNodeStoreEvents> {
  #store: CCStore;

  #nodes: Map<CCNodeId, CCNode> = new Map();

  #parentComponentIdToNodeIds = new MultiMap<CCComponentId, CCNodeId>(Set);

  /**
   * Constructor of CCNodeStore
   * @param store store
   * @param nodes initial nodes
   */
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

  /**
   * Register a node
   * @param node node to be registered
   */
  register(node: CCNode): void {
    invariant(this.#store.components.get(node.componentId));
    invariant(this.#store.components.get(node.parentComponentId));
    this.#nodes.set(node.id, node);
    this.#parentComponentIdToNodeIds.set(node.parentComponentId, node.id);
    this.emit("didRegister", node);
  }

  /**
   * Unregister nodes
   * @param ids ids of nodes to be unregistered
   */
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

  /**
   * Get a node by id
   * @param id id of node
   * @returns node of `id`
   */
  get(id: CCNodeId): CCNode | undefined {
    return this.#nodes.get(id);
  }

  /**
   * Get all of nodes
   * @returns all nodes
   */
  getAll(): CCNode[] {
    return [...this.#nodes.values()];
  }

  /**
   * Get all of nodes by parent component id
   * @param parentComponentId id of parent component
   * @returns nodes of parent component
   */
  getNodeIdsByParentComponentId(parentComponentId: CCComponentId): CCNodeId[] {
    return [...(this.#parentComponentIdToNodeIds.get(parentComponentId) ?? [])];
  }

  /**
   * Update position of node
   * @param id id of node
   * @param value new position
   */
  update(id: CCNodeId, value: Pick<CCNode, "position">): void {
    const node = this.#nodes.get(id);
    invariant(node);
    this.#nodes.set(id, { ...node, ...value });
    this.emit("didUpdate", node);
  }

  /**
   * Create node
   * @param partialNode node without `id`
   * @returns new node
   */
  static create(partialNode: Omit<CCNode, "id">): CCNode {
    invariant(
      hasVariablePinCount(partialNode.componentId)
        ? partialNode.intrinsicVariablePinCount !== null
        : partialNode.intrinsicVariablePinCount === null
    );
    return {
      id: crypto.randomUUID() as CCNodeId,
      ...partialNode,
    };
  }

  /**
   * Get array of nodes
   * @returns array of nodes
   */
  toArray(): CCNode[] {
    return [...this.#nodes.values()];
  }
}
