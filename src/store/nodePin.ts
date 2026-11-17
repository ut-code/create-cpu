import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import { CCObjectStoreBase, type CCObjectStoreEvents } from "./base";
import { analyzeComponentBitWidths, type ComponentBitWidths } from "./bitWidth";
import type { CCComponentId } from "./component";
import type { CCComponentPinId, CCNodePinBitWidthStatus } from "./componentPin";
import { IntrinsicComponentDefinition } from "./intrinsics/base";
import type { CCNodeId } from "./node";
import { CCRevisionCache } from "./revisionCache";
import type { CCObjectId } from "./types";

export type CCNodePinId = CCObjectId<"nodePins">;

export type CCNodePin = {
	id: CCNodePinId;
	nodeId: CCNodeId;
	componentPinId: CCComponentPinId;
	order: number;
	manualBitWidth: number | null;
};

export type CCNodePinStoreEvents = CCObjectStoreEvents<CCNodePin> & {
	didUpdate(pin: CCNodePin): void;
};
export const ccNodePinStoreChangeEventTypes: (keyof CCNodePinStoreEvents)[] = [
	"didRegister",
	"didUnregister",
	"didUpdate",
];

export class CCNodePinStore extends CCObjectStoreBase<
	"nodePins",
	CCNodePinStoreEvents
