import { MultiMap } from "mnemonist";
import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import nullthrows from "nullthrows";
import type CCStore from ".";
import type { CCNodeId } from "./node";
import type { CCPinId } from "./pin";
import type { CCComponentId } from "./component";

export type CCConnectionId = Opaque<string, "CCConnectionId">;

export type CCConnectionEndpoint = {
  readonly nodeId: CCNodeId;
  readonly pinId: CCPinId;
};

export type CCConnection = {
  readonly id: CCConnectionId;
  readonly from: CCConnectionEndpoint;
  readonly to: CCConnectionEndpoint;
  readonly parentComponentId: CCComponentId;
  bentPortion: number;
};

export type CCConnectionStoreEvents = {
  didRegister(Connection: CCConnection): void;
  willUnregister(Connection: CCConnection): void;
  didUnregister(Connection: CCConnection): void;
};

export class CCConnectionStore extends EventEmitter<CCConnectionStoreEvents> {
  #store: CCStore;

  #connections: Map<CCConnectionId, CCConnection> = new Map();

  #parentComponentIdToConnectionIds = new MultiMap<
    CCComponentId,
    CCConnectionId
  >(Set);

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
          connection.from.nodeId === node.id ||
          connection.to.nodeId === node.id
        ) {
          this.unregister([connection.id]);
        }
      }
    });
  }

  register(connection: CCConnection): void {
    const fromNode = this.#store.nodes.get(connection.from.nodeId);
    const toNode = this.#store.nodes.get(connection.to.nodeId);
    const fromPin = this.#store.pins.get(connection.from.pinId);
    const toPin = this.#store.pins.get(connection.to.pinId);
    invariant(fromNode && toNode && fromPin && toPin);
    invariant(fromNode.parentComponentId === toNode.parentComponentId);
    invariant(fromPin.componentId === fromNode.componentId);
    invariant(toPin.componentId === toNode.componentId);
    this.#connections.set(connection.id, connection);
    this.#parentComponentIdToConnectionIds.set(
      connection.parentComponentId,
      connection.id
    );
    this.emit("didRegister", connection);
  }

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

  get(id: CCConnectionId): CCConnection | undefined {
    return this.#connections.get(id);
  }

  getConnectionIdsByParentComponentId(
    parentComponentId: CCComponentId
  ): CCConnectionId[] {
    return [
      ...(this.#parentComponentIdToConnectionIds.get(parentComponentId) ?? []),
    ];
  }

  getConnectionIdsByPinId(
    nodeId: CCNodeId,
    pinId: CCPinId
  ): CCConnectionId[] | undefined {
    return [...this.#connections.values()]
      .filter(
        (connection) =>
          (connection.from.nodeId === nodeId &&
            connection.from.pinId === pinId) ||
          (connection.to.nodeId === nodeId && connection.to.pinId === pinId)
      )
      .map((connection) => connection.id);
  }

  static create(partialConnection: Omit<CCConnection, "id">): CCConnection {
    return {
      id: crypto.randomUUID() as CCConnectionId,
      ...partialConnection,
    };
  }

  toArray(): CCConnection[] {
    return [...this.#connections.values()];
  }
}
