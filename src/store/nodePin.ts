import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentPinId, CCNodePinBitWidthStatus } from "./componentPin";
import { IntrinsicComponentDefinition } from "./intrinsics/base";
import { aggregate, broadcast, decompose } from "./intrinsics/definitions";
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
		this.emit("didUnregister", nodePin);
		this.#markedAsDeleted.delete(id);
	}

	update(id: CCNodePinId, value: Pick<CCNodePin, "manualBitWidth">) {
		const existingNodePin = nullthrows(this.#nodePins.get(id));
		const newNodePin = { ...existingNodePin, ...value };
		this.#nodePins.set(id, newNodePin);
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

	/**
	 * Get the bit width status of a node pin
	 * @param pinId id of pin
	 * @param nodeId id of node
	 * @returns bit width status of the pin
	 */
	getNodePinBitWidthStatus(nodePinId: CCNodePinId): CCNodePinBitWidthStatus {
		const traverseNodePinBitWidthStatus = (
			targetNodePinId: CCNodePinId,
			seen: Set<CCNodeId>,
		): CCNodePinBitWidthStatus => {
			const {
				nodeId: targetNodeId,
				componentPinId: targetComponentPinId,
				manualBitWidth,
			} = nullthrows(this.get(targetNodePinId));

			seen.add(targetNodeId);
			const targetNode = nullthrows(this.#store.nodes.get(targetNodeId));
			const targetNodePins = this.getManyByNodeId(targetNode.id);
			const givenComponentPinBitWidthStatus =
				this.#store.componentPins.getComponentPinBitWidthStatus(
					targetComponentPinId,
				);
			if (givenComponentPinBitWidthStatus.isFixed) {
				return givenComponentPinBitWidthStatus;
			}
			if (givenComponentPinBitWidthStatus.fixMode === "manual") {
				const componentPin =
					this.#store.componentPins.get(targetComponentPinId);
				invariant(componentPin);
				switch (componentPin.id) {
					case nullthrows(aggregate.inputPin.In.id):
					case nullthrows(broadcast.outputPin.Out.id):
					case nullthrows(decompose.outputPin.Out.id):
						invariant(
							manualBitWidth,
							"aggregate inputPin, broadcast outputPin, or decompose outputPin must have a manual bit width",
						);
						return {
							isFixed: true,
							bitWidth: manualBitWidth,
						};
					case nullthrows(aggregate.outputPin.Out.id): {
						const bitWidth = targetNodePins
							.filter((pin) => {
								const componentPin = this.#store.componentPins.get(
									pin.componentPinId,
								);
								invariant(componentPin);
								return componentPin.type === "input";
							})
							.reduce((acc, pin) => {
								invariant(pin.manualBitWidth);
								return acc + pin.manualBitWidth;
							}, 0);
						return {
							isFixed: true,
							bitWidth,
						};
					}
					case nullthrows(decompose.inputPin.In.id): {
						const bitWidth = targetNodePins
							.filter((pin) => {
								const componentPin = this.#store.componentPins.get(
									pin.componentPinId,
								);
								invariant(componentPin);
								return componentPin.type === "output";
							})
							.reduce((acc, pin) => {
								invariant(pin.manualBitWidth);
								return acc + pin.manualBitWidth;
							}, 0);
						return {
							isFixed: true,
							bitWidth,
						};
					}
					default:
						throw new Error(
							`Bit width status of ${componentPin.id} is undecidable`,
						);
				}
			}
			for (const targetNodePin of targetNodePins) {
				const targetComponentPinBitWidthStatus =
					this.#store.componentPins.getComponentPinBitWidthStatus(
						targetNodePin.componentPinId,
					);
				if (targetComponentPinBitWidthStatus.isFixed) {
					continue;
				}
				if (targetComponentPinBitWidthStatus.fixMode === "manual") {
					throw new Error("unreachable");
				}
				const connections = nullthrows(
					this.#store.connections.getConnectionsByNodePinId(targetNodePin.id),
				);
				for (const connection of connections) {
					const componentPin = nullthrows(
						this.#store.componentPins.get(targetNodePin.componentPinId),
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
			return givenComponentPinBitWidthStatus;
		};
		return traverseNodePinBitWidthStatus(nodePinId, new Set());
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
		const aBitWidthStatus = this.getNodePinBitWidthStatus(a);
		const bBitWidthStatus = this.getNodePinBitWidthStatus(b);
		if (aBitWidthStatus.isFixed && bBitWidthStatus.isFixed) {
			console.warn(
				`Cannot connect pins with fixed bit width: ${aNodePin.id} and ${bNodePin.id}`,
			);
			return aBitWidthStatus.bitWidth === bBitWidthStatus.bitWidth;
		}
		return true;
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
				(attributes?.isBitWidthConfigurable ? 1 : null),
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
