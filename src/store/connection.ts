import { MultiMap } from "mnemonist";
import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
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
};

export type CCConnectionStoreEvents = {
  didRegister(Connection: CCConnection): void;
  didUnregister(Connection: CCConnection): void;
};

export class CCConnectionStore extends EventEmitter<CCConnectionStoreEvents> {
  #store: CCStore;

  #connections: Map<CCConnectionId, CCConnection> = new Map();

  #parentComponentIdToConnectionIds = new MultiMap<
    CCComponentId,
    CCConnectionId
  >(Set);

  constructor(store: CCStore) {
    super();
    this.#store = store;
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

  unregister(id: CCConnectionId): void {
    const connection = this.#connections.get(id);
    if (!connection) throw new Error(`Connection ${id} not found`);
    this.#parentComponentIdToConnectionIds.remove(
      connection.parentComponentId,
      connection.id
    );
    this.#connections.delete(id);
    this.emit("didUnregister", connection);
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

  static create(partialConnection: Omit<CCConnection, "id">): CCConnection {
    return {
      id: crypto.randomUUID() as CCConnectionId,
      ...partialConnection,
    };
  }
}
