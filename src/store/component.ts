import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type CCStore from ".";
import { CCObjectStoreBase, type CCObjectStoreEvents } from "./base";
import type { CCIntrinsicComponentType } from "./intrinsics/types";
import type { CCObjectId } from "./types";

export type CCComponentId = CCObjectId<"components">;

export type CCComponent = {
	readonly id: CCComponentId;
	/** null for user-defined components */
	readonly intrinsicType: CCIntrinsicComponentType | null;
	name: string;
};

export type CCComponentStoreEvents = CCObjectStoreEvents<CCComponent> & {
	didUpdate(component: CCComponent): void;
};
export const ccComponentStoreChangeEventTypes: (keyof CCComponentStoreEvents)[] =
	["didRegister", "didUnregister", "didUpdate"];

/**
 * Store of components
 */
export class CCComponentStore extends CCObjectStoreBase<
	"components",
	CCComponentStoreEvents
> {
	readonly references = {} as const;

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
		invariant(!this.objects.has(component.id));
		this.setObject(component);
		this.emit("didRegister", component);
	}

	/**
	 * Unregister a component
	 * @param id id of a component to be unregistered
	 */
	async unregister(id: CCComponentId): Promise<void> {
		const component = this.objects.get(id);
		if (!component) throw new Error(`Component ${id} not found`);
		await this.store.transactionManager.runInTransaction(() => {
			this.emit("willUnregister", component);
			this.deleteObject(id);
		});
		this.emit("didUnregister", component);
	}

	/**
	 * Update the name of component
	 * @param id id of component
	 * @param value new name
	 */
	update(id: CCComponentId, value: Pick<CCComponent, "name">): void {
		const component = this.objects.get(id);
		invariant(component);
		const newComponent = { ...component, ...value };
		this.setObject(newComponent, { changesCircuit: false });
		this.emit("didUpdate", newComponent);
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

export function isEachInputPinConnected(
	store: CCStore,
	componentId: CCComponentId,
) {
	const component = nullthrows(store.components.get(componentId));
	if (component.intrinsicType) return true;
	const nodes = store.nodes.getManyByParentComponentId(componentId);
	for (const node of nodes) {
		const nodePins = store.nodePins.getManyByNodeId(node.id);
		for (const nodePin of nodePins) {
			const componentPin = nullthrows(
				store.componentPins.get(nodePin.componentPinId),
			);
			if (componentPin.type === "input") {
				const connectionsAssociatedWithNodePin =
					store.connections.getConnectionsByNodePinId(nodePin.id);
				if (connectionsAssociatedWithNodePin.length === 0) {
					return false;
				}
			}
		}
	}
	return true;
}
