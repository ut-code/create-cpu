import { MultiMap } from "mnemonist";
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

  #parentComponentIdToConnectionIds = new MultiMap<
    CCComponentId,
    CCConnectionId
  >(Set);

  /**
   * Constructor of CCConnectionStore
   * @param store store
   * @param connections initial connections
   */
  constructor(store: CCStore, connections?: CCConnection[]) {
    super();
    this.#store = store;
    if (connections) {
      for (const connection of connections) {
        this.register(connection);
      }
    }
    this.#store.nodes.on("willUnregister", (node) => {
      for (const connection of this.#connections.values()) {
        if (
          this.#store.nodes.getNodeIdByNodePinId(connection.from) === node.id ||
          this.#store.nodes.getNodeIdByNodePinId(connection.to) === node.id
        ) {
          this.unregister([connection.id]);
        }
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
    this.#parentComponentIdToConnectionIds.set(
      connection.parentComponentId,
      connection.id
    );
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
        this.#parentComponentIdToConnectionIds.remove(
          connection.parentComponentId,
          connection.id
        );
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
    return [
      ...(this.#parentComponentIdToConnectionIds.get(parentComponentId) ?? []),
    ];
  }

  /**
   * Get connections by id of node and pin
   * @param nodeId id of node
   * @param pinId id of pin
   * @returns connections connected to the pin of the node
   */
  getConnectionsByNodePinId(
    nodePinId: CCNodePinId
  ): CCConnection[] | undefined {
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
   */
  hasNoConnectionOf(nodePinId: CCNodePinId): boolean {
    return this.getConnectionsByNodePinId(nodePinId)?.length === 0;
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
