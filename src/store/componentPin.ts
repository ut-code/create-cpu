import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import { IntrinsicComponentDefinition } from "./intrinsics/base";
import { input, output } from "./intrinsics/definitions";
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
 * - `isFixed: false, fixMode: "nodeDependent"` — the bit width differs per node instance
 *   (it comes from the config of the node and/or the bit widths manually specified for its
 *   pins), so it can only be resolved by {@link CCNodePinStore.getNodePinBitWidthStatus}.
 * - `isFixed: true` — the bit width is determined by the component definition itself and available as `bitWidth`.
 */
export type CCComponentPinBitWidthStatus =
	| { isFixed: false; fixMode: "automatic" | "nodeDependent" }
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
	 * Get how the bit width of a component pin is determined. It is resolved only as far
	 * as the component definition allows; use {@link CCNodePinStore.getNodePinBitWidthStatus}
	 * to get the width of a concrete node pin.
	 * @param pinId id of pin
	 * @returns bit width status of the pin
	 */
	getComponentPinBitWidthStatus(
		pinId: CCComponentPinId,
	): CCComponentPinBitWidthStatus {
		const pin = this.#pins.get(pinId);
		invariant(pin);

		// Intrinsic components
		const intrinsicPinAttributes =
			IntrinsicComponentDefinition.getPinAttributesByPinId(pin.id);
		if (intrinsicPinAttributes) {
			switch (intrinsicPinAttributes.bitWidthPolicy.type) {
				case "inferred":
					return { isFixed: false, fixMode: "automatic" };
				// Both policies need the node the pin belongs to (its config and the bit widths
				// manually specified for its pins), which is unknown at the component pin level.
				case "configurable":
				case "calculated":
					return { isFixed: false, fixMode: "nodeDependent" };
				default:
					throw new Error(
						`Unknown bit width policy: ${intrinsicPinAttributes.bitWidthPolicy satisfies never}`,
					);
			}
		}

		// User-defined components
		invariant(
			pin.implementation,
			"Pin implementation must be defined for user-defined components",
		);
		const bitWidthStatus = this.#store.nodePins.getNodePinBitWidthStatus(
			pin.implementation,
		);
		if (bitWidthStatus.isFixed) {
			return bitWidthStatus;
		} else {
			return { isFixed: false, fixMode: "automatic" };
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
