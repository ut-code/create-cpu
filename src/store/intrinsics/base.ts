import { mapValues } from "es-toolkit";
import type { CCComponent, CCComponentId } from "../component";
import type { CCComponentPin, CCComponentPinId } from "../componentPin";
import type { SimulationValue } from "../simulation";
import type {
	CCIntrinsicComponentSpec,
	CCIntrinsicComponentType,
} from "./types";

/**
 * How the bit width of an intrinsic component pin is determined.
 * - `inferred` — inferred from the pins it is transitively connected to.
 * - `calculated` — derived from the config of the node and the bit widths manually
 *   specified for its pins, so it can only be resolved for a concrete node.
 * - `configurable` — specified manually by the user on each node pin. `isSplittable`
 *   tells whether the pin may be split into multiple node pins.
 */
type IntrinsicComponentPinBitWidthPolicy<
	Spec extends CCIntrinsicComponentSpec,
> =
	| { type: "inferred" }
	| {
			type: "calculated";
			calculateBitWidth: (
				config: Spec["config"],
				manualBitWidths: Partial<Record<Spec["in" | "out"], number[]>>,
			) => number;
	  }
	| { type: "configurable"; isSplittable: boolean };

type IntrinsicComponentPinAttributes<Spec extends CCIntrinsicComponentSpec> = {
	name: string;
	bitWidthPolicy: IntrinsicComponentPinBitWidthPolicy<Spec>;
};

/**
 * The attributes of an intrinsic component pin, along with the `key` identifying it
 * within its component definition (e.g. `In`, `Out`, `Pixels`).
 */
export type RegisteredIntrinsicComponentPinAttributes =
	IntrinsicComponentPinAttributes<CCIntrinsicComponentSpec> & { key: string };

/**
 * The values of the pins of one intrinsic node, grouped by pin key. A pin key can have
 * more than one node pin when it is split, so each key holds the values in pin order.
 */
export type IntrinsicPinValues<Key extends string> = Record<
	Key,
	SimulationValue[]
>;

/** What an intrinsic node needs to know about itself besides its input values. */
export type IntrinsicEvaluationEnvironment<
	Spec extends CCIntrinsicComponentSpec,
> = {
	/** bit widths of the output pins, grouped like {@link IntrinsicPinValues} */
	outputBitWidths: Record<Spec["out"], number[]>;
	config: Spec["config"];
};

/**
 * How the outputs of an intrinsic node are computed in one time step.
 * - `combinational` — from the inputs of the same time step.
 * - `sequential` — from the inputs of the previous time step (`null` in the first one).
 *   It does not see the current inputs at all, because it is evaluated before they are
 *   known. That is what lets a circuit contain a feedback loop through such a node.
 */
export type IntrinsicComponentBehavior<
	Spec extends CCIntrinsicComponentSpec = CCIntrinsicComponentSpec,
> =
	| {
			kind: "combinational";
			evaluate(
				inputs: IntrinsicPinValues<Spec["in"]>,
				environment: IntrinsicEvaluationEnvironment<Spec>,
			): IntrinsicPinValues<Spec["out"]>;
	  }
	| {
			kind: "sequential";
			evaluate(
				previousInputs: IntrinsicPinValues<Spec["in"]> | null,
				environment: IntrinsicEvaluationEnvironment<Spec>,
			): IntrinsicPinValues<Spec["out"]>;
	  };

type Props<Spec extends CCIntrinsicComponentSpec> = {
	type: CCIntrinsicComponentType;
	name: string;
	in: Record<Spec["in"], IntrinsicComponentPinAttributes<Spec>>;
	out: Record<Spec["out"], IntrinsicComponentPinAttributes<Spec>>;
	initialConfig: Spec["config"];
	/**
	 * null for `Input` and `Output`, which only carry a value across a component
	 * boundary and are resolved away before the simulation evaluates anything
	 */
	behavior: IntrinsicComponentBehavior<Spec> | null;
};
export class IntrinsicComponentDefinition<
	Spec extends CCIntrinsicComponentSpec = CCIntrinsicComponentSpec,
> {
	readonly id: CCComponentId;
	readonly type: CCIntrinsicComponentType;
	readonly name: string;
	readonly component: CCComponent;
	readonly allPins: CCComponentPin[] = [];
	readonly inputPin: Record<Spec["in"], CCComponentPin>;
	readonly outputPin: Record<Spec["out"], CCComponentPin>;
	readonly initialConfig: Spec["config"];
	/** @see {@link Props.behavior} */
	readonly behavior: IntrinsicComponentBehavior<Spec> | null;

	private static _lastIndex = 0;

	private _index: number = IntrinsicComponentDefinition._lastIndex++;
	private _lastLocalIndex = 0;
	private _generateId() {
		return `ffffffff-${this._index
			.toString()
			.padStart(4, "0")}-4000-8000-${(this._lastLocalIndex++)
			.toString()
			.padStart(12, "0")}`;
	}

	constructor(props: Props<Spec>) {
		this.id = this._generateId() as CCComponentId;
		this.type = props.type;
		this.name = props.name;
		this.component = {
			id: this.id,
			intrinsicType: props.type,
			name: this.name,
		};
		IntrinsicComponentDefinition._byId.set(this.id, this);
		this.behavior = props.behavior;

		this.inputPin = mapValues(props.in, (attributes, key) =>
			this._registerPin("input", key, attributes),
		);
		this.outputPin = mapValues(props.out, (attributes, key) =>
			this._registerPin("output", key, attributes),
		);
		this.initialConfig = props.initialConfig;
	}

	private _registerPin(
		type: CCComponentPin["type"],
		key: string,
		attributes: IntrinsicComponentPinAttributes<Spec>,
	): CCComponentPin {
		const pin: CCComponentPin = {
			id: this._generateId() as CCComponentPinId,
			componentId: this.id,
			type,
			implementation: null,
			order: this._lastLocalIndex++,
			name: attributes.name,
		};
		IntrinsicComponentDefinition._pinAttributesByPinId.set(pin.id, {
			...(attributes as IntrinsicComponentPinAttributes<CCIntrinsicComponentSpec>),
			key,
		});
		this.allPins.push(pin);
		return pin;
	}

	private static _byId: Map<CCComponentId, IntrinsicComponentDefinition> =
		new Map();
	static getByComponentId(componentId: CCComponentId) {
		return IntrinsicComponentDefinition._byId.get(componentId) ?? null;
	}

	private static _pinAttributesByPinId: Map<
		CCComponentPinId,
		RegisteredIntrinsicComponentPinAttributes
	> = new Map();
	/** @returns the attributes of the pin, or null if it is not an intrinsic component pin */
	static getPinAttributesByPinId(pinId: CCComponentPinId) {
		return (
			IntrinsicComponentDefinition._pinAttributesByPinId.get(pinId) ?? null
		);
	}
}
