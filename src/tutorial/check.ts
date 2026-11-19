import nullthrows from "nullthrows";
import type CCStore from "../store";
import type { CCComponentId } from "../store/component";
import type { CCComponentPinId } from "../store/componentPin";
import type { TruthTable } from "../store/intrinsics/truthTable";
import { DEFAULT_SIMULATION_BIT_WIDTH } from "../store/netlist";
import type { CCNodePinId } from "../store/nodePin";
import simulateComponent, {
	type SimulationFrame,
	type SimulationValue,
} from "../store/simulation";

export type PinValues = Readonly<Record<string, SimulationValue>>;

/** What a combinational circuit has to output for every combination of its inputs */
export type CombinationalCheck = {
	inputs: readonly { name: string; bitWidth: number }[];
	outputs: readonly string[];
	expected(inputs: PinValues): PinValues;
};

export type CheckResult =
	| { type: "passed" }
	| { type: "missingPin"; pinType: "input" | "output"; pinName: string }
	| {
			type: "wrongBitWidth";
			pinName: string;
			expected: number;
			actual: number;
	  }
	| { type: "simulationFailed"; error: unknown }
	| {
			type: "wrongOutput";
			inputs: readonly { name: string; value: SimulationValue }[];
			pinName: string;
			expected: SimulationValue;
			actual: SimulationValue | undefined;
	  };

/** Every combination of the inputs, counting up with the first input as the high bits */
export function* inputCombinations(
	inputs: CombinationalCheck["inputs"],
): Generator<PinValues> {
	const totalBits = inputs.reduce((sum, input) => sum + input.bitWidth, 0);
	for (let n = 0; n < 2 ** totalBits; n += 1) {
		const values: Record<string, SimulationValue> = {};
		let shift = totalBits;
		for (const input of inputs) {
			shift -= input.bitWidth;
			values[input.name] = Array.from(
				{ length: input.bitWidth },
				(_, i) => ((n >> (shift + input.bitWidth - 1 - i)) & 1) === 1,
			);
		}
		yield values;
	}
}

function expectedValueOf(expected: PinValues, name: string) {
	return nullthrows(expected[name], `The check gives no value for ${name}`);
}

/**
 * Every combination of the inputs when each is one bit, or else the given examples,
 * with what the outputs should be; null when there is nothing to show
 */
export function goalTableOf(
	check: CombinationalCheck,
	examples: readonly PinValues[],
): TruthTable | null {
	const rows = check.inputs.every(({ bitWidth }) => bitWidth === 1)
		? [...inputCombinations(check.inputs)]
		: examples;
	if (rows.length === 0) return null;
	return {
		inputs: check.inputs.map(({ name }) => name),
		outputs: [...check.outputs],
		rows: rows.map((inputs) => {
			const expected = check.expected(inputs);
			return {
				inputs: check.inputs.map(({ name }) => nullthrows(inputs[name])),
				outputs: check.outputs.map((name) => expectedValueOf(expected, name)),
			};
		}),
	};
}

function isSameValue(a: SimulationValue, b: SimulationValue | undefined) {
	return (
		b !== undefined &&
		a.length === b.length &&
		a.every((bit, i) => bit === b[i])
	);
}

export function checkCombinational(
	store: CCStore,
	componentId: CCComponentId,
	check: CombinationalCheck,
): CheckResult {
	const pins = store.componentPins.getManyByComponentId(componentId);
	const findPin = (pinType: "input" | "output", pinName: string) =>
		pins.find((pin) => pin.type === pinType && pin.name === pinName);

	const inputPinIds = new Map<string, CCComponentPinId>();
	for (const { name } of check.inputs) {
		const pin = findPin("input", name);
		if (!pin) return { type: "missingPin", pinType: "input", pinName: name };
		inputPinIds.set(name, pin.id);
	}
	const outputNodePinIds = new Map<string, CCNodePinId>();
	for (const name of check.outputs) {
		const pin = findPin("output", name);
		if (!pin?.implementation) {
			return { type: "missingPin", pinType: "output", pinName: name };
		}
		outputNodePinIds.set(name, pin.implementation);
	}

	// A pin whose width nothing fixes is simulated as one bit wide
	const bitWidthOf = (nodePinId: CCNodePinId) => {
		const status = store.nodePins.getNodePinBitWidthStatus(nodePinId);
		return status.isFixed ? status.bitWidth : DEFAULT_SIMULATION_BIT_WIDTH;
	};
	const someExpected = check.expected(
		nullthrows(inputCombinations(check.inputs).next().value),
	);
	const expectedBitWidths = [
		...check.inputs.map(({ name, bitWidth }) => ({
			name,
			bitWidth,
			nodePinId: nullthrows(
				store.componentPins.get(nullthrows(inputPinIds.get(name)))
					?.implementation,
			),
		})),
		...check.outputs.map((name) => ({
			name,
			bitWidth: expectedValueOf(someExpected, name).length,
			nodePinId: nullthrows(outputNodePinIds.get(name)),
		})),
	];
	for (const { name, bitWidth, nodePinId } of expectedBitWidths) {
		const actual = bitWidthOf(nodePinId);
		if (actual !== bitWidth) {
			return {
				type: "wrongBitWidth",
				pinName: name,
				expected: bitWidth,
				actual,
			};
		}
	}

	for (const inputs of inputCombinations(check.inputs)) {
		const inputValues = new Map<CCComponentPinId, SimulationValue>();
		for (const [name, pinId] of inputPinIds) {
			inputValues.set(pinId, nullthrows(inputs[name]));
		}
		let frame: SimulationFrame;
		try {
			frame = simulateComponent(store, componentId, inputValues);
		} catch (error) {
			return { type: "simulationFailed", error };
		}
		const expected = check.expected(inputs);
		for (const name of check.outputs) {
			const expectedValue = expectedValueOf(expected, name);
			const actual = frame.getNodePinValue(
				nullthrows(outputNodePinIds.get(name)),
			);
			if (!isSameValue(expectedValue, actual)) {
				return {
					type: "wrongOutput",
					inputs: check.inputs.map(({ name: inputName }) => ({
						name: inputName,
						value: nullthrows(inputs[inputName]),
					})),
					pinName: name,
					expected: expectedValue,
					actual,
				};
			}
		}
	}
	return { type: "passed" };
}
