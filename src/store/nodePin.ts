import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import type { CCNodeId } from "./node";
import type {
  CCComponentPinId,
  CCPinMultiplexability,
  CCPinStoreEvents,
} from "./componentPin";
import type CCStore from ".";

export type CCNodePin = {
  id: CCNodePinId;
  nodeId: CCNodeId;
  componentPinId: CCComponentPinId;
};

export type CCNodePinId = Opaque<string, "CCNodePinId">;

export class CCNodePinStore extends EventEmitter<CCPinStoreEvents> {
  #store: CCStore;

  #pins: Map<CCNodePinId, CCNodePin> = new Map();

  /**
   * Constructor of CCNodePinStore
   * @param store store
   * @param pins initial pins
   */
  constructor(store: CCStore, pins?: CCNodePin[]) {
    super();
    this.#store = store;
    if (pins) {
      for (const pin of pins) {
        this.register(pin);
      }
    }
    this.#store.nodes.on("willUnregister", (node) => {
      for (const pin of this.#pins.values()) {
        if (pin.nodeId === node.id) {
          this.unregister(pin.id);
        }
      }
    });
    this.#store.nodes.on("didRegister", (node) => {
      const component = this.#store.components.get(node.componentId)!;
      const storePins = this.#store.componentPins.getPinIdsByComponentId(
        node.componentId
      )!;
      // .filter((pinId) => this.isInterfacePin(pinId));
      for (const implementationPinId of storePins) {
        const implementationPin = this.get(implementationPinId)!;
        this.register(
          CCNodePinStore.create({
            name: `${component.name} ${implementationPin.name}`,
            componentId: node.parentComponentId,
            type: implementationPin.type,
            implementation: {
              type: "user",
              nodeId: node.id,
              pinId: implementationPin.id,
            },
            multiplexable: implementationPin.multiplexable,
            bits: implementationPin.bits,
          })
        );
      }
    });
    // this.#store.nodes.on("willUnregister", (node) => {
    //   for (const pin of this.#pins.values()) {
    //     if (
    //       pin.implementation.type === "user" &&
    //       pin.implementation.nodeId === node.id
    //     ) {
    //       this.unregister(pin.id);
    //     }
    //   }
    // });
    // TODO: create / remove pins when connections are created / removed
  }

  /**
   * Register a pin
   * @param pin pin to be registered
   */
  register(pin: CCNodePin): void {
    // invariant(this.#store.components.get(pin.componentId));
    // this.#pins.set(pin.id, pin);
    // this.emit("didRegister", pin);
  }

  /**
   * Unregister a pin
   * @param id id of a pin to be unregistered
   */
  async unregister(id: CCNodePinId): Promise<void> {
    const pin = nullthrows(this.#pins.get(id));
    await this.#store.transactionManager.runInTransaction(() => {
      this.emit("willUnregister", pin);
      this.#pins.delete(id);
    });
    this.emit("didUnregister", pin);
  }

  /**
   * Get a pin by id
   * @param id id of pin
   * @returns pin of `id`
   */
  get(id: CCNodePinId): CCNodePin | undefined {
    return this.#pins.get(id);
  }

  /**
   * Get all of pins
   * @returns all pins
   */
  getByImplementationNodeIdAndPinId(
    nodeId: CCNodeId,
    componentPinId: CCComponentPinId
  ): CCNodePin {
    const pin = [...this.#pins.values()].find(
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
    return [...this.#pins.values()].filter((pin) => pin.nodeId === nodeId);
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
      if (!givenPinMultiplexability.isMultiplexable) {
        return givenPinMultiplexability;
      }
      // eslint-disable-next-line
      for (const nodePin of nodePins) {
        const pinMultiplexability =
          this.#store.componentPins.getComponentPinMultiplexability(
            nodePin.componentPinId
          );
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
    return [...this.#pins.values()];
  }
}
