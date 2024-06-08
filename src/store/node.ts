import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import * as PIXI from "pixi.js";
import nullthrows from "nullthrows";
import type CCStore from ".";
import type { CCComponentId } from "./component";

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

  /**
   * Constructor of CCNodeStore
   * @param store store
   * @param nodes initial nodes
   */
  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  import(nodes: CCNode[]): void {
    for (const node of nodes) {
      node.position = new PIXI.Point(node.position.x, node.position.y);
      this.register(node);
    }
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  mount() {}

  /**
   * Register a node
   * @param node node to be registered
   */
  register(node: CCNode): void {
    invariant(this.#store.components.get(node.componentId));
    invariant(this.#store.components.get(node.parentComponentId));
    this.#nodes.set(node.id, node);
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
   * Get all of nodes by parent component id
   * @param parentComponentId id of parent component
   * @returns nodes of parent component
   * @deprecated in favor of {@link getManyByParentComponentId}
   */
  getNodeIdsByParentComponentId(parentComponentId: CCComponentId): CCNodeId[] {
    return this.getManyByParentComponentId(parentComponentId).map(
      (node) => node.id
    );
  }

  getManyByParentComponentId(parentComponentId: CCComponentId): CCNode[] {
    return [...this.#nodes.values()].filter(
      (node) => node.parentComponentId === parentComponentId
    );
  }

  getManyByComponentId(componentId: CCComponentId): CCNode[] {
    return [...this.#nodes.values()].filter(
      (node) => node.componentId === componentId
    );
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

  /**
   * Get array of nodes
   * @returns array of nodes
   */
  toArray(): CCNode[] {
    return [...this.#nodes.values()];
  }
}
