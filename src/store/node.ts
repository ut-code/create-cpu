import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type { Vector2 } from "../common/vector2";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import { definitionByComponentId } from "./intrinsics/definitions";
import type { CCIntrinsicComponentSpec } from "./intrinsics/types";

export type CCNodeId = Opaque<string, "CCNodeId">;

export type CCNode<
	Spec extends CCIntrinsicComponentSpec = CCIntrinsicComponentSpec,
> = {
	readonly id: CCNodeId;
	readonly parentComponentId: CCComponentId;
	readonly componentId: CCComponentId;
	position: Vector2;
	config: Spec["config"];
};

export type CCNodeStoreEvents = {
	didRegister(node: CCNode): void;
	willUnregister(node: CCNode): void;
	didUnregister(node: CCNode): void;
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
export class CCNodeStore extends EventEmitter<CCNodeStoreEvents> {
	#store: CCStore;

	#nodes: Map<CCNodeId, CCNode> = new Map();

	/**
	 * Constructor of CCNodeStore
	 * @param store store
	 * @param nodes initial nodes
	 */
	constructor(store: CCStore) {
		super();
		this.#store = store;
	}

	import(nodes: CCNode[]): void {
		for (const node of nodes) {
			node.position = { x: node.position.x, y: node.position.y };
			this.register(node);
		}
	}

	mount() {
		this.#store.components.on("willUnregister", (component) => {
			const ids = [...this.#nodes.values()]
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
		invariant(this.#store.components.get(node.componentId));
		invariant(this.#store.components.get(node.parentComponentId));
		this.#nodes.set(node.id, node);
		this.emit("didRegister", node);
	}

	/**
	 * Unregister nodes
	 * @param ids ids of nodes to be unregistered
	 */
	async unregister(ids: CCNodeId[]): Promise<void> {
		const nodes = ids.map((id) => nullthrows(this.#nodes.get(id)));
		await this.#store.transactionManager.runInTransaction(() => {
			for (const node of nodes) {
				this.emit("willUnregister", node);
				this.#nodes.delete(node.id);
			}
		});
		for (const node of nodes) {
			this.emit("didUnregister", node);
		}
	}

	/**
	 * Get a node by id
	 * @param id id of node
	 * @returns node of `id`
	 */
	get(id: CCNodeId): CCNode | undefined {
		return this.#nodes.get(id);
	}

	/**
	 * Get all of nodes by parent component id
	 * @param parentComponentId id of parent component
	 * @returns nodes of parent component
	 * @deprecated in favor of {@link getManyByParentComponentId}
	 */
	getNodeIdsByParentComponentId(parentComponentId: CCComponentId): CCNodeId[] {
		return this.getManyByParentComponentId(parentComponentId).map(
			(node) => node.id,
		);
	}

	getManyByParentComponentId(parentComponentId: CCComponentId): CCNode[] {
		return [...this.#nodes.values()].filter(
			(node) => node.parentComponentId === parentComponentId,
		);
	}

	getManyByComponentId(componentId: CCComponentId): CCNode[] {
		return [...this.#nodes.values()].filter(
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
		const existingNode = nullthrows(this.#nodes.get(id));
		const newNode = { ...existingNode, ...value };
		this.#nodes.set(id, newNode);
		if ("config" in value && value.config !== existingNode.config) {
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

	/**
	 * Get array of nodes
	 * @returns array of nodes
	 */
	getMany(): CCNode[] {
		return [...this.#nodes.values()];
	}
}
