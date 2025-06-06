import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import {
	aggregate,
	and,
	broadcast,
	decompose,
	flipflop,
	input,
	not,
	or,
	xor,
} from "./intrinsics/definitions";
import type { CCNodePinId } from "./nodePin";

export type CCComponentPin = {
	readonly id: CCComponentPinId;
	readonly componentId: CCComponentId;
	readonly type: CCComponentPinType;
	readonly implementation: CCPinImplementation;
	order: number;
	name: string;
};

export type CCComponentPinId = Opaque<string, "CCPinId">;
export type CCComponentPinType = "input" | "output";
export const ccPinTypes: CCComponentPinType[] = ["input", "output"];

/** null for intrinsic components */
export type CCPinImplementation = CCNodePinId | null;
// | CCPinUserImplementation
// | CCPinIntrinsicImplementation;

// export type CCPinUserImplementation = {
//   readonly type: "user";
//   readonly nodeId: CCNodeId;
//   readonly pinId: CCComponentPinId;
// };

// export type CCPinIntrinsicImplementation = {
//   readonly type: "intrinsic";
// };

export type CCPinMultiplexability =
	| { isMultiplexable: true }
	| {
			isMultiplexable: false;
			multiplicity: number;
	  };
// | { isMultiplexable: false; multiplicity: number };

export type CCComponentPinMultiplexability =
	| CCPinMultiplexability
	| "undecidable";

export type CCComponentPinStoreEvents = {
	didRegister(pin: CCComponentPin): void;
	willUnregister(pin: CCComponentPin): void;
	didUnregister(pin: CCComponentPin): void;
	didUpdate(pin: CCComponentPin): void;
};

/**
 * Store of pins
 */
export class CCComponentPinStore extends EventEmitter<CCComponentPinStoreEvents> {
	#store: CCStore;

	#pins: Map<CCComponentPinId, CCComponentPin> = new Map();

	/**
	 * Constructor of CCComponentPinStore
	 * @param store store
	 * @param pins initial pins
	 */
	constructor(store: CCStore) {
		super();
		this.#store = store;
	}

	import(componentPins: CCComponentPin[]): void {
		for (const pin of componentPins) {
			this.#pins.set(pin.id, pin);
		}
	}

