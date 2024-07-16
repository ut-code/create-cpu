import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import nullthrows from "nullthrows";
import type CCStore from ".";
import { type CCComponentId } from "./component";
import * as intrinsic from "./intrinsics";
import type { CCNodePinId } from "./nodePin";

export type CCComponentPin = {
  readonly id: CCComponentPinId;
  readonly componentId: CCComponentId;
  readonly type: CCPinType;
  readonly implementation: CCPinImplementation;
  /** @deprecated should only be defined for intrinsic components  */
  multiplexable: boolean;
  /** @deprecated should only be defined for intrinsic components  */
  bits: number;
  name: string;
};

export type CCComponentPinId = Opaque<string, "CCPinId">;
export type CCPinType = "input" | "output";
export const ccPinTypes: CCPinType[] = ["input", "output"];

/** null for intrinsic components */
export type CCPinImplementation = CCNodePinId | null;
// | CCPinUserImplementation
// | CCPinIntrinsicImplementation;

// export type CCPinUserImplementation = {
//   readonly type: "user";
//   readonly nodeId: CCNodeId;
//   readonly pinId: CCComponentPinId;
// };

// export type CCPinIntrinsicImplementation = {
//   readonly type: "intrinsic";
// };

export type CCPinMultiplexability =
  | { isMultiplexable: true }
  | { isMultiplexable: false; multiplicity: number };

export type CCComponentPinStoreEvents = {
  didRegister(pin: CCComponentPin): void;
  willUnregister(pin: CCComponentPin): void;
  didUnregister(pin: CCComponentPin): void;
  didUpdate(pin: CCComponentPin): void;
};

/**
 * Store of pins
 */
export class CCComponentPinStore extends EventEmitter<CCComponentPinStoreEvents> {
  #store: CCStore;

  #pins: Map<CCComponentPinId, CCComponentPin> = new Map();

  /**
   * Constructor of CCComponentPinStore
   * @param store store
   * @param pins initial pins
   */
  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  import(componentPins: CCComponentPin[]): void {
    for (const pin of componentPins) {
      this.#pins.set(pin.id, pin);
    }
  }

