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

type IntrinsicComponentPinBitWidthPolicy<
	Spec extends CCIntrinsicComponentSpec,
> =
	| { type: "inferred" }
	| {
			type: "fixed";
			calculateBitWidth: (
				config: Spec["config"],
				manualBitWidths: Partial<Record<Spec["in" | "out"], number[]>>,
			) => number;
	  }
	| { type: "configurable"; isSplittable: boolean };

type IntrinsicComponentPinAttributes<Spec extends CCIntrinsicComponentSpec> = {
	name: string;
	bitWidthPolicy: IntrinsicComponentPinBitWidthPolicy<Spec>;
	isBitWidthConfigurable?: boolean;
	isSplittable?: boolean;
};
type Props<Spec extends CCIntrinsicComponentSpec> = {
	type: CCIntrinsicComponentType;
	name: string;
	in: Record<Spec["in"], IntrinsicComponentPinAttributes<Spec>>;
	out: Record<Spec["out"], IntrinsicComponentPinAttributes<Spec>>;
	initialConfig: Spec["config"];
	evaluate: (
		context: ComponentEvaluationContext,
		nodeId: CCNodeId,
		shape: CCIntrinsicComponentShape<Spec>,
	) => boolean; // returns whether evaluation succeeded
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
	readonly evaluate: (
		context: ComponentEvaluationContext,
		nodeId: CCNodeId,
		shape: CCIntrinsicComponentShape<Spec>,
	) => boolean;

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

		this.inputPin = mapValues(props.in, (attributes) => {
			const pin: CCComponentPin = {
				id: this._generateId() as CCComponentPinId,
				componentId: this.id,
				type: "input",
				implementation: null,
				order: this._lastLocalIndex++,
				name: attributes.name,
			};
			IntrinsicComponentDefinition._pinAttributesByPinId.set(
				pin.id,
				attributes as IntrinsicComponentPinAttributes<CCIntrinsicComponentSpec>,
			);
			this.allPins.push(pin);
			return pin;
		});
		this.outputPin = mapValues(props.out, (attributes) => {
			const pin: CCComponentPin = {
				id: this._generateId() as CCComponentPinId,
				componentId: this.id,
				type: "output",
				implementation: null,
				order: this._lastLocalIndex++,
				name: attributes.name,
			};
			IntrinsicComponentDefinition._pinAttributesByPinId.set(
				pin.id,
				attributes as IntrinsicComponentPinAttributes<CCIntrinsicComponentSpec>,
			);
			this.allPins.push(pin);
			return pin;
		});
		this.initialConfig = props.initialConfig;
	}

	private static _byId: Map<CCComponentId, IntrinsicComponentDefinition> =
		new Map();
	static getByComponentId(componentId: CCComponentId) {
		return IntrinsicComponentDefinition._byId.get(componentId) ?? null;
	}

	private static _pinAttributesByPinId: Map<
		CCComponentPinId,
		IntrinsicComponentPinAttributes<CCIntrinsicComponentSpec>
	> = new Map();
	static getPinAttributesByPinId(pinId: CCComponentPinId) {
		return (
			IntrinsicComponentDefinition._pinAttributesByPinId.get(pinId) ?? null
		);
	}
}
