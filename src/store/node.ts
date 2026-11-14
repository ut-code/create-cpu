import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Vector2 } from "../common/vector2";
import { CCObjectStoreBase, type CCObjectStoreEvents } from "./base";
import type { CCComponentId } from "./component";
import { definitionByComponentId } from "./intrinsics/definitions";
import type { CCIntrinsicComponentSpec } from "./intrinsics/types";
import type { CCObjectId } from "./types";

export type CCNodeId = CCObjectId<"nodes">;

export type CCNode<
	Spec extends CCIntrinsicComponentSpec = CCIntrinsicComponentSpec,
> = {
	readonly id: CCNodeId;
	readonly parentComponentId: CCComponentId;
	readonly componentId: CCComponentId;
	position: Vector2;
	config: Spec["config"];
};

export type CCNodeStoreEvents = CCObjectStoreEvents<CCNode> & {
	didUpdate(node: CCNode): void;
	/**
	 * Emitted in addition to `didUpdate` when the config of a node changed, so that
	 * listeners depending on the config are not woken up by frequent position updates.
	 */
	didUpdateConfig(node: CCNode): void;
};
export const ccNodeStoreChangeEventTypes: (keyof CCNodeStoreEvents)[] = [
	"didRegister",
	"didUnregister",
	"didUpdate",
];

/**
 * Store of nodes
 */
export class CCNodeStore extends CCObjectStoreBase<"nodes", CCNodeStoreEvents> {
	readonly references = {
		parentComponentId: "components",
		componentId: "components",
	} as const;

	import(nodes: CCNode[]): void {
		for (const node of nodes) {
			node.position = { x: node.position.x, y: node.position.y };
			this.register(node);
		}
	}

	mount() {
		this.store.components.on("willUnregister", (component) => {
			const ids = [...this.objects.values()]
				.filter(
					(node) =>
						node.parentComponentId === component.id ||
						node.componentId === component.id,
				)
				.map((node) => node.id);
			if (ids.length > 0) {
				this.unregister(ids);
			}
		});
	}

	/**
	 * Register a node
	 * @param node node to be registered
	 */
	register(node: CCNode): void {
		invariant(this.store.components.get(node.componentId));
		invariant(this.store.components.get(node.parentComponentId));
		this.setObject(node);
		this.emit("didRegister", node);
	}

	/**
	 * Unregister nodes
	 * @param ids ids of nodes to be unregistered
	 */
	async unregister(ids: CCNodeId[]): Promise<void> {
		const nodes = ids.map((id) => nullthrows(this.objects.get(id)));
		await this.store.transactionManager.runInTransaction(() => {
			for (const node of nodes) {
				this.emit("willUnregister", node);
				this.deleteObject(node.id);
			}
		});
		for (const node of nodes) {
			this.emit("didUnregister", node);
		}
	}

	getManyByParentComponentId(parentComponentId: CCComponentId): CCNode[] {
		return [...this.objects.values()].filter(
			(node) => node.parentComponentId === parentComponentId,
		);
	}

	getManyByComponentId(componentId: CCComponentId): CCNode[] {
		return [...this.objects.values()].filter(
			(node) => node.componentId === componentId,
		);
	}

	/**
	 * Update position of node
	 * @param id id of node
	 * @param value new position
	 */
	update(
		id: CCNodeId,
		value: Partial<Pick<CCNode, "position" | "config">>,
	): void {
		const existingNode = nullthrows(this.objects.get(id));
		const newNode = { ...existingNode, ...value };
		const changesConfig =
			"config" in value && value.config !== existingNode.config;
		this.setObject(newNode, { changesCircuit: changesConfig });
		if (changesConfig) {
			this.emit("didUpdateConfig", newNode);
		}
		this.emit("didUpdate", newNode);
	}

	/**
	 * Create node
	 * @param partialNode node without `id`
	 * @returns new node
	 */
	static create(partialNode: Omit<CCNode, "id" | "config">): CCNode {
		const definition = definitionByComponentId.get(partialNode.componentId);
		return {
			id: crypto.randomUUID() as CCNodeId,
			config: definition ? definition.initialConfig : null,
			...partialNode,
		};
	}
}
