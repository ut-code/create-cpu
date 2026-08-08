import { mapValues } from "es-toolkit";
import type { CCComponent, CCComponentId } from "../component";
import type { CCComponentPin, CCComponentPinId } from "../componentPin";
import type { CCNodeId } from "../node";
import type { CCNodePinId } from "../nodePin";
import type { SimulationFrame } from "../simulation";
import type {
	CCIntrinsicComponentSpec,
	CCIntrinsicComponentType,
} from "./types";

export type CCIntrinsicComponentShape<Spec extends CCIntrinsicComponentSpec> = {
	inputShape: Record<Spec["in"], CCComponentPinInstanceShapes>;
	outputShape: Record<Spec["out"], CCComponentPinInstanceShapes>;
};

export type CCComponentPinInstanceShapes = {
	nodePinId: CCNodePinId;
	bitWidth: number;
}[];

export type ComponentEvaluationContext = {
	previousFrame: SimulationFrame | null;
	currentFrame: SimulationFrame;
	defaultBitWidth: number;
};

export type Context = {
	componentId: CCComponentId;
};

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

type IntrinsicComponentEvaluationFunction<
	Spec extends CCIntrinsicComponentSpec,
> = (
	context: ComponentEvaluationContext,
	nodeId: CCNodeId,
	shape: CCIntrinsicComponentShape<Spec>,
	config: Spec["config"],
) => boolean;

type Props<Spec extends CCIntrinsicComponentSpec> = {
	type: CCIntrinsicComponentType;
	name: string;
	in: Record<Spec["in"], IntrinsicComponentPinAttributes<Spec>>;
	out: Record<Spec["out"], IntrinsicComponentPinAttributes<Spec>>;
	initialConfig: Spec["config"];
	evaluate: IntrinsicComponentEvaluationFunction<Spec>;
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
	readonly evaluate: IntrinsicComponentEvaluationFunction<Spec>;

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
		this.evaluate = props.evaluate;

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
