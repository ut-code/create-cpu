import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import type CCStore from ".";
import { type CCComponentId } from "./component";

export type CCPinId = Opaque<string, "CCPinId">;
export type CCPinType = "input" | "output";
export const ccPinTypes: CCPinType[] = ["input", "output"];

export type CCPin = {
  readonly id: CCPinId;
  readonly componentId: CCComponentId;
  readonly type: CCPinType;
  name: string;
};

export type CCPinStoreEvents = {
  didRegister(Pin: CCPin): void;
  didUnregister(Pin: CCPin): void;
};

export class CCPinStore extends EventEmitter<CCPinStoreEvents> {
  #store: CCStore;

  #pins: Map<CCPinId, CCPin> = new Map();

  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  register(pin: CCPin): void {
    invariant(this.#store.components.get(pin.componentId));
    this.#pins.set(pin.id, pin);
    this.emit("didRegister", pin);
  }

  unregister(id: CCPinId): void {
    const pin = this.#pins.get(id);
    if (!pin) throw new Error(`Pin ${id} not found`);
    this.#pins.delete(id);
    this.emit("didUnregister", pin);
  }

  get(id: CCPinId): CCPin | undefined {
    return this.#pins.get(id);
  }

  getPinIdsByComponentId(componentId: CCComponentId): CCPinId[] {
    return [...this.#pins.values()]
      .filter((pin) => pin.componentId === componentId)
      .map((pin) => pin.id);
  }

  static create(partialPin: Omit<CCPin, "id">): CCPin {
    return {
      id: crypto.randomUUID() as CCPinId,
      ...partialPin,
    };
  }
}
