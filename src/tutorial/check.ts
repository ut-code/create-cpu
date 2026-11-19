import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
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

type CheckPins = {
	inputs: readonly { name: string; bitWidth: number }[];
	outputs: readonly string[];
};

/** What a combinational circuit has to output for every combination of its inputs */
export type CombinationalCheck = CheckPins & {
	kind: "combinational";
	expected(inputs: PinValues): PinValues;
	/** Inputs the goal shows when every combination of them is too many */
	examples?: readonly PinValues[];
};

export type StepValues = { inputs: PinValues; outputs: PinValues };

/** What a circuit has to output at each time step, from the first, as it is fed inputs */
export type SequentialCheck = CheckPins & {
	kind: "sequential";
	steps: readonly StepValues[];
	/** The steps the goal shows, counted from 1 */
	shownStepNumbers: readonly number[];
};

export type CircuitCheck = CombinationalCheck | SequentialCheck;

/** How the circuit of a sequential check should behave */
export type SequentialModel<State> = {
	initialState: State;
	/** The outputs at a step, and the state the next step starts from */
	step(state: State, inputs: PinValues): { outputs: PinValues; next: State };
};

export function sequentialCheck<State>(
	pins: CheckPins,
	model: SequentialModel<State>,
	inputSteps: readonly PinValues[],
	shownStepNumbers: readonly number[],
): SequentialCheck {
	let state = model.initialState;
	const steps = inputSteps.map((inputs) => {
		const { outputs, next } = model.step(state, inputs);
		state = next;
		return { inputs, outputs };
	});
	// A mistake in the stage would otherwise show as one in the player's circuit
	const [first] = steps;
	invariant(first, "A sequential check needs a step");
	for (const [index, { inputs, outputs }] of steps.entries()) {
		for (const { name, bitWidth } of pins.inputs) {
			invariant(
				inputs[name]?.length === bitWidth,
				`Step ${index + 1} feeds ${name} a value not ${bitWidth} bits wide`,
			);
		}
		for (const name of pins.outputs) {
			invariant(
				outputs[name]?.length === first.outputs[name]?.length,
				`Step ${index + 1} expects ${name} at another width than step 1`,
			);
		}
	}
	invariant(
		shownStepNumbers.every(
			(number, index) =>
				number >= 1 &&
				number <= steps.length &&
				number > (shownStepNumbers[index - 1] ?? 0),
		),
		"The steps shown must be checked steps, in order",
	);
	return { ...pins, kind: "sequential", steps, shownStepNumbers };
}

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
	| { type: "checkFailed"; error: unknown }
	| ({ type: "wrongOutput" } & WrongOutput)
	| ({
			type: "wrongOutputAtStep";
			/** Counts from 1, as the editor shows the time step */
			stepNumber: number;
	  } & WrongOutput);

export type WrongOutput = {
	inputs: readonly { name: string; value: SimulationValue }[];
	pinName: string;
	expected: SimulationValue;
	actual: SimulationValue | undefined;
};

