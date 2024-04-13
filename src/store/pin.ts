import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import nullthrows from "nullthrows";
import type CCStore from ".";
import { type CCComponentId } from "./component";
import type { CCNodeId } from "./node";

export type CCPin = {
  readonly id: CCPinId;
  readonly componentId: CCComponentId;
  readonly type: CCPinType;
  readonly implementation: CCPinImplementation;
  multiplexable: boolean;
  bits: number;
  name: string;
};

export type CCPinId = Opaque<string, "CCPinId">;
export type CCPinType = "input" | "output";
export const ccPinTypes: CCPinType[] = ["input", "output"];

export type CCPinImplementation =
  | CCPinUserImplementation
  | CCPinIntrinsicImplementation;

export type CCPinUserImplementation = {
  readonly type: "user";
  readonly nodeId: CCNodeId;
  readonly pinId: CCPinId;
};

export type CCPinIntrinsicImplementation = {
  readonly type: "intrinsic";
};

export type CCPinMultiplexability =
  | { isMultiplexable: true }
  | { isMultiplexable: false; multiplicity: number };

export type CCPinStoreEvents = {
  didRegister(pin: CCPin): void;
  willUnregister(pin: CCPin): void;
  didUnregister(pin: CCPin): void;
  didUpdate(pin: CCPin): void;
};

/**
 * Store of pins
 */
export class CCPinStore extends EventEmitter<CCPinStoreEvents> {
  #store: CCStore;

  #pins: Map<CCPinId, CCPin> = new Map();

  /**
   * Constructor of CCPinStore
   * @param store store
   * @param pins initial pins
   */
  constructor(store: CCStore, pins?: CCPin[]) {
    super();
    this.#store = store;
    if (pins) {
      for (const pin of pins) {
        this.register(pin);
      }
    }
    this.#store.components.on("willUnregister", (component) => {
      for (const pin of this.#pins.values()) {
        if (pin.componentId === component.id) {
          this.unregister(pin.id);
        }
      }
    });
    this.#store.nodes.on("didRegister", (node) => {
      const component = this.#store.components.get(node.componentId)!;
      const storePins = this.#store.pins
        .getPinIdsByComponentId(node.componentId)!
        .filter((pinId) => this.isInterfacePin(pinId));
      for (const implementationPinId of storePins) {
        const implementationPin = this.get(implementationPinId)!;
        this.register(
          CCPinStore.create({
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
    this.#store.nodes.on("willUnregister", (node) => {
      for (const pin of this.#pins.values()) {
        if (
          pin.implementation.type === "user" &&
          pin.implementation.nodeId === node.id
        ) {
          this.unregister(pin.id);
        }
      }
    });
    // TODO: create / remove pins when connections are created / removed
  }

  /**
   * Register a pin
   * @param pin pin to be registered
   */
  register(pin: CCPin): void {
    invariant(this.#store.components.get(pin.componentId));
    this.#pins.set(pin.id, pin);
    this.emit("didRegister", pin);
  }

  /**
   * Unregister a pin
   * @param id id of a pin to be unregistered
   */
  async unregister(id: CCPinId): Promise<void> {
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
  get(id: CCPinId): CCPin | undefined {
    return this.#pins.get(id);
  }

  /**
   * Get all of pins
   * @returns all pins
   */
  getByImplementationNodeIdAndPinId(nodeId: CCNodeId, pinId: CCPinId): CCPin {
    const pin = [...this.#pins.values()].find(
      ({ implementation }) =>
        implementation.type === "user" &&
        implementation.nodeId === nodeId &&
        implementation.pinId === pinId
    );
    invariant(pin);
    return pin;
  }

  /**
   * Get all of pins by component id
   * @param componentId id of component
   * @returns pins of component
   */
  getPinIdsByComponentId(componentId: CCComponentId): CCPinId[] {
    return [...this.#pins.values()]
      .filter((pin) => pin.componentId === componentId)
      .map((pin) => pin.id);
  }

  /**
   * Update name of pin
   * @param id id of a pin to be updated
   * @param value new name
   */
  update(id: CCPinId, value: Partial<Pick<CCPin, "name">>): void {
    const pin = this.#pins.get(id);
    invariant(pin);
    this.#pins.set(id, { ...pin, ...value });
    this.emit("didUpdate", pin);
  }

  /**
   * Get the multiplexability of a component pin
   * @param pinId id of pin
   * @returns multiplexability of the pin
   */
  getComponentPinMultiplexability(pinId: CCPinId): CCPinMultiplexability {
    // eslint-disable-next-line no-console
    console.log(this, pinId);
    // TODO: implement
    return { isMultiplexable: true };
  }

  /**
   * Get the multiplexability of a node pin
   * @param pinId id of pin
   * @param nodeId id of node
   * @returns multiplexability of the pin
   */
  getNodePinMultiplexability(
    pinId: CCPinId,
    nodeId: CCNodeId
  ): CCPinMultiplexability {
    // eslint-disable-next-line no-console
    console.log(this, pinId, nodeId);
    // TODO: implement
    return { isMultiplexable: true };
  }

  /**
   * Create a new pin
   * @param partialPin pin without `id`
   * @returns a new pin
   */
  static create(partialPin: Omit<CCPin, "id">): CCPin {
    return {
      id: crypto.randomUUID() as CCPinId,
      ...partialPin,
    };
  }

  /**
   * Get array of pins
   * @returns array of pins
   */
  toArray(): CCPin[] {
    return [...this.#pins.values()];
  }

  /**
   * Check if the pin is an interface pin
   * @param pinId id of pin
   * @returns if the pin is an interface pin, `true` returns (otherwise `false`)
   */
  isInterfacePin(pinId: CCPinId): boolean {
    const pin = this.#store.pins.get(pinId)!;
    return (
      pin.implementation.type === "intrinsic" ||
      (pin.implementation.type === "user" &&
        this.#store.connections.hasNoConnectionOf(
          pin.implementation.nodeId,
          pin.implementation.pinId
        ))
    );
  }
}
