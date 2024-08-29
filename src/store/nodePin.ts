import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCNodeId } from "./node";
import type { CCComponentPinId, CCPinMultiplexability } from "./componentPin";
import type CCStore from ".";
import * as intrinsic from "./intrinsics";

export type CCNodePinId = Opaque<string, "CCNodePinId">;

export type CCNodePin = {
  id: CCNodePinId;
  nodeId: CCNodeId;
  componentPinId: CCComponentPinId;
};

export type CCNodePinStoreEvents = {
  didRegister(pin: CCNodePin): void;
  willUnregister(pin: CCNodePin): void;
  didUnregister(pin: CCNodePin): void;
};

export class CCNodePinStore extends EventEmitter<CCNodePinStoreEvents> {
  #store: CCStore;

  #nodePins: Map<CCNodePinId, CCNodePin> = new Map();

  #markedAsDeleted: Set<CCNodePinId> = new Set();

  /**
   * Constructor of CCNodePinStore
   * @param store store
   * @param nodePins initial pins
   */
  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  import(nodePins: CCNodePin[]) {
    for (const nodePin of nodePins) {
      this.register(nodePin);
    }
  }

  mount() {
    this.#store.nodes.on("didRegister", (node) => {
      const componentPins = this.#store.componentPins.getManyByComponentId(
        node.componentId
      );
      for (const componentPin of componentPins) {
        this.register(
          CCNodePinStore.create({
            nodeId: node.id,
            componentPinId: componentPin.id,
          })
        );
      }
    });
    this.#store.nodes.on("willUnregister", (node) => {
      for (const pin of this.#nodePins.values()) {
        if (pin.nodeId === node.id) {
          this.unregister(pin.id);
        }
      }
    });
    this.#store.componentPins.on("didRegister", (componentPin) => {
      for (const node of this.#store.nodes.getManyByComponentId(
        componentPin.componentId
      )) {
        this.register(
          CCNodePinStore.create({
            nodeId: node.id,
            componentPinId: componentPin.id,
          })
        );
      }
    });
    this.#store.componentPins.on("willUnregister", (componentPin) => {
      for (const pin of this.#nodePins.values()) {
        if (pin.componentPinId === componentPin.id) {
          this.unregister(pin.id);
        }
      }
    });
  }

  /**
   * Register a pin
   * @param nodePin pin to be registered
   */
  register(nodePin: CCNodePin): void {
    invariant(this.#store.componentPins.get(nodePin.componentPinId));
    invariant(this.#store.nodes.get(nodePin.nodeId));
    this.#nodePins.set(nodePin.id, nodePin);
    this.emit("didRegister", nodePin);
  }

  /**
   * Unregister a pin
   * @param id id of a pin to be unregistered
   */
  async unregister(id: CCNodePinId): Promise<void> {
    const nodePin = nullthrows(this.#nodePins.get(id));
    this.#markedAsDeleted.add(id);
    await this.#store.transactionManager.runInTransaction(() => {
      this.emit("willUnregister", nodePin);
      this.#nodePins.delete(nodePin.id);
    });
    this.emit("didUnregister", nodePin);
    this.#markedAsDeleted.delete(id);
  }

  /**
   * Get a pin by id
   * @param id id of pin
   * @returns pin of `id`
   */
  get(id: CCNodePinId): CCNodePin | undefined {
    return this.#nodePins.get(id);
  }

  /**
   * Get all of pins
   * @returns all pins
   */
  getByImplementationNodeIdAndPinId(
    nodeId: CCNodeId,
    componentPinId: CCComponentPinId
  ): CCNodePin {
    const pin = [...this.#nodePins.values()].find(
      (candidate) =>
        candidate.nodeId === nodeId &&
        candidate.componentPinId === componentPinId
    );
    invariant(pin);
    return pin;
  }

  /**
   * Get all of pins by component id
   * @param componentId id of component
   * @returns pins of component
   */
  getManyByNodeId(nodeId: CCNodeId): CCNodePin[] {
    return [...this.#nodePins.values()].filter((pin) => pin.nodeId === nodeId);
  }

  /**
   * Get the multiplexability of a node pin
   * @param pinId id of pin
   * @param nodeId id of node
   * @returns multiplexability of the pin
   */
  getNodePinMultiplexability(nodePinId: CCNodePinId): CCPinMultiplexability {
    const traverseNodePinMultiplexability = (
      nodePinId_: CCNodePinId,
      seen: Set<CCNodeId>
    ): CCPinMultiplexability => {
      const { nodeId, componentPinId: pinId } = this.get(nodePinId_)!;
      seen.add(nodeId);
      const node = this.#store.nodes.get(nodeId)!;
      const nodePins = this.getManyByNodeId(node.id);
      const givenPinMultiplexability =
        this.#store.componentPins.getComponentPinMultiplexability(pinId);
      if (givenPinMultiplexability === "undecidable") {
        if (pinId === intrinsic.fourBitsIntrinsicComponentOutputPin.id) {
          return { isMultiplexable: false, multiplicity: nodePins.length - 1 };
        }
        if (
          pinId === intrinsic.distributeFourBitsIntrinsicComponentInputPin.id
        ) {
          return { isMultiplexable: false, multiplicity: nodePins.length - 1 };
        }
        throw new Error("unreachable");
      }
      if (!givenPinMultiplexability.isMultiplexable) {
        return givenPinMultiplexability;
      }
      // eslint-disable-next-line
      for (const nodePin of nodePins) {
        const pinMultiplexability =
          this.#store.componentPins.getComponentPinMultiplexability(
            nodePin.componentPinId
          );
        if (pinMultiplexability === "undecidable") {
          throw new Error("unreachable");
        }
        if (pinMultiplexability.isMultiplexable) {
          const connections =
            this.#store.connections.getConnectionsByNodePinId(nodePinId)!;
          for (const connection of connections) {
            const componentPin = this.#store.componentPins.get(
              nodePin.componentPinId
            )!;
            const connectedNodePinId =
              componentPin.type === "input" ? connection.from : connection.to;
            const connectedNodePin = this.get(connectedNodePinId)!;
            if (seen.has(connectedNodePin.nodeId)) {
              // eslint-disable-next-line no-continue
              continue;
            }
            const connectedPinMultiplexability =
              traverseNodePinMultiplexability(connectedNodePinId, seen);
            if (!connectedPinMultiplexability.isMultiplexable) {
              return connectedPinMultiplexability;
            }
          }
        }
      }
      return givenPinMultiplexability;
    };
    return traverseNodePinMultiplexability(nodePinId, new Set());
  }

  isMarkedAsDeleted(id: CCNodePinId) {
    return this.#markedAsDeleted.has(id);
  }

  /**
   * Create a new pin
   * @param partialPin pin without `id`
   * @returns a new pin
   */
  static create(partialPin: Omit<CCNodePin, "id">): CCNodePin {
    return {
      id: crypto.randomUUID() as CCNodePinId,
      ...partialPin,
    };
  }

  /**
   * Get array of pins
   * @returns array of pins
   */
  toArray(): CCNodePin[] {
    return [...this.#nodePins.values()];
  }
}
