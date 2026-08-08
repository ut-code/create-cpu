import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentPinId, CCNodePinBitWidthStatus } from "./componentPin";
import { IntrinsicComponentDefinition } from "./intrinsics/base";
import type { CCNodeId } from "./node";

export type CCNodePinId = Opaque<string, "CCNodePinId">;

export type CCNodePin = {
	id: CCNodePinId;
	nodeId: CCNodeId;
	componentPinId: CCComponentPinId;
	order: number;
	manualBitWidth: number | null;
};

export type CCNodePinStoreEvents = {
	didRegister(pin: CCNodePin): void;
	willUnregister(pin: CCNodePin): void;
	didUnregister(pin: CCNodePin): void;
	didUpdate(pin: CCNodePin): void;
};
export const ccNodePinStoreChangeEventTypes: (keyof CCNodePinStoreEvents)[] = [
	"didRegister",
	"didUnregister",
	"didUpdate",
];

export class CCNodePinStore extends EventEmitter<CCNodePinStoreEvents> {
	#store: CCStore;

	#nodePins: Map<CCNodePinId, CCNodePin> = new Map();

	#markedAsDeleted: Set<CCNodePinId> = new Set();

	#bitWidthCache: Map<CCNodePinId, CCNodePinBitWidthStatus> = new Map();

