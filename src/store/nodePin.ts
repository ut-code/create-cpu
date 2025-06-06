import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentPinId, CCPinMultiplexability } from "./componentPin";
import { IntrinsicComponentDefinition } from "./intrinsics/base";
import { aggregate, broadcast, decompose } from "./intrinsics/definitions";
import type { CCNodeId } from "./node";

export type CCNodePinId = Opaque<string, "CCNodePinId">;

export type CCNodePin = {
	id: CCNodePinId;
	nodeId: CCNodeId;
	componentPinId: CCComponentPinId;
	order: number;
	userSpecifiedBitWidth: number | null;
};

export type CCNodePinStoreEvents = {
	didRegister(pin: CCNodePin): void;
	willUnregister(pin: CCNodePin): void;
	didUnregister(pin: CCNodePin): void;
	didUpdate(pin: CCNodePin): void;
};

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

	update(id: CCNodePinId, value: Pick<CCNodePin, "userSpecifiedBitWidth">) {
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
	 * Get the multiplexability of a node pin
	 * @param pinId id of pin
	 * @param nodeId id of node
	 * @returns multiplexability of the pin
	 */
	getNodePinMultiplexability(nodePinId: CCNodePinId): CCPinMultiplexability {
		const traverseNodePinMultiplexability = (
			targetNodePinId: CCNodePinId,
			seen: Set<CCNodeId>,
		): CCPinMultiplexability => {
			const {
				nodeId: targetNodeId,
				componentPinId: targetComponentPinId,
				userSpecifiedBitWidth,
			} = nullthrows(this.get(targetNodePinId));

			seen.add(targetNodeId);
			const targetNode = nullthrows(this.#store.nodes.get(targetNodeId));
			const targetNodePins = this.getManyByNodeId(targetNode.id);
			const givenPinMultiplexability =
				this.#store.componentPins.getComponentPinMultiplexability(
					targetComponentPinId,
				);
			if (givenPinMultiplexability === "undecidable") {
				const componentPin =
					this.#store.componentPins.get(targetComponentPinId);
				invariant(componentPin);
				switch (componentPin.id) {
					case nullthrows(aggregate.inputPin.In.id):
					case nullthrows(broadcast.outputPin.id):
					case nullthrows(decompose.outputPin.id):
						invariant(
							userSpecifiedBitWidth,
							"aggregate inputPin, broadcast outputPin, or decompose outputPin must have a userSpecifiedBitWidth",
						);
						return {
							isMultiplexable: false,
							multiplicity: userSpecifiedBitWidth,
						};
					case nullthrows(aggregate.outputPin.id): {
						const multiplicity = targetNodePins
							.filter((pin) => {
								const componentPin = this.#store.componentPins.get(
									pin.componentPinId,
								);
								invariant(componentPin);
								return componentPin.type === "input";
							})
							.reduce((acc, pin) => {
								invariant(pin.userSpecifiedBitWidth);
								return acc + pin.userSpecifiedBitWidth;
							}, 0);
						return {
							isMultiplexable: false,
							multiplicity,
						};
					}
					case nullthrows(decompose.inputPin.In.id): {
						const multiplicity = targetNodePins
							.filter((pin) => {
								const componentPin = this.#store.componentPins.get(
									pin.componentPinId,
								);
								invariant(componentPin);
								return componentPin.type === "output";
							})
							.reduce((acc, pin) => {
								invariant(pin.userSpecifiedBitWidth);
								return acc + pin.userSpecifiedBitWidth;
							}, 0);
						return {
							isMultiplexable: false,
							multiplicity,
						};
					}
					default:
						throw new Error(
							`Multiplexability of ${componentPin.id} is undecidable`,
						);
				}
			}
			if (!givenPinMultiplexability.isMultiplexable) {
				return givenPinMultiplexability;
			}
			for (const targetNodePin of targetNodePins) {
				const pinMultiplexability =
					this.#store.componentPins.getComponentPinMultiplexability(
						targetNodePin.componentPinId,
					);
				if (pinMultiplexability === "undecidable") {
					throw new Error("unreachable");
				}
				if (pinMultiplexability.isMultiplexable) {
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
						const connectedPinMultiplexability =
							traverseNodePinMultiplexability(connectedNodePinId, seen);
						if (!connectedPinMultiplexability.isMultiplexable) {
							return connectedPinMultiplexability;
						}
					}
				}
			}
			return givenPinMultiplexability;
		};
		return traverseNodePinMultiplexability(nodePinId, new Set());
	}

	isMarkedAsDeleted(id: CCNodePinId) {
		return this.#markedAsDeleted.has(id);
	}

	/**
	 * Create a new pin
	 * @param partialPin pin without `id`
	 * @returns a new pin
	 */
	static create(
		partialPin: Omit<CCNodePin, "id" | "userSpecifiedBitWidth"> &
			Partial<Pick<CCNodePin, "userSpecifiedBitWidth">>,
	): CCNodePin {
		const attributes =
			IntrinsicComponentDefinition.intrinsicComponentPinAttributesByComponentPinId.get(
				partialPin.componentPinId,
			);
		return {
			...partialPin,
			id: crypto.randomUUID() as CCNodePinId,
			userSpecifiedBitWidth:
				partialPin.userSpecifiedBitWidth ??
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