> {
	readonly references = {
		nodeId: "nodes",
		componentPinId: "componentPins",
	} as const;

	readonly #bitWidthsByComponent = new CCRevisionCache<
		CCComponentId,
		ComponentBitWidths
	>(this.store);

	/** components whose bit widths are being analyzed, to catch one containing itself */
	#componentsBeingAnalyzed: Set<CCComponentId> = new Set();

	import(nodePins: CCNodePin[]) {
		for (const nodePin of nodePins) {
			this.register(nodePin);
		}
	}

	mount() {
		this.store.nodes.on("didRegister", (node) => {
			const componentPins = this.store.componentPins.getManyByComponentId(
				node.componentId,
			);
			for (const componentPin of componentPins) {
				this.register(
					CCNodePinStore.create({
						nodeId: node.id,
						componentPinId: componentPin.id,
						order: 0,
					}),
				);
			}
		});
		this.store.nodes.on("willUnregister", (node) => {
			for (const pin of this.objects.values()) {
				if (pin.nodeId === node.id) {
					this.unregister(pin.id);
				}
			}
		});
		this.store.componentPins.on("didRegister", (componentPin) => {
			for (const node of this.store.nodes.getManyByComponentId(
				componentPin.componentId,
			)) {
				this.register(
					CCNodePinStore.create({
						nodeId: node.id,
						componentPinId: componentPin.id,
						order: 0,
					}),
				);
			}
		});
		this.store.componentPins.on("willUnregister", (componentPin) => {
			for (const pin of this.objects.values()) {
				if (pin.componentPinId === componentPin.id) {
					this.unregister(pin.id);
				}
			}
		});
	}

	/**
	 * Register a pin
	 * @param nodePin pin to be registered
	 */
	register(nodePin: CCNodePin): void {
		invariant(this.store.componentPins.get(nodePin.componentPinId));
		invariant(this.store.nodes.get(nodePin.nodeId));
		this.setObject(nodePin);
		this.emit("didRegister", nodePin);
	}

	/**
	 * Unregister a pin
	 * @param id id of a pin to be unregistered
	 */
	async unregister(id: CCNodePinId): Promise<void> {
		const nodePin = nullthrows(this.objects.get(id));
		await this.store.transactionManager.runInTransaction(() => {
			this.emit("willUnregister", nodePin);
			this.deleteObject(nodePin.id);
		});
		this.emit("didUnregister", nodePin);
	}

	update(id: CCNodePinId, value: Pick<CCNodePin, "manualBitWidth">) {
		const existingNodePin = nullthrows(this.objects.get(id));
		const newNodePin = { ...existingNodePin, ...value };
		this.setObject(newNodePin);
		this.emit("didUpdate", newNodePin);
	}

	/**
	 * Get all of pins by component id
	 * @param componentId id of component
	 * @returns pins of component
	 */
	getManyByNodeId(nodeId: CCNodeId): CCNodePin[] {
		return [...this.objects.values()].filter((pin) => pin.nodeId === nodeId);
	}

	getManyByNodeIdAndComponentPinId(
		nodeId: CCNodeId,
		componentPinId: CCComponentPinId,
	): CCNodePin[] {
		return [...this.objects.values()].filter(
			(pin) => pin.nodeId === nodeId && pin.componentPinId === componentPinId,
		);
	}

	/**
	 * The bit width groups of the pins of the nodes inside a user-defined component.
	 * They are cached until the revision of the store changes.
	 * @param componentId a user-defined component
	 */
	getComponentBitWidths(componentId: CCComponentId): ComponentBitWidths {
		return this.#bitWidthsByComponent.get(componentId, () => {
			invariant(
				!this.#componentsBeingAnalyzed.has(componentId),
				`Component ${componentId} contains itself`,
			);
			this.#componentsBeingAnalyzed.add(componentId);
			try {
				return analyzeComponentBitWidths(
					this.store,
					componentId,
					(childComponentId) => this.getComponentBitWidths(childComponentId),
				);
			} finally {
				this.#componentsBeingAnalyzed.delete(componentId);
			}
		});
	}

	#getBitWidthsAround(nodePinId: CCNodePinId): ComponentBitWidths {
		const nodePin = nullthrows(this.get(nodePinId));
		const node = nullthrows(this.store.nodes.get(nodePin.nodeId));
		return this.getComponentBitWidths(node.parentComponentId);
	}

	/**
	 * Get the bit width status of a node pin
	 * @param nodePinId id of the node pin
	 * @returns bit width status of the pin
	 */
	getNodePinBitWidthStatus(nodePinId: CCNodePinId): CCNodePinBitWidthStatus {
		return this.#getBitWidthsAround(nodePinId).getStatus(nodePinId);
	}

	/**
	 * Whether the pins tied to a node pin fix different bit widths, which leaves its
	 * connections unable to carry a value.
	 * @param nodePinId id of the node pin
	 */
	isInBitWidthConflict(nodePinId: CCNodePinId): boolean {
		return this.#getBitWidthsAround(nodePinId).isInConflict(nodePinId);
	}

	/**
	 * Check whether two node pins can be connected.
	 *
	 * Only the component the connection is drawn in is checked for a bit width
	 * conflict. A connection inside a component can still cause one in the components
	 * using it, e.g. by tying an input to an output whose widths differ outside. That is
	 * accepted, just like a config change inside a component that does the same: the
	 * conflicting connections are highlighted where they are, and the simulation refuses
	 * to run until they are fixed.
	 * @param a id of a pin
	 * @param b id of the other pin
	 * @param options.allowBitWidthConflict skip the bit width check, to copy a connection
	 *   as it is even when it is in conflict
	 */
	isConnectable(
		a: CCNodePinId,
		b: CCNodePinId,
		{ allowBitWidthConflict = false }: { allowBitWidthConflict?: boolean } = {},
	) {
		const aNodePin = this.get(a);
		const bNodePin = this.get(b);
		if (!aNodePin || !bNodePin) {
			throw new Error(`Node pin ${a} or ${b} does not exist in the store`);
		}
		const aComponentPin = this.store.componentPins.get(
			aNodePin?.componentPinId ?? null,
		);
		const bComponentPin = this.store.componentPins.get(
			bNodePin?.componentPinId ?? null,
		);
		if (!aComponentPin || !bComponentPin) {
			throw new Error(
				`Component pin ${aNodePin?.componentPinId} or ${bNodePin?.componentPinId} does not exist in the store`,
			);
		}
		if (aComponentPin.type === bComponentPin.type) {
			console.warn(
				`Cannot connect pins of the same type: ${aNodePin.id} and ${bNodePin.id}`,
			);
			return false;
		}
		const aNode = this.store.nodes.get(aNodePin.nodeId);
		const bNode = this.store.nodes.get(bNodePin.nodeId);
		if (!aNode || !bNode) {
			throw new Error(
				`Node ${aNodePin.nodeId} or ${bNodePin.nodeId} does not exist in the store`,
			);
		}
		if (aNode.id === bNode.id) {
			console.warn(
				`Cannot connect pins of the same node: ${aNodePin.id} and ${bNodePin.id}`,
			);
			return false;
		}
		if (aNode.parentComponentId !== bNode.parentComponentId) {
			console.warn(
				`Cannot connect pins of different components: ${aNodePin.id} and ${bNodePin.id}`,
			);
			return false;
		}
		const aConnections = this.store.connections.getConnectionsByNodePinId(
			aNodePin.id,
		);
		const bConnections = this.store.connections.getConnectionsByNodePinId(
			bNodePin.id,
		);
		if (aComponentPin.type === "input" && aConnections.length > 0) {
			console.warn(`Input pin already has a connection: ${aNodePin.id}`);
			return false;
		}
		if (bComponentPin.type === "input" && bConnections.length > 0) {
			console.warn(`Input pin already has a connection: ${bNodePin.id}`);
			return false;
		}
		if (!allowBitWidthConflict && !this.hasCompatibleBitWidths(a, b)) {
			console.warn(
				`Cannot connect pins with conflicting bit widths: ${aNodePin.id} and ${bNodePin.id}`,
			);
			return false;
		}
		return true;
	}

	/**
	 * Check whether two node pins of the same component can be connected without
	 * causing a bit width conflict. A pin whose bit width is not fixed yet adapts to the
	 * pin it is connected to, and so do the pins tied to it.
	 * @param a id of a pin
	 * @param b id of the other pin
	 * @returns whether the connection brings no new width into a conflict
	 * @see ComponentBitWidths.canTie
	 */
	hasCompatibleBitWidths(a: CCNodePinId, b: CCNodePinId): boolean {
		return this.#getBitWidthsAround(a).canTie(a, b);
	}

	/**
	 * Create a new pin
	 * @param partialPin pin without `id`
	 * @returns a new pin
	 */
	static create(
		partialPin: Omit<CCNodePin, "id" | "manualBitWidth"> &
			Partial<Pick<CCNodePin, "manualBitWidth">>,
	): CCNodePin {
		const attributes = IntrinsicComponentDefinition.getPinAttributesByPinId(
			partialPin.componentPinId,
		);
		return {
			...partialPin,
			id: crypto.randomUUID() as CCNodePinId,
			manualBitWidth:
				partialPin.manualBitWidth ??
				(attributes?.bitWidthPolicy.type === "configurable" ? 1 : null),
		};
	}
}
