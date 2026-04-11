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
	false_,
	flipflop,
	input,
	not,
	or,
	output,
	true_,
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

/**
 * The resolved bit width status of a node pin instance.
 * - `isFixed: false` — the bit width has not yet been determined.
 * - `isFixed: true` — the bit width is known and available as `bitWidth`.
 */
export type CCNodePinBitWidthStatus =
	| { isFixed: false }
	| { isFixed: true; bitWidth: number };

/**
 * The bit width status of a component pin definition.
 * - `isFixed: false, fixMode: "automatic"` — the bit width is not yet determined and will be inferred automatically from connections.
 * - `isFixed: false, fixMode: "manual"` — the bit width is not yet determined and must be specified manually by the user.
 * - `isFixed: true` — the bit width is known and available as `bitWidth`.
 */
export type CCComponentPinBitWidthStatus =
	| { isFixed: false; fixMode: "automatic" | "manual" }
	| { isFixed: true; bitWidth: number };

export type CCComponentPinStoreEvents = {
	didRegister(pin: CCComponentPin): void;
	willUnregister(pin: CCComponentPin): void;
	didUnregister(pin: CCComponentPin): void;
	didUpdate(pin: CCComponentPin): void;
};
export const ccComponentPinStoreChangeEventTypes: (keyof CCComponentPinStoreEvents)[] =
	["didRegister", "didUnregister", "didUpdate"];

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
			const componentPin = this.#store.componentPins.get(
				nodePin.componentPinId,
			);
			if (
				componentPin?.id === input.outputPin.Out.id ||
				componentPin?.id === output.inputPin.In.id
			) {
				this.register(this.createForNodePin(nodePin.id));
			}
		});
		this.#store.nodePins.on("willUnregister", (nodePin) => {
			const pin = this.getByImplementation(nodePin.id);
			if (pin) this.unregister(pin.id);
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
			type: targetComponentPin.type === "input" ? "output" : "input",
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
	 * Get the bit width status of a component pin
	 * @param pinId id of pin
	 * @returns bit width status of the pin
	 */
	getComponentPinBitWidthStatus(
		pinId: CCComponentPinId,
	): CCComponentPinBitWidthStatus {
		const pin = this.#pins.get(pinId);
		invariant(pin);
		// TODO: Remove hardcoded intrinsic component pin IDs and replace with a more flexible system, such as metadata on the component definitions.
		switch (pin.id) {
			case nullthrows(and.inputPin.A.id):
			case nullthrows(and.inputPin.B.id):
			case nullthrows(and.outputPin.Out.id):
			case nullthrows(or.inputPin.A.id):
			case nullthrows(or.inputPin.B.id):
			case nullthrows(or.outputPin.Out.id):
			case nullthrows(not.inputPin.In.id):
			case nullthrows(not.outputPin.Out.id):
			case nullthrows(xor.inputPin.A.id):
			case nullthrows(xor.inputPin.B.id):
			case nullthrows(xor.outputPin.Out.id):
			case nullthrows(input.outputPin.Out.id):
			case nullthrows(output.inputPin.In.id):
			case nullthrows(flipflop.inputPin.In.id):
			case nullthrows(flipflop.outputPin.Out.id):
			case nullthrows(true_.outputPin.Out.id):
			case nullthrows(false_.outputPin.Out.id): {
				return { isFixed: false, fixMode: "automatic" };
			}
			case nullthrows(aggregate.inputPin.In.id): {
				return { isFixed: false, fixMode: "manual" };
			}
			case nullthrows(aggregate.outputPin.Out.id): {
				return { isFixed: false, fixMode: "manual" };
			}
			case nullthrows(decompose.outputPin.Out.id): {
				return { isFixed: false, fixMode: "manual" };
			}
			case nullthrows(decompose.inputPin.In.id): {
				return { isFixed: false, fixMode: "manual" };
			}
			case nullthrows(broadcast.inputPin.In.id): {
				return { isFixed: true, bitWidth: 1 };
			}
			case nullthrows(broadcast.outputPin.Out.id): {
				return { isFixed: false, fixMode: "manual" };
			}
			default: {
				if (pin.implementation === null) {
					throw new Error("unreachable");
				}
				const bitWidthStatus = this.#store.nodePins.getNodePinBitWidthStatus(
					pin.implementation,
				);
				if (bitWidthStatus.isFixed) {
					return bitWidthStatus;
				} else {
					return { isFixed: false, fixMode: "automatic" };
				}
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
}
