import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCIntrinsicComponentType } from "./intrinsics/types";

export type CCComponentId = Opaque<string, "CCComponentId">;

export type CCComponent = {
	readonly id: CCComponentId;
	/** null for user-defined components */
	readonly intrinsicType: CCIntrinsicComponentType | null;
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
		partialComponent: Omit<CCComponent, "id" | "intrinsicType">,
	): CCComponent {
		return {
			id: crypto.randomUUID() as CCComponentId,
			intrinsicType: null,
			...partialComponent,
		};
	}

	/**
	 * Get array of components
	 * @returns array of components
	 */
	getMany(): CCComponent[] {
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
	targetComponentId: CCComponentId,
) {
	const component = nullthrows(store.components.get(componentId));
	if (component.intrinsicType) return false;

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

function validateComponent(store: CCStore, componentId: CCComponentId) {
	const component = nullthrows(store.components.get(componentId));
	if (component.intrinsicType) return;

	const nodes = store.nodes.getManyByParentComponentId(componentId);
	const connections = store.connections.getManyByParentComponentId(componentId);
	const parentComponentPins =
		store.componentPins.getManyByComponentId(componentId);

	// check nodePins and componentPins of each node
	for (const node of nodes) {
		const nodePins = new Set(store.nodePins.getManyByNodeId(node.id));
		const componentPinIds = new Set(
			store.componentPins
				.getManyByComponentId(node.componentId)
				.map((pin) => pin.id),
		);
		invariant(componentPinIds.size === nodePins.size);
		for (const nodePin of nodePins) {
			invariant(componentPinIds.has(nodePin.componentPinId));

			// check whether each nodePin without connections corresponds to a parentComponentPin
			// and nodePin with connections corresponds to no parentComponentPin
			const connectionsAssociatedWithNodePin =
				store.connections.getConnectionsByNodePinId(nodePin.id);
			const parentComponentPin = parentComponentPins.find(
				(pin) => pin.implementation === nodePin.id,
			);
			if (connectionsAssociatedWithNodePin.length === 0) {
				invariant(parentComponentPin);
			} else {
				invariant(!parentComponentPin);
			}
		}
	}

	// check whether each connection has valid nodePins and componentPins
	for (const connection of connections) {
		const fromNodePin = store.nodePins.get(connection.from);
		const toNodePin = store.nodePins.get(connection.to);
		invariant(fromNodePin && toNodePin);
		invariant(fromNodePin.nodeId !== toNodePin.nodeId);
		const fromComponentPin = store.componentPins.get(
			fromNodePin.componentPinId,
		);
		const toComponentPin = store.componentPins.get(toNodePin.componentPinId);
		invariant(fromComponentPin && toComponentPin);
		invariant(fromComponentPin.type !== toComponentPin.type);
	}

	// check whether implementation of each componentPin has no connections
	for (const componentPin of parentComponentPins) {
		invariant(componentPin.implementation);
		const implementationNodePin = store.nodePins.get(
			componentPin.implementation,
		);
		invariant(implementationNodePin);
		const connectionsAssociatedWithNodePin =
			store.connections.getConnectionsByNodePinId(implementationNodePin.id);
		invariant(connectionsAssociatedWithNodePin.length === 0);
	}
}

export function validateAllComponents(store: CCStore) {
	for (const component of store.components.getMany()) {
		validateComponent(store, component.id);
	}
}
