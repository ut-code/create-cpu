import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import type CCStore from ".";

export type CCComponentId = Opaque<string, "CCComponentId">;

export type CCComponent = {
  readonly id: CCComponentId;
  name: string;
};

export type CCComponentStoreEvents = {
  didRegister(component: CCComponent): void;
  didUnregister(component: CCComponent): void;
};

export class CCComponentStore extends EventEmitter<CCComponentStoreEvents> {
  #store: CCStore;

  #components: Map<CCComponentId, CCComponent> = new Map();

  readonly rootComponentId: CCComponentId;

  constructor(store: CCStore, rootComponent: CCComponent) {
    super();
    this.rootComponentId = rootComponent.id;
    this.register(rootComponent);
    this.#store = store;
    // eslint-disable-next-line no-unused-expressions
    this.#store;
  }

  register(component: CCComponent): void {
    invariant(!this.#components.has(component.id));
    this.#components.set(component.id, component);
    this.emit("didRegister", component);
  }

  unregister(id: CCComponentId): void {
    invariant(id !== this.rootComponentId);
    const component = this.#components.get(id);
    if (!component) throw new Error(`Component ${id} not found`);
    this.#components.delete(id);
    this.emit("didUnregister", component);
  }

  get(id: CCComponentId): CCComponent | undefined {
    return this.#components.get(id);
  }

  static create(partialComponent: Omit<CCComponent, "id">): CCComponent {
    return {
      id: crypto.randomUUID() as CCComponentId,
      ...partialComponent,
    };
  }
}
