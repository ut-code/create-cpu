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

export class CCPinStore extends EventEmitter<CCPinStoreEvents> {
  #store: CCStore;

  #pins: Map<CCPinId, CCPin> = new Map();

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

  register(pin: CCPin): void {
    invariant(this.#store.components.get(pin.componentId));
    this.#pins.set(pin.id, pin);
    this.emit("didRegister", pin);
  }

  async unregister(id: CCPinId): Promise<void> {
    const pin = nullthrows(this.#pins.get(id));
    await this.#store.transactionManager.runInTransaction(() => {
      this.emit("willUnregister", pin);
      this.#pins.delete(id);
    });
    this.emit("didUnregister", pin);
  }

  get(id: CCPinId): CCPin | undefined {
    return this.#pins.get(id);
  }

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

  getPinIdsByComponentId(componentId: CCComponentId): CCPinId[] {
    return [...this.#pins.values()]
      .filter((pin) => pin.componentId === componentId)
      .map((pin) => pin.id);
  }

  update(id: CCPinId, value: Partial<Pick<CCPin, "name">>): void {
    const pin = this.#pins.get(id);
    invariant(pin);
    this.#pins.set(id, { ...pin, ...value });
    this.emit("didUpdate", pin);
  }

  getComponentPinMultiplexability(pinId: CCPinId): CCPinMultiplexability {
    // eslint-disable-next-line no-console
    console.log(this, pinId);
    // TODO: implement
    return { isMultiplexable: true };
  }

  getNodePinMultiplexability(
    pinId: CCPinId,
    nodeId: CCNodeId
  ): CCPinMultiplexability {
    // eslint-disable-next-line no-console
    console.log(this, pinId, nodeId);
    // TODO: implement
    return { isMultiplexable: true };
  }

  static create(partialPin: Omit<CCPin, "id">): CCPin {
    return {
      id: crypto.randomUUID() as CCPinId,
      ...partialPin,
    };
  }

  toArray(): CCPin[] {
    return [...this.#pins.values()];
  }

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
