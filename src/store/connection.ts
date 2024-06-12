import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import nullthrows from "nullthrows";
import type CCStore from ".";
import type { CCNodeId } from "./node";
import type { CCComponentPinId } from "./componentPin";
import type { CCComponentId } from "./component";
import type { CCNodePinId } from "./nodePin";

export type CCConnectionId = Opaque<string, "CCConnectionId">;

export type CCConnectionEndpoint = {
  readonly nodeId: CCNodeId;
  readonly pinId: CCComponentPinId;
};

export type CCConnection = {
  readonly id: CCConnectionId;
  readonly from: CCNodePinId;
  readonly to: CCNodePinId;
  readonly parentComponentId: CCComponentId;
  bentPortion: number;
};

export type CCConnectionStoreEvents = {
  didRegister(Connection: CCConnection): void;
  willUnregister(Connection: CCConnection): void;
  didUnregister(Connection: CCConnection): void;
};

/**
 * Store of connections
 */
export class CCConnectionStore extends EventEmitter<CCConnectionStoreEvents> {
  #store: CCStore;

  #connections: Map<CCConnectionId, CCConnection> = new Map();

  /**
   * Constructor of CCConnectionStore
   * @param store store
   * @param connections initial connections
   */
  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  import(connections: CCConnection[]): void {
    for (const connection of connections) {
      this.#connections.set(connection.id, connection);
    }
  }

  mount() {
    this.#store.nodePins.on("willUnregister", (nodePin) => {
      const connections = this.getConnectionsByNodePinId(nodePin.id);
      if (connections.length > 0) {
        this.unregister(connections.map((connection) => connection.id));
      }
    });
  }

  /**
   * Register a connection
   * @param connection connection to be registered
   */
  register(connection: CCConnection): void {
    const fromNodeId = this.#store.nodePins.get(connection.from)!.nodeId;
    const toNodeId = this.#store.nodePins.get(connection.to)!.nodeId;
    const fromNode = this.#store.nodes.get(fromNodeId);
    const toNode = this.#store.nodes.get(toNodeId);
    invariant(fromNode && toNode);
    invariant(fromNode.parentComponentId === toNode.parentComponentId);
    this.#connections.set(connection.id, connection);
    this.emit("didRegister", connection);
  }

  /**
   * Unregister a connection
   * @param ids ids of connections to be unregistered
   */
  async unregister(ids: CCConnectionId[]): Promise<void> {
    const connections = ids.map((id) => nullthrows(this.#connections.get(id)));
    await this.#store.transactionManager.runInTransaction(() => {
      for (const connection of connections) {
        this.emit("willUnregister", connection);
        this.#connections.delete(connection.id);
      }
    });
    for (const connection of connections) {
      this.emit("didUnregister", connection);
    }
  }

  /**
   * Get a connection by CCConnectionId
   * @param id id of connection
   * @returns connection of `id`
   */
  get(id: CCConnectionId): CCConnection | undefined {
    return this.#connections.get(id);
  }

  /**
   * Get all of connections
   * @returns map of id and connection (read only)
   */
  getConnectionIdsByParentComponentId(
    parentComponentId: CCComponentId
  ): CCConnectionId[] {
    return [...this.#connections.values()]
      .filter(
        (connection) => connection.parentComponentId === parentComponentId
      )
      .map((connection) => connection.id);
  }

  getManyByParentComponentId(parentComponentId: CCComponentId): CCConnection[] {
    return [...this.#connections.values()].filter(
      (connection) => connection.parentComponentId === parentComponentId
    );
  }

  /**
   * Get connections by id of node and pin
   * @param nodeId id of node
   * @param pinId id of pin
   * @returns connections connected to the pin of the node
   */
  getConnectionsByNodePinId(nodePinId: CCNodePinId): CCConnection[] {
    return [...this.#connections.values()].filter(
      (connection) =>
        connection.from === nodePinId || connection.to === nodePinId
    );
  }

  /**
   * Check if no connection of the pin of the node existsno connection of the pin of the node exists
   * @param nodeId id of node
   * @param pinId id of pin
   * @returns if no connection of the pin of the node exists, `true` returns (otherwise `false`)
   * @deprecated in favor of {@link getConnectionsByNodePinId}
   */
  hasNoConnectionOf(nodePinId: CCNodePinId): boolean {
    return this.getConnectionsByNodePinId(nodePinId).length === 0;
  }

  /**
   * Create a new connection
   * @param partialConnection connection without `id`
   * @returns a new connection
   */
  static create(partialConnection: Omit<CCConnection, "id">): CCConnection {
    return {
      id: crypto.randomUUID() as CCConnectionId,
      ...partialConnection,
    };
  }

  /**
   * Get array of connections
   * @returns array of connections
   */
  toArray(): CCConnection[] {
    return [...this.#connections.values()];
  }
}
