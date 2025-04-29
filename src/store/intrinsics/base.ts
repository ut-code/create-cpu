import { mapValues } from "lodash-es";
import type { CCComponent, CCComponentId } from "../component";
import type { CCComponentPin, CCComponentPinId } from "../componentPin";
import type { CCIntrinsicComponentType } from "./types";

type SimulationValue = boolean[];

type IntrinsicComponentPinAttributes = {
	name: string;
	isBitWidthConfigurable?: boolean;
	isSplittable?: boolean;
};
type Props<In extends string> = {
	type: CCIntrinsicComponentType;
	name: string;
	in: Record<In, IntrinsicComponentPinAttributes>;
	out: IntrinsicComponentPinAttributes;
	evaluate: (
		input: Record<In, SimulationValue[]>,
		outputShape: { multiplicity: number }[],
		previousInput: Record<In, SimulationValue[]>,
	) => SimulationValue[];
};
export class IntrinsicComponentDefinition<In extends string = string> {
	static intrinsicComponentPinAttributesByComponentPinId: Map<
		CCComponentPinId,
		IntrinsicComponentPinAttributes
	> = new Map();

	readonly id: CCComponentId;
	readonly type: CCIntrinsicComponentType;
	readonly name: string;
	readonly component: CCComponent;
	readonly allPins: CCComponentPin[] = [];
	readonly inputPin: Record<In, CCComponentPin>;
	readonly outputPin: CCComponentPin;
	readonly evaluate: (
		input: Record<In, SimulationValue[]>,
		outputShape: { multiplicity: number }[],
		previousInput: Record<In, SimulationValue[]>,
	) => SimulationValue[];

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

	constructor(props: Props<In>) {
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
		// this.outputPin = mapValues(props.out, (p) => {
		// 	const pin: CCComponentPin = {
		// 		id: this._generateId() as CCComponentPinId,
		// 		componentId: this.id,
		// 		type: "output",
		// 		implementation: null,
		// 		order: this._lastLocalIndex++,
		// 		name: p.name,
		// 	};
		// 	this.allPins.push(pin);
		// 	return pin;
		// });
		this.outputPin = {
			id: this._generateId() as CCComponentPinId,
			componentId: this.id,
			type: "output",
			implementation: null,
			order: this._lastLocalIndex++,
			name: props.out.name,
		};
		IntrinsicComponentDefinition.intrinsicComponentPinAttributesByComponentPinId.set(
			this.outputPin.id,
			props.out,
		);
		this.allPins.push(this.outputPin);
	}
}
