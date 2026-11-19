import { mapValues } from "es-toolkit";
import nullthrows from "nullthrows";
import type { SimulationValue } from "../simulation";
import { IntrinsicComponentDefinition } from "./base";

export type TruthTable = {
	inputs: string[];
	outputs: string[];
	rows: {
		inputs: SimulationValue[];
		outputs: SimulationValue[];
		/** For a table over time, counted from 1 */
		stepNumber?: number;
	}[];
};

const maxInputCount = 2;

/** null for a part a small table cannot show, e.g. one with settings or a state */
export function truthTableOf(
	definition: IntrinsicComponentDefinition,
): TruthTable | null {
	const { behavior } = definition;
	if (behavior?.kind !== "combinational") return null;
	const inputKeys = Object.keys(definition.inputPin);
	const outputKeys = Object.keys(definition.outputPin);
	const isEachPinInferred = definition.allPins.every(
		(pin) =>
			IntrinsicComponentDefinition.getPinAttributesByPinId(pin.id)
				?.bitWidthPolicy.type === "inferred",
	);
	if (
		!isEachPinInferred ||
		inputKeys.length > maxInputCount ||
		outputKeys.length === 0
	) {
		return null;
	}

	const rows = Array.from({ length: 2 ** inputKeys.length }, (_, n) => {
		const inputs = inputKeys.map(
			(_, i) => ((n >> (inputKeys.length - 1 - i)) & 1) === 1,
		);
		const values = behavior.evaluate(
			Object.fromEntries(
				inputKeys.map((key, i) => [key, [[nullthrows(inputs[i])]]]),
			),
			{
				outputBitWidths: mapValues(definition.outputPin, () => [1]),
				config: definition.initialConfig,
			},
		);
		return {
			inputs: inputs.map((input) => [input]),
			outputs: outputKeys.map((key) =>
				nullthrows(values[key]?.[0], `No value for ${key}`),
			),
		};
	});
	const nameOf = (pins: Record<string, { name: string }>, key: string) =>
		nullthrows(pins[key]).name;
	return {
		inputs: inputKeys.map((key) => nameOf(definition.inputPin, key)),
		outputs: outputKeys.map((key) => nameOf(definition.outputPin, key)),
		rows,
	};
}