/** Every combination of the inputs, counting up with the first input as the high bits */
export function* inputCombinations(
	inputs: CheckPins["inputs"],
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
 * What the outputs should be for every combination of the inputs when each is one bit,
 * or else for the examples or at the steps the check shows; null when there is nothing
 * to show
 */
export function goalTableOf(check: CircuitCheck): TruthTable | null {
	const names = {
		inputs: check.inputs.map(({ name }) => name),
		outputs: [...check.outputs],
	};
	const rowOf = ({ inputs, outputs }: StepValues) => ({
		inputs: check.inputs.map(({ name }) => nullthrows(inputs[name])),
		outputs: check.outputs.map((name) => expectedValueOf(outputs, name)),
	});
	if (check.kind === "sequential") {
		const { shownStepNumbers } = check;
		if (shownStepNumbers.length === 0) return null;
		return {
			...names,
			rows: shownStepNumbers.map((number) =>
				rowOf(nullthrows(check.steps[number - 1])),
			),
			stepNumbers: [...shownStepNumbers],
		};
	}
	const rows = check.inputs.every(({ bitWidth }) => bitWidth === 1)
		? [...inputCombinations(check.inputs)]
		: (check.examples ?? []);
	if (rows.length === 0) return null;
	return {
		...names,
		rows: rows.map((inputs) =>
			rowOf({ inputs, outputs: check.expected(inputs) }),
		),
	};
}

function isSameValue(a: SimulationValue, b: SimulationValue | undefined) {
	return (
		b !== undefined &&
		a.length === b.length &&
		a.every((bit, i) => bit === b[i])
	);
}

/** The inputs to try in turn, with what the outputs should be */
function* casesOf(check: CircuitCheck): Generator<StepValues> {
	if (check.kind === "sequential") {
		yield* check.steps;
		return;
	}
	for (const inputs of inputCombinations(check.inputs)) {
		yield { inputs, outputs: check.expected(inputs) };
	}
}

export function checkCircuit(
	store: CCStore,
	componentId: CCComponentId,
	check: CircuitCheck,
): CheckResult {
	try {
		return runCheck(store, componentId, check);
	} catch (error) {
		return { type: "checkFailed", error };
	}
}

function runCheck(
	store: CCStore,
	componentId: CCComponentId,
	check: CircuitCheck,
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

	// An input nothing fixes is simulated one bit wide. A conflict or an unconnected
	// output is left to the simulation, which tells what is wrong with it.
	const bitWidthOf = (nodePinId: CCNodePinId, pinType: "input" | "output") => {
		if (store.nodePins.isInBitWidthConflict(nodePinId)) return null;
		const status = store.nodePins.getNodePinBitWidthStatus(nodePinId);
		if (status.isFixed) return status.bitWidth;
		return pinType === "input" ? DEFAULT_SIMULATION_BIT_WIDTH : null;
	};
	const someExpected = nullthrows(casesOf(check).next().value).outputs;
	const expectedBitWidths = [
		...check.inputs.map(({ name, bitWidth }) => ({
			name,
			pinType: "input" as const,
			bitWidth,
			nodePinId: nullthrows(
				store.componentPins.get(nullthrows(inputPinIds.get(name)))
					?.implementation,
			),
		})),
		...check.outputs.map((name) => ({
			name,
			pinType: "output" as const,
			bitWidth: expectedValueOf(someExpected, name).length,
			nodePinId: nullthrows(outputNodePinIds.get(name)),
		})),
	];
	for (const { name, pinType, bitWidth, nodePinId } of expectedBitWidths) {
		const actual = bitWidthOf(nodePinId, pinType);
		if (actual !== null && actual !== bitWidth) {
			return {
				type: "wrongBitWidth",
				pinName: name,
				expected: bitWidth,
				actual,
			};
		}
	}

	// Each combination starts afresh, while each step goes on from the one before
	let previousFrame: SimulationFrame | null = null;
	let stepNumber = 0;
	for (const { inputs, outputs: expected } of casesOf(check)) {
		stepNumber += 1;
		const inputValues = new Map<CCComponentPinId, SimulationValue>();
		for (const [name, pinId] of inputPinIds) {
			inputValues.set(pinId, nullthrows(inputs[name]));
		}
		let frame: SimulationFrame;
		try {
			frame = simulateComponent(store, componentId, inputValues, previousFrame);
		} catch (error) {
			return { type: "simulationFailed", error };
		}
		for (const name of check.outputs) {
			const expectedValue = expectedValueOf(expected, name);
			const actual = frame.getNodePinValue(
				nullthrows(outputNodePinIds.get(name)),
			);
			if (!isSameValue(expectedValue, actual)) {
				const wrongOutput = {
					inputs: check.inputs.map(({ name: inputName }) => ({
						name: inputName,
						value: nullthrows(inputs[inputName]),
					})),
					pinName: name,
					expected: expectedValue,
					actual,
				};
				return check.kind === "sequential"
					? { type: "wrongOutputAtStep", stepNumber, ...wrongOutput }
					: { type: "wrongOutput", ...wrongOutput };
			}
		}
		if (check.kind === "sequential") previousFrame = frame;
	}
	return { type: "passed" };
}
