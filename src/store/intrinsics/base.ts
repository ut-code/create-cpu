import { mapValues } from "es-toolkit";
import type { CCComponent, CCComponentId } from "../component";
import type { CCNodePinId } from "../nodePin";
import type { CCNodeId } from "../node";
import type { CCComponentPin, CCComponentPinId } from "../componentPin";
import type {
	CCIntrinsicComponentSpec,
	CCIntrinsicComponentType,
} from "./types";
import type { SimulationFrame } from "../simulation";

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
};

export type Context = {
	componentId: CCComponentId;
};

type IntrinsicComponentPinAttributes = {
	name: string;
	isBitWidthConfigurable?: boolean;
	isSplittable?: boolean;
};
type Props<Spec extends CCIntrinsicComponentSpec> = {
	type: CCIntrinsicComponentType;
	name: string;
	in: Record<Spec["in"], IntrinsicComponentPinAttributes>;
	out: Record<Spec["out"], IntrinsicComponentPinAttributes>;
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
	static intrinsicComponentPinAttributesByComponentPinId: Map<
		CCComponentPinId,
		IntrinsicComponentPinAttributes
	> = new Map();

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
			IntrinsicComponentDefinition.intrinsicComponentPinAttributesByComponentPinId.set(
				pin.id,
				attributes,
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
			IntrinsicComponentDefinition.intrinsicComponentPinAttributesByComponentPinId.set(
				pin.id,
				attributes,
			);
			this.allPins.push(pin);
			return pin;
		});
		this.initialConfig = props.initialConfig;
		// this.outputPin = {
		// 	id: this._generateId() as CCComponentPinId,
		// 	componentId: this.id,
		// 	type: "output",
		// 	implementation: null,
		// 	order: this._lastLocalIndex++,
		// 	name: props.out.name,
		// };
		// IntrinsicComponentDefinition.intrinsicComponentPinAttributesByComponentPinId.set(
		// 	this.outputPin.id,
		// 	props.out
		// );
		// this.allPins.push(this.outputPin);
	}
}
