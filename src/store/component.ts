import type { Opaque } from "type-fest";
import EventEmitter from "eventemitter3";
import invariant from "tiny-invariant";
import type CCStore from ".";

export type CCComponentId = Opaque<string, "CCComponentId">;

export type CCComponent = {
  readonly id: CCComponentId;
  readonly isIntrinsic: boolean;
  name: string;
};

export type CCComponentStoreEvents = {
  didRegister(component: CCComponent): void;
  willUnregister(component: CCComponent): void;
  didUnregister(component: CCComponent): void;
  didUpdate(component: CCComponent): void;
};

export class CCComponentStore extends EventEmitter<CCComponentStoreEvents> {
  #components: Map<CCComponentId, CCComponent> = new Map();

  readonly rootComponentId: CCComponentId;

  constructor(
    _: CCStore,
    rootComponent?: CCComponent,
    rootComponentId?: CCComponentId,
    components?: CCComponent[]
  ) {
    super();
    if (rootComponent) {
      this.rootComponentId = rootComponent.id;
      this.register(rootComponent);
    } else {
      invariant(rootComponentId && components);
      this.rootComponentId = rootComponentId;
      for (const component of components) {
        this.register(component);
      }
    }
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
    this.emit("willUnregister", component);
    this.#components.delete(id);
    this.emit("didUnregister", component);
  }

  get(id: CCComponentId): CCComponent | undefined {
    return this.#components.get(id);
  }

  getAll(): ReadonlyMap<CCComponentId, CCComponent> {
    return this.#components;
  }

  static create(
    partialComponent: Omit<CCComponent, "id" | "isIntrinsic">
  ): CCComponent {
    return {
      id: crypto.randomUUID() as CCComponentId,
      isIntrinsic: false,
      ...partialComponent,
    };
  }

  toArray(): CCComponent[] {
    return [...this.#components.values()];
  }
}

export function isIncluding(
  store: CCStore,
  componentId: CCComponentId,
  targetComponentId: CCComponentId
) {
  const component = store.components.get(componentId)!;
  if (component.isIntrinsic) return false;

  const checkedComponentIds = new Set<CCComponentId>();
  const dfs = (_componentId: CCComponentId): boolean => {
    const nodes = store.nodes.getNodeIdsByParentComponentId(_componentId);
    for (const nodeId of nodes) {
      const node = store.nodes.get(nodeId)!;
      if (!checkedComponentIds.has(node.componentId)) {
        if (node.componentId === targetComponentId) return true;
        if (isIncluding(store, node.componentId, targetComponentId))
          return true;
        checkedComponentIds.add(node.componentId);
      }
    }
    return false;
  };
  return dfs(componentId);
}
