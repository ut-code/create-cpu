import { mapValues } from "lodash-es";
import type { CCComponent, CCComponentId } from "../component";
import type { CCComponentPin, CCComponentPinId } from "../componentPin";
import type { CCIntrinsicComponentType } from "./types";

type SimulationValue = boolean[];

type PropsPin = {
	name: string;
};
type Props<In extends string, Out extends string> = {
	type: CCIntrinsicComponentType;
	name: string;
	in: Record<In, PropsPin>;
	out: Record<Out, PropsPin>;
	evaluate: (
		input: Record<In, SimulationValue[]>,
		outputShape: Record<Out, { multiplicity: number }[]>,
		previousInput: Record<In, SimulationValue[]>,
	) => SimulationValue[];
};
export class IntrinsicComponentDefinition<
	In extends string = string,
	Out extends string = string,
> {
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

	readonly id: CCComponentId;
	readonly type: CCIntrinsicComponentType;
	readonly name: string;
	readonly component: CCComponent;
	readonly allPins: CCComponentPin[] = [];
	readonly inputPin: Record<In, CCComponentPin>;
	readonly outputPin: Record<Out, CCComponentPin>;
	readonly evaluate: (
		input: Record<In, SimulationValue[]>,
		outputShape: Record<Out, { multiplicity: number }[]>,
		previousInput: Record<In, SimulationValue[]>,
	) => SimulationValue[];

	constructor(props: Props<In, Out>) {
		this.id = this._generateId() as CCComponentId;
		this.type = props.type;
		this.name = props.name;
		this.component = {
			id: this.id,
			intrinsicType: props.type,
			name: this.name,
		};
		this.evaluate = props.evaluate;
		this.inputPin = mapValues(props.in, (p) => {
			const pin: CCComponentPin = {
				id: this._generateId() as CCComponentPinId,
				componentId: this.id,
				type: "input",
				implementation: null,
				order: this._lastLocalIndex++,
				name: p.name,
			};
			this.allPins.push(pin);
			return pin;
		});
		this.outputPin = mapValues(props.out, (p) => {
			const pin: CCComponentPin = {
				id: this._generateId() as CCComponentPinId,
				componentId: this.id,
				type: "output",
				implementation: null,
				order: this._lastLocalIndex++,
				name: p.name,
			};
			this.allPins.push(pin);
			return pin;
		});
	}
}