  mount() {
    this.#store.nodePins.on("didRegister", (nodePin) => {
      this.register(this.createForNodePin(nodePin.id));
    });
    this.#store.nodePins.on("willUnregister", (nodePin) => {
      const pin = this.getByImplementation(nodePin.id);
      if (pin) this.unregister(pin.id);
    });
    this.#store.connections.on("didRegister", (connection) => {
      const { from, to } = connection;
      const fromComponentPin = this.getByImplementation(from);
      if (fromComponentPin) this.unregister(fromComponentPin.id);
      const toComponentPin = this.getByImplementation(to);
      if (toComponentPin) this.unregister(toComponentPin.id);
    });
    this.#store.connections.on("willUnregister", (connection) => {
      if (
        !this.#store.nodePins.isMarkedAsDeleted(connection.to) &&
        this.#store.nodePins.get(connection.to)
      ) {
        this.register(this.createForNodePin(connection.to));
      }
      // output pins can have multiple connections
      // so we need to check if the connection is the last one
      if (
        this.#store.connections.getConnectionsByNodePinId(connection.from)
          .length === 1
      ) {
        if (
          !this.#store.nodePins.isMarkedAsDeleted(connection.from) &&
          this.#store.nodePins.get(connection.from)
        ) {
          this.register(this.createForNodePin(connection.from));
        }
      }
    });
  }

  /**
   * Register a pin
   * @param pin pin to be registered
   */
  register(pin: CCComponentPin): void {
    invariant(this.#store.components.get(pin.componentId));
    this.#pins.set(pin.id, pin);
    this.emit("didRegister", pin);
  }

  createForNodePin(nodePinId: CCNodePinId): CCComponentPin {
    const targetNodePin = this.#store.nodePins.get(nodePinId)!;
    const targetComponentPin = this.#store.componentPins.get(
      targetNodePin.componentPinId
    )!;
    const targetNode = this.#store.nodes.get(targetNodePin.nodeId)!;
    return CCComponentPinStore.create({
      type: targetComponentPin.type,
      componentId: targetNode.parentComponentId,
      name: targetComponentPin.name,
      implementation: targetNodePin.id,
      multiplexable: false, // dummy
      bits: 1, // dummy
    });
  }

  /**
   * Unregister a pin
   * @param id id of a pin to be unregistered
   */
  async unregister(id: CCComponentPinId): Promise<void> {
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
  get(id: CCComponentPinId): CCComponentPin | undefined {
    return this.#pins.get(id);
  }

  /**
   * Get all of pins
   * @returns all pins
   */
  getByNodePinId(nodePinId: CCNodePinId): CCComponentPin {
    const pin = [...this.#pins.values()].find(
      ({ implementation }) => implementation && implementation === nodePinId
    );
    invariant(pin);
    return pin;
  }

  /**
   * Get all of pins by component id
   * @param componentId id of component
   * @returns pins of component
   * @deprecated in favor of {@link getManyByComponentId}
   */
  getPinIdsByComponentId(componentId: CCComponentId): CCComponentPinId[] {
    return this.getManyByComponentId(componentId).map((pin) => pin.id);
  }

  /**
   * Get all of pins by component id
   * @param componentId id of component
   * @returns pins of component
   */
  getManyByComponentId(componentId: CCComponentId): CCComponentPin[] {
    return [...this.#pins.values()].filter(
      (pin) => pin.componentId === componentId
    );
  }

  getByImplementation(implementation: CCNodePinId): CCComponentPin | null {
    return (
      [...this.#pins.values()].find(
        (pin) => pin.implementation === implementation
      ) ?? null
    );
  }

  /**
   * Update name of pin
   * @param id id of a pin to be updated
   * @param value new name
   */
  update(
    id: CCComponentPinId,
    value: Partial<Pick<CCComponentPin, "name">>
  ): void {
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
  getComponentPinMultiplexability(
    pinId: CCComponentPinId
  ): CCPinMultiplexability {
    const pin = this.#pins.get(pinId);
    invariant(pin);
    switch (pin.id) {
      case intrinsic.andIntrinsicComponentInputPinA.id:
      case intrinsic.andIntrinsicComponentInputPinB.id:
      case intrinsic.andIntrinsicComponentOutputPin.id:
      case intrinsic.orIntrinsicComponentInputPinA.id:
      case intrinsic.orIntrinsicComponentInputPinB.id:
      case intrinsic.orIntrinsicComponentOutputPin.id:
      case intrinsic.notIntrinsicComponentInputPin.id:
      case intrinsic.notIntrinsicComponentOutputPin.id:
      case intrinsic.xorIntrinsicComponentInputPinA.id:
      case intrinsic.xorIntrinsicComponentInputPinB.id:
      case intrinsic.xorIntrinsicComponentOutputPin.id:
      case intrinsic.inputIntrinsicComponentInputPin.id:
      case intrinsic.inputIntrinsicComponentOutputPin.id:
      case intrinsic.flipFlopIntrinsicComponentInputPin.id:
      case intrinsic.flipFlopIntrinsicComponentOutputPin.id: {
        return { isMultiplexable: true };
      }
      case intrinsic.fourBitsIntrinsicComponentInputPin0.id:
      case intrinsic.fourBitsIntrinsicComponentInputPin1.id:
      case intrinsic.fourBitsIntrinsicComponentInputPin2.id:
      case intrinsic.fourBitsIntrinsicComponentInputPin3.id: {
        return { isMultiplexable: false, multiplicity: 1 };
      }
      case intrinsic.fourBitsIntrinsicComponentOutputPin.id: {
        return { isMultiplexable: false, multiplicity: 4 };
      }
      case intrinsic.distributeFourBitsIntrinsicComponentInputPin.id: {
        return { isMultiplexable: false, multiplicity: 4 };
      }
      case intrinsic.distributeFourBitsIntrinsicComponentOutputPin0.id:
      case intrinsic.distributeFourBitsIntrinsicComponentOutputPin1.id:
      case intrinsic.distributeFourBitsIntrinsicComponentOutputPin2.id:
      case intrinsic.distributeFourBitsIntrinsicComponentOutputPin3.id: {
        return { isMultiplexable: false, multiplicity: 1 };
      }
      default: {
        if (pin.implementation === null) {
          throw new Error("unreachable");
        }
        return this.#store.nodePins.getNodePinMultiplexability(
          pin.implementation
        );
      }
    }
  }

  /**
   * Create a new pin
   * @param partialPin pin without `id`
   * @returns a new pin
   */
  static create(partialPin: Omit<CCComponentPin, "id">): CCComponentPin {
    return {
      id: crypto.randomUUID() as CCComponentPinId,
      ...partialPin,
    };
  }

  /**
   * Get array of pins
   * @returns array of pins
   */
  toArray(): CCComponentPin[] {
    return [...this.#pins.values()];
  }

  /**
   * Check if the pin is an interface pin
   * @param pinId id of pin
   * @returns if the pin is an interface pin, `true` returns (otherwise `false`)
   */
  isInterfacePin(pinId: CCComponentPinId): boolean {
    const pin = this.#store.componentPins.get(pinId)!;
    return (
      !pin.implementation ||
      this.#store.connections.hasNoConnectionOf(pin.implementation)
    );
  }
}