	#clearBitWidthCache(): void {
		this.#bitWidthCache.clear();
	}

	/**
	 * Constructor of CCNodePinStore
	 * @param store store
	 * @param nodePins initial pins
	 */
	constructor(store: CCStore) {
		super();
		this.#store = store;
	}

	import(nodePins: CCNodePin[]) {
		for (const nodePin of nodePins) {
			this.register(nodePin);
		}
	}

	mount() {
		this.#store.connections.on("didRegister", () => this.#clearBitWidthCache());
		this.#store.connections.on("didUnregister", () =>
			this.#clearBitWidthCache(),
		);
		// A calculated bit width may be derived from the config of its node
		this.#store.nodes.on("didUpdateConfig", () => this.#clearBitWidthCache());
		this.#store.nodes.on("didRegister", (node) => {
			const componentPins = this.#store.componentPins.getManyByComponentId(
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
		this.#store.nodes.on("willUnregister", (node) => {
			for (const pin of this.#nodePins.values()) {
				if (pin.nodeId === node.id) {
					this.unregister(pin.id);
				}
			}
		});
		this.#store.componentPins.on("didRegister", (componentPin) => {
			for (const node of this.#store.nodes.getManyByComponentId(
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
		this.#store.componentPins.on("willUnregister", (componentPin) => {
			for (const pin of this.#nodePins.values()) {
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
		invariant(this.#store.componentPins.get(nodePin.componentPinId));
		invariant(this.#store.nodes.get(nodePin.nodeId));
		this.#nodePins.set(nodePin.id, nodePin);
		this.#clearBitWidthCache();
		this.emit("didRegister", nodePin);
	}

	/**
	 * Unregister a pin
	 * @param id id of a pin to be unregistered
	 */
	async unregister(id: CCNodePinId): Promise<void> {
		const nodePin = nullthrows(this.#nodePins.get(id));
		this.#markedAsDeleted.add(id);
		await this.#store.transactionManager.runInTransaction(() => {
			this.emit("willUnregister", nodePin);
			this.#nodePins.delete(nodePin.id);
		});
		this.#clearBitWidthCache();
		this.emit("didUnregister", nodePin);
		this.#markedAsDeleted.delete(id);
	}

	update(id: CCNodePinId, value: Pick<CCNodePin, "manualBitWidth">) {
		const existingNodePin = nullthrows(this.#nodePins.get(id));
		const newNodePin = { ...existingNodePin, ...value };
		this.#nodePins.set(id, newNodePin);
		this.#clearBitWidthCache();
		this.emit("didUpdate", newNodePin);
	}

	/**
	 * Get a pin by id
	 * @param id id of pin
	 * @returns pin of `id`
	 */
	get(id: CCNodePinId): CCNodePin | undefined {
		return this.#nodePins.get(id);
	}

	/**
	 * Get all of pins
	 * @returns all pins
	 */
	getByImplementationNodeIdAndPinId(
		nodeId: CCNodeId,
		componentPinId: CCComponentPinId,
	): CCNodePin {
		const pin = [...this.#nodePins.values()].find(
			(candidate) =>
				candidate.nodeId === nodeId &&
				candidate.componentPinId === componentPinId,
		);
		invariant(pin);
		return pin;
	}

	/**
	 * Get all of pins by component id
	 * @param componentId id of component
	 * @returns pins of component
	 */
	getManyByNodeId(nodeId: CCNodeId): CCNodePin[] {
		return [...this.#nodePins.values()].filter((pin) => pin.nodeId === nodeId);
	}

	getManyByNodeIdAndComponentPinId(
		nodeId: CCNodeId,
		componentPinId: CCComponentPinId,
	): CCNodePin[] {
		return [...this.#nodePins.values()].filter(
			(pin) => pin.nodeId === nodeId && pin.componentPinId === componentPinId,
		);
	}

	static #requireManualBitWidth(nodePin: CCNodePin): number {
		invariant(
			nodePin.manualBitWidth !== null && nodePin.manualBitWidth > 0,
			`Node pin ${nodePin.id} of a configurable component pin must have a positive manual bit width, but got ${nodePin.manualBitWidth}`,
		);
		return nodePin.manualBitWidth;
	}

	/**
	 * Collect the manually specified bit widths of the pins of a single node, grouped by
	 * the pin key of its intrinsic component definition (e.g. `In`, `Out`) and ordered by
	 * the order of the node pins.
	 * @param nodePins all pins of one node
	 * @returns the bit widths of the pins of configurable component pins
	 */
	static #collectManualBitWidths(
		nodePins: CCNodePin[],
	): Partial<Record<string, number[]>> {
		const manualBitWidths: Partial<Record<string, number[]>> = {};
		for (const nodePin of nodePins.toSorted((a, b) => a.order - b.order)) {
			const attributes = IntrinsicComponentDefinition.getPinAttributesByPinId(
				nodePin.componentPinId,
			);
			// Only a configurable pin carries a manual bit width; the others are null
			if (attributes?.bitWidthPolicy.type !== "configurable") continue;
			const bitWidths = manualBitWidths[attributes.key] ?? [];
			bitWidths.push(CCNodePinStore.#requireManualBitWidth(nodePin));
			manualBitWidths[attributes.key] = bitWidths;
		}
		return manualBitWidths;
	}

	/**
	 * Get the bit width status of a node pin
	 * @param pinId id of pin
	 * @param nodeId id of node
	 * @returns bit width status of the pin
	 */
	getNodePinBitWidthStatus(nodePinId: CCNodePinId): CCNodePinBitWidthStatus {
		const cached = this.#bitWidthCache.get(nodePinId);
		if (cached) return cached;
		const traverseNodePinBitWidthStatus = (
			targetNodePinId: CCNodePinId,
			seen: Set<CCNodeId>,
		): CCNodePinBitWidthStatus => {
			const targetNodePin = nullthrows(this.get(targetNodePinId));
			const { nodeId: targetNodeId, componentPinId: targetComponentPinId } =
				targetNodePin;

			seen.add(targetNodeId);
			const targetNode = nullthrows(this.#store.nodes.get(targetNodeId));
			const targetNodePins = this.getManyByNodeId(targetNode.id);
			const attributes =
				IntrinsicComponentDefinition.getPinAttributesByPinId(
					targetComponentPinId,
				);
			if (attributes) {
				switch (attributes.bitWidthPolicy.type) {
					case "configurable":
						return {
							isFixed: true,
							bitWidth: CCNodePinStore.#requireManualBitWidth(targetNodePin),
						};
					case "calculated":
						return {
							isFixed: true,
							bitWidth: attributes.bitWidthPolicy.calculateBitWidth(
								targetNode.config,
								CCNodePinStore.#collectManualBitWidths(targetNodePins),
							),
						};
					case "inferred":
						// Resolved from the pins it is connected to, below
						break;
					default:
						throw new Error(
							`Unknown bit width policy: ${attributes.bitWidthPolicy satisfies never}`,
						);
				}
			} else {
				// A user defined component pin is fixed by the implementation of its component
				const componentPinBitWidthStatus =
					this.#store.componentPins.getComponentPinBitWidthStatus(
						targetComponentPinId,
					);
				if (componentPinBitWidthStatus.isFixed) {
					return componentPinBitWidthStatus;
				}
			}
			// The bit width of an inferred pin is shared with the other inferred pins of its
			// node, so any of them may be the one that is connected to a pin of a known width.
			for (const siblingNodePin of targetNodePins) {
				const siblingComponentPinBitWidthStatus =
					this.#store.componentPins.getComponentPinBitWidthStatus(
						siblingNodePin.componentPinId,
					);
				if (siblingComponentPinBitWidthStatus.isFixed) {
					continue;
				}
				if (siblingComponentPinBitWidthStatus.fixMode === "nodeDependent") {
					// The bit width of a node dependent pin never propagates to its sibling
					// pins, so no intrinsic component mixes it with inferred pins.
					throw new Error(
						`Component pin ${siblingNodePin.componentPinId} must not mix a node dependent bit width with inferred sibling pins`,
					);
				}
				const connections = nullthrows(
					this.#store.connections.getConnectionsByNodePinId(siblingNodePin.id),
				);
				for (const connection of connections) {
					const componentPin = nullthrows(
						this.#store.componentPins.get(siblingNodePin.componentPinId),
					);
					const connectedNodePinId =
						componentPin.type === "input" ? connection.from : connection.to;
					const connectedNodePin = nullthrows(this.get(connectedNodePinId));
					if (seen.has(connectedNodePin.nodeId)) {
						continue;
					}
					const connectedPinBitWidthStatus = traverseNodePinBitWidthStatus(
						connectedNodePinId,
						seen,
					);
					if (connectedPinBitWidthStatus.isFixed) {
						return connectedPinBitWidthStatus;
					}
				}
			}
			return { isFixed: false };
		};
		const result = traverseNodePinBitWidthStatus(nodePinId, new Set());
		this.#bitWidthCache.set(nodePinId, result);
		return result;
	}

	isMarkedAsDeleted(id: CCNodePinId) {
		return this.#markedAsDeleted.has(id);
	}

	isConnectable(a: CCNodePinId, b: CCNodePinId) {
		const aNodePin = this.get(a);
		const bNodePin = this.get(b);
		if (!aNodePin || !bNodePin) {
			throw new Error(`Node pin ${a} or ${b} does not exist in the store`);
		}
		const aComponentPin = this.#store.componentPins.get(
			aNodePin?.componentPinId ?? null,
		);
		const bComponentPin = this.#store.componentPins.get(
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
		const aNode = this.#store.nodes.get(aNodePin.nodeId);
		const bNode = this.#store.nodes.get(bNodePin.nodeId);
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
		const aConnections = this.#store.connections.getConnectionsByNodePinId(
			aNodePin.id,
		);
		const bConnections = this.#store.connections.getConnectionsByNodePinId(
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
		if (!this.hasCompatibleBitWidths(a, b)) {
			console.warn(
				`Cannot connect pins with conflicting bit widths: ${aNodePin.id} and ${bNodePin.id}`,
			);
			return false;
		}
		return true;
	}

	/**
	 * Check whether two node pins can carry the same value. A pin whose bit width is not
	 * fixed yet adapts to the pin it is connected to, so it is compatible with any pin.
	 * @param a id of a pin
	 * @param b id of the other pin
	 * @returns whether the bit widths of the two pins do not conflict
	 */
	hasCompatibleBitWidths(a: CCNodePinId, b: CCNodePinId): boolean {
		const aBitWidthStatus = this.getNodePinBitWidthStatus(a);
		const bBitWidthStatus = this.getNodePinBitWidthStatus(b);
		if (!aBitWidthStatus.isFixed || !bBitWidthStatus.isFixed) return true;
		return aBitWidthStatus.bitWidth === bBitWidthStatus.bitWidth;
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

	/**
	 * Get array of pins
	 * @returns array of pins
	 */
	getMany(): CCNodePin[] {
		return [...this.#nodePins.values()];
	}
}