	mount() {
		this.#store.nodePins.on("didRegister", (nodePin) => {
			this.register(this.createForNodePin(nodePin.id));
		});
		this.#store.nodePins.on("willUnregister", (nodePin) => {
			const pin = this.getByImplementation(nodePin.id);
			if (pin) this.unregister(pin.id);
		});
		this.#store.connections.on("didRegister", (connection) => {
			const { from, to } = connection;
			const fromComponentPin = this.getByImplementation(from);
			if (fromComponentPin) this.unregister(fromComponentPin.id);
			const toComponentPin = this.getByImplementation(to);
			if (toComponentPin) this.unregister(toComponentPin.id);
		});
		this.#store.connections.on("willUnregister", (connection) => {
			if (
				!this.#store.nodePins.isMarkedAsDeleted(connection.to) &&
				this.#store.nodePins.get(connection.to)
			) {
				this.register(this.createForNodePin(connection.to));
			}
			// output pins can have multiple connections
			// so we need to check if the connection is the last one
			if (
				this.#store.connections.getConnectionsByNodePinId(connection.from)
					.length === 1
			) {
				if (
					!this.#store.nodePins.isMarkedAsDeleted(connection.from) &&
					this.#store.nodePins.get(connection.from)
				) {
					this.register(this.createForNodePin(connection.from));
				}
			}
		});
	}

	/**
	 * Register a pin
	 * @param pin pin to be registered
	 */
	register(pin: CCComponentPin): void {
		invariant(this.#store.components.get(pin.componentId));
		this.#pins.set(pin.id, pin);
		this.emit("didRegister", pin);
	}

	createForNodePin(nodePinId: CCNodePinId): CCComponentPin {
		const targetNodePin = nullthrows(this.#store.nodePins.get(nodePinId));
		const targetComponentPin = nullthrows(
			this.#store.componentPins.get(targetNodePin.componentPinId),
		);
		const targetNode = nullthrows(this.#store.nodes.get(targetNodePin.nodeId));
		const existingComponentPins = this.getManyByComponentId(
			targetNode.parentComponentId,
		);
		const maxOrder = Math.max(
			...existingComponentPins.map((pin) => pin.order),
			-1,
		);
		return CCComponentPinStore.create({
			type: targetComponentPin.type,
			componentId: targetNode.parentComponentId,
			name: targetComponentPin.name,
			implementation: targetNodePin.id,
			order: maxOrder + 1,
		});
	}

	/**
	 * Unregister a pin
	 * @param id id of a pin to be unregistered
	 */
	async unregister(id: CCComponentPinId): Promise<void> {
		const pin = nullthrows(this.#pins.get(id));
		await this.#store.transactionManager.runInTransaction(() => {
			this.emit("willUnregister", pin);
			this.#pins.delete(id);
		});
		this.emit("didUnregister", pin);
	}

	/**
	 * Get a pin by id
	 * @param id id of pin
	 * @returns pin of `id`
	 */
	get(id: CCComponentPinId): CCComponentPin | undefined {
		return this.#pins.get(id);
	}

	/**
	 * Get all of pins
	 * @returns all pins
	 */
	getByNodePinId(nodePinId: CCNodePinId): CCComponentPin {
		const pin = [...this.#pins.values()].find(
			({ implementation }) => implementation && implementation === nodePinId,
		);
		invariant(pin);
		return pin;
	}

	/**
	 * Get all of pins by component id
	 * @param componentId id of component
	 * @returns pins of component
	 * @deprecated in favor of {@link getManyByComponentId}
	 */
	getPinIdsByComponentId(componentId: CCComponentId): CCComponentPinId[] {
		return this.getManyByComponentId(componentId).map((pin) => pin.id);
	}

	/**
	 * Get all of pins by component id
	 * @param componentId id of component
	 * @returns pins of component
	 */
	getManyByComponentId(componentId: CCComponentId): CCComponentPin[] {
		return [...this.#pins.values()].filter(
			(pin) => pin.componentId === componentId,
		);
	}

	getByImplementation(implementation: CCNodePinId): CCComponentPin | null {
		return (
			[...this.#pins.values()].find(
				(pin) => pin.implementation === implementation,
			) ?? null
		);
	}

	/**
	 * Update name of pin
	 * @param id id of a pin to be updated
	 * @param value new name
	 */
	update(
		id: CCComponentPinId,
		value: Partial<Pick<CCComponentPin, "name">>,
	): void {
		const pin = this.#pins.get(id);
		invariant(pin);
		this.#pins.set(id, { ...pin, ...value });
		this.emit("didUpdate", pin);
	}

	/**
	 * Get the multiplexability of a component pin
	 * @param pinId id of pin
	 * @returns multiplexability of the pin
	 */
	getComponentPinMultiplexability(
		pinId: CCComponentPinId,
	): CCComponentPinMultiplexability {
		const pin = this.#pins.get(pinId);
		invariant(pin);
		switch (pin.id) {
			case nullthrows(and.inputPin.A.id):
			case nullthrows(and.inputPin.B.id):
			case nullthrows(and.outputPin.id):
			case nullthrows(or.inputPin.A.id):
			case nullthrows(or.inputPin.B.id):
			case nullthrows(or.outputPin.id):
			case nullthrows(not.inputPin.A.id):
			case nullthrows(not.outputPin.id):
			case nullthrows(xor.inputPin.A.id):
			case nullthrows(xor.inputPin.B.id):
			case nullthrows(xor.outputPin.id):
			case nullthrows(input.inputPin.A.id):
			case nullthrows(input.outputPin.id):
			case nullthrows(flipflop.inputPin.In.id):
			case nullthrows(flipflop.outputPin.id): {
				return { isMultiplexable: true };
			}
			case nullthrows(aggregate.inputPin.In.id): {
				return "undecidable";
			}
			case nullthrows(aggregate.outputPin.id): {
				// const multiplicity = nodePins
				// 	.filter((pin) => {
				// 		const componentPin = this.#store.componentPins.get(
				// 			pin.componentPinId,
				// 		);
				// 		invariant(componentPin);
				// 		return componentPin.type === "input";
				// 	})
				// 	.reduce((acc, pin) => {
				// 		invariant(pin.userSpecifiedBitWidth);
				// 		return acc + pin.userSpecifiedBitWidth;
				// 	}, 0);
				// return {
				// 	isMultiplexable: false,
				// 	multiplicity,
				// };
				return "undecidable";
			}
			case nullthrows(decompose.outputPin.id): {
				return "undecidable";
			}
			case nullthrows(decompose.inputPin.In.id): {
				// const multiplicity = nodePins
				// 	.filter((pin) => {
				// 		const componentPin = this.#store.componentPins.get(
				// 			pin.componentPinId,
				// 		);
				// 		invariant(componentPin);
				// 		return componentPin.type === "output";
				// 	})
				// 	.reduce((acc, pin) => {
				// 		invariant(pin.userSpecifiedBitWidth);
				// 		return acc + pin.userSpecifiedBitWidth;
				// 	}, 0);
				// return {
				// 	isMultiplexable: false,
				// 	multiplicity,
				// };
				return "undecidable";
			}
			case nullthrows(broadcast.inputPin.In.id): {
				return { isMultiplexable: false, multiplicity: 1 };
			}
			case nullthrows(broadcast.outputPin.id): {
				return "undecidable";
			}
			default: {
				if (pin.implementation === null) {
					throw new Error("unreachable");
				}
				return this.#store.nodePins.getNodePinMultiplexability(
					pin.implementation,
				);
			}
		}
	}

	/**
	 * Create a new pin
	 * @param partialPin pin without `id`
	 * @returns a new pin
	 */
	static create(partialPin: Omit<CCComponentPin, "id">): CCComponentPin {
		return {
			id: crypto.randomUUID() as CCComponentPinId,
			...partialPin,
		};
	}

	/**
	 * Get array of pins
	 * @returns array of pins
	 */
	getMany(): CCComponentPin[] {
		return [...this.#pins.values()];
	}

	/**
	 * Check if the pin is an interface pin
	 * @param pinId id of pin
	 * @returns if the pin is an interface pin, `true` returns (otherwise `false`)
	 */
	isInterfacePin(pinId: CCComponentPinId): boolean {
		const pin = nullthrows(this.#store.componentPins.get(pinId));
		return (
			!pin.implementation ||
			this.#store.connections.hasNoConnectionOf(pin.implementation)
		);
	}
}
