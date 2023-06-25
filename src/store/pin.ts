import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import { MultiMap } from "mnemonist";
import type CCStore from ".";
import type { CCComponentId } from "./component";

export type CCPinId = Opaque<string, "CCPinId">;
export type CCPinType = "input" | "output";
export const ccPinTypes: CCPinType[] = ["input", "output"];

export type CCPin = {
  readonly id: CCPinId;
  readonly componentId: CCComponentId;
  name: string;
  type: CCPinType;
};

export type CCPinStoreEvents = {
  didRegister(Pin: CCPin): void;
  didUnregister(Pin: CCPin): void;
};

export class CCPinStore extends EventEmitter<CCPinStoreEvents> {
  #store: CCStore;

  #pins: Map<CCPinId, CCPin> = new Map();

  #componentIdToPinIds = new MultiMap<CCComponentId, CCPinId>(Set);

  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  register(pin: CCPin): void {
    invariant(this.#store.components.get(pin.componentId));
    this.#pins.set(pin.id, pin);
    this.#componentIdToPinIds.set(pin.componentId, pin.id);
    this.emit("didRegister", pin);
  }

  unregister(id: CCPinId): void {
    const pin = this.#pins.get(id);
    if (!pin) throw new Error(`Pin ${id} not found`);
    this.#componentIdToPinIds.remove(pin.componentId, pin.id);
    this.#pins.delete(id);
    this.emit("didUnregister", pin);
  }

  get(id: CCPinId): CCPin | undefined {
    return this.#pins.get(id);
  }

  getPinIdsByComponentId(componentId: CCComponentId): CCPinId[] {
    return [...(this.#componentIdToPinIds.get(componentId) ?? [])];
  }

  static create(partialPin: Omit<CCPin, "id">): CCPin {
    return {
      id: crypto.randomUUID() as CCPinId,
      ...partialPin,
    };
  }
}
