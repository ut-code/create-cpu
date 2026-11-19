import nullthrows from "nullthrows";
import type CCStore from "../store";
import type { CCComponentId } from "../store/component";
import type { CCComponentPinId } from "../store/componentPin";
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
			const expectedValue = nullthrows(
				expected[name],
				`The check gives no value for ${name}`,
			);
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
