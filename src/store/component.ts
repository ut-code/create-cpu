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

/**
 * Store of components
 */
export class CCComponentStore extends EventEmitter<CCComponentStoreEvents> {
  #store: CCStore;

  #components: Map<CCComponentId, CCComponent> = new Map();

  /**
   * Constructor of CCComponentStore
   * @param store store
   * @param rootComponent root component
   * @param rootComponentId id of root component
   * @param components initial components
   */
  constructor(store: CCStore) {
    super();
    this.#store = store;
  }

  import(components: CCComponent[]) {
    for (const component of components) {
      this.register(component);
    }
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  mount() {}

  /**
   * Register a component
   * @param component component to be registered
   */
  register(component: CCComponent): void {
    invariant(!this.#components.has(component.id));
    this.#components.set(component.id, component);
    this.emit("didRegister", component);
  }

  /**
   * Unregister a component
   * @param id id of a component to be unregistered
   */
  async unregister(id: CCComponentId): Promise<void> {
    const component = this.#components.get(id);
    if (!component) throw new Error(`Component ${id} not found`);
    await this.#store.transactionManager.runInTransaction(() => {
      this.emit("willUnregister", component);
      this.#components.delete(id);
    });
    this.emit("didUnregister", component);
  }

  /**
   * Get a component by CCComponentId
   * @param id id of component
   * @returns component of `id`
   */
  get(id: CCComponentId): CCComponent | undefined {
    return this.#components.get(id);
  }

  /**
   * Get all of components
   * @returns map of id and component (read only)
   */
  getAll(): ReadonlyMap<CCComponentId, CCComponent> {
    return this.#components;
  }

  /**
   * Update the name of component
   * @param id id of component
   * @param value new name
   */
  update(id: CCComponentId, value: Pick<CCComponent, "name">): void {
    const component = this.#components.get(id);
    invariant(component);
    this.#components.set(id, { ...component, ...value });
    this.emit("didUpdate", component);
  }

  /**
   * Create a new component
   * @param partialComponent component without `id` and `isIntrinsic`
   * @returns a new component
   */
  static create(
    partialComponent: Omit<CCComponent, "id" | "isIntrinsic">
  ): CCComponent {
    return {
      id: crypto.randomUUID() as CCComponentId,
      isIntrinsic: false,
      ...partialComponent,
    };
  }

  /**
   * Get array of components
   * @returns array of components
   */
  toArray(): CCComponent[] {
    return [...this.#components.values()];
  }
}

/**
 * Check if the component of `componentId` is including the component of `targetComponentId`
 * @param store store
 * @param componentId id of component (parent)
 * @param targetComponentId id of target component (child)
 * @returns if the component of `componentId` is including the component of `targetComponentId`, `true` returns (otherwise `false`)
 */
export function isIncluding(
  store: CCStore,
  componentId: CCComponentId,
  targetComponentId: CCComponentId
) {
  const component = store.components.get(componentId)!;
  if (component.isIntrinsic) return false;

  const checkedComponentIds = new Set<CCComponentId>();
  const dfs = (_componentId: CCComponentId): boolean => {
    const nodes = store.nodes.getManyByParentComponentId(_componentId);
    for (const node of nodes) {
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
