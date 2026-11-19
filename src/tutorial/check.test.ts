import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import { extractNodesIntoNewComponent } from "../store/extractComponent";
import {
	aggregate,
	and,
	decompose,
	flipflop,
	not,
	or,
} from "../store/intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	registerTestOutputNode,
	splitTestNodePin,
	testNodePin,
	tryConnectTestNodePins,
} from "../store/testUtils";
import {
	type CombinationalCheck,
	checkCircuit,
	goalTableOf,
	inputCombinations,
	type PinValues,
	sequentialCheck,
} from "./check";
import {
	findTutorialStage,
	setUpTutorialStage,
	type TutorialStage,
} from "./stages";

function stageStore(stage: TutorialStage) {
	const store = createTestStore();
	setUpTutorialStage(store, stage, (id) => id);
	const pins = store.componentPins.getManyByComponentId(stage.componentId);
	const pinOf = (name: string) => {
		const pin = pins.find((p) => p.name === name);
		if (!pin?.implementation) throw new Error(`No pin ${name}`);
		return pin.implementation;
	};
	return { store, pinOf };
}

function wireGate(stage: TutorialStage, gate: typeof and | typeof or) {
	const { store, pinOf } = stageStore(stage);
	const node = registerTestNode(store, stage.componentId, gate.component.id);
	const connect = (
		from: Parameters<typeof connectTestNodePins>[2],
		to: typeof from,
	) => connectTestNodePins(store, stage.componentId, from, to);
	connect(pinOf("A"), testNodePin(store, node, gate.inputPin.A));
	connect(pinOf("B"), testNodePin(store, node, gate.inputPin.B));
	connect(testNodePin(store, node, gate.outputPin.Out), pinOf("Out"));
	return store;
}

const andStage = nullthrows(findTutorialStage("and"));
const xorStage = nullthrows(findTutorialStage("xor"));

describe("inputCombinations", () => {
	it("counts up with the first input as the high bits", () => {
		const combinations = [
			...inputCombinations([
				{ name: "A", bitWidth: 2 },
				{ name: "B", bitWidth: 1 },
			]),
		];

		expect(combinations).toHaveLength(8);
		expect(combinations[0]).toEqual({ A: [false, false], B: [false] });
		expect(combinations[1]).toEqual({ A: [false, false], B: [true] });
		expect(combinations[2]).toEqual({ A: [false, true], B: [false] });
		expect(combinations[7]).toEqual({ A: [true, true], B: [true] });
	});
});

describe("goalTableOf", () => {
	it("lists what the stage asks for, in the order the check tries the inputs", () => {
		expect(goalTableOf(xorStage.check, [])).toEqual({
			inputs: ["A", "B"],
			outputs: ["Out"],
			rows: [
				{ inputs: [[false], [false]], outputs: [[false]] },
				{ inputs: [[false], [true]], outputs: [[true]] },
				{ inputs: [[true], [false]], outputs: [[true]] },
				{ inputs: [[true], [true]], outputs: [[false]] },
			],
		});
	});

	it("lists several outputs in the order the stage names them", () => {
		const halfAdder = nullthrows(findTutorialStage("half-adder"));

		expect(goalTableOf(halfAdder.check, [])?.rows).toEqual([
			{ inputs: [[false], [false]], outputs: [[false], [false]] },
			{ inputs: [[false], [true]], outputs: [[false], [true]] },
			{ inputs: [[true], [false]], outputs: [[false], [true]] },
			{ inputs: [[true], [true]], outputs: [[true], [false]] },
		]);
	});

	it("shows only the examples when an input has several bits", () => {
		const wide: CombinationalCheck = {
			kind: "combinational",
			inputs: [{ name: "A", bitWidth: 2 }],
			outputs: ["Out"],
			expected: (values) => ({ Out: [...nullthrows(values.A)].reverse() }),
		};

		expect(goalTableOf(wide, [])).toBeNull();
		expect(goalTableOf(wide, [{ A: [true, false] }])?.rows).toEqual([
			{ inputs: [[true, false]], outputs: [[false, true]] },
		]);
	});

	it("refuses a check that gives no value for an output", () => {
		const check: CombinationalCheck = {
			kind: "combinational",
			inputs: [{ name: "A", bitWidth: 1 }],
			outputs: ["Out"],
			expected: () => ({}),
		};

		expect(() => goalTableOf(check, [])).toThrow("Out");
	});
});

describe("checkCircuit", () => {
	it("passes a circuit that outputs what the stage asks for", () => {
		const store = wireGate(andStage, and);

		expect(checkCircuit(store, andStage.componentId, andStage.check)).toEqual({
			type: "passed",
		});
	});

	it("passes a circuit grouped into a component of the player's own", async () => {
		const store = wireGate(andStage, and);
		const gates = store.nodes
			.getManyByParentComponentId(andStage.componentId)
			.filter((node) => node.componentId === and.component.id);

		await extractNodesIntoNewComponent(
			store,
			gates.map((node) => node.id),
			"Mine",
		);

		expect(
			store.nodes
				.getManyByParentComponentId(andStage.componentId)
				.some((node) => node.componentId === and.component.id),
		).toBe(false);
		expect(checkCircuit(store, andStage.componentId, andStage.check)).toEqual({
			type: "passed",
		});
	});

	it("tells the first inputs for which an output is wrong", () => {
		const store = wireGate(andStage, or);

		expect(checkCircuit(store, andStage.componentId, andStage.check)).toEqual({
			type: "wrongOutput",
			inputs: [
				{ name: "A", value: [false] },
				{ name: "B", value: [true] },
			],
			pinName: "Out",
			expected: [false],
			actual: [true],
		});
	});

	it("reports a check that throws instead of throwing", () => {
		const { store } = stageStore(andStage);
		const error = new Error("broken");

		expect(
			checkCircuit(store, andStage.componentId, {
				...andStage.check,
				kind: "combinational",
				expected: () => {
					throw error;
				},
			}),
		).toEqual({ type: "checkFailed", error });
	});

	it("reports a circuit that cannot be simulated", () => {
		const { store } = stageStore(andStage);

		expect(
			checkCircuit(store, andStage.componentId, andStage.check),
		).toMatchObject({ type: "simulationFailed" });
	});

	it("reports a pin the player removed or renamed", () => {
		const { store } = stageStore(andStage);
		const pinB = store.componentPins
			.getManyByComponentId(andStage.componentId)
			.find((pin) => pin.name === "B");
		if (!pinB) throw new Error("No pin B");
		store.componentPins.update(pinB.id, { name: "C" });

		expect(checkCircuit(store, andStage.componentId, andStage.check)).toEqual({
			type: "missingPin",
			pinType: "input",
			pinName: "B",
		});
	});
});

describe("checkCircuit on pins of several bits", () => {
	const twoBitCheck: CombinationalCheck = {
		kind: "combinational",
		inputs: [{ name: "A", bitWidth: 2 }],
		outputs: ["Out"],
		expected: (values) => ({ Out: [...nullthrows(values.A)] }),
	};

	it("tells an input left one bit wide", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Wide");
		registerTestInputNode(store, component.id, "A");
		registerTestOutputNode(store, component.id, "Out");

		expect(checkCircuit(store, component.id, twoBitCheck)).toEqual({
			type: "wrongBitWidth",
			pinName: "A",
			expected: 2,
			actual: 1,
		});
	});

	it("leaves an unconnected output to the simulation", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Wide");
		const a = registerTestInputNode(store, component.id, "A");
		registerTestOutputNode(store, component.id, "Out");
		const split = registerTestNode(store, component.id, decompose.component.id);
		splitTestNodePin(store, split, decompose.outputPin.Out, [1, 1]);
		connectTestNodePins(
			store,
			component.id,
			a.out,
			testNodePin(store, split, decompose.inputPin.In),
		);

		expect(checkCircuit(store, component.id, twoBitCheck)).toMatchObject({
			type: "simulationFailed",
		});
	});

	it("leaves a pin in a width conflict to the simulation", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Wide");
		const a = registerTestInputNode(store, component.id, "A");
		registerTestOutputNode(store, component.id, "Out");
		const split = registerTestNode(store, component.id, decompose.component.id);
		splitTestNodePin(store, split, decompose.outputPin.Out, [1, 1]);
		const joined = registerTestNode(
			store,
			component.id,
			aggregate.component.id,
		);
		connectTestNodePins(
			store,
			component.id,
			a.out,
			testNodePin(store, split, decompose.inputPin.In),
		);
		tryConnectTestNodePins(
			store,
			component.id,
			a.out,
			testNodePin(store, joined, aggregate.inputPin.In),
			{ allowBitWidthConflict: true },
		);

		expect(store.nodePins.isInBitWidthConflict(a.out)).toBe(true);
		expect(checkCircuit(store, component.id, twoBitCheck)).toMatchObject({
			type: "simulationFailed",
		});
	});

	it("tells an output fixed to another width", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Wide");
		const a = registerTestInputNode(store, component.id, "A");
		const out = registerTestOutputNode(store, component.id, "Out");
		const split = registerTestNode(store, component.id, decompose.component.id);
		splitTestNodePin(store, split, decompose.outputPin.Out, [1, 1]);
		const joined = registerTestNode(
			store,
			component.id,
			aggregate.component.id,
		);
		splitTestNodePin(store, joined, aggregate.inputPin.In, [1, 1, 1]);
		connectTestNodePins(
			store,
			component.id,
			a.out,
			testNodePin(store, split, decompose.inputPin.In),
		);
		connectTestNodePins(
			store,
			component.id,
			testNodePin(store, joined, aggregate.outputPin.Out),
			out.in,
		);

		expect(checkCircuit(store, component.id, twoBitCheck)).toEqual({
			type: "wrongBitWidth",
			pinName: "Out",
			expected: 2,
			actual: 3,
		});
	});
});

describe("sequentialCheck", () => {
	it("works out each step's outputs from the model, carrying its state on", () => {
		const check = sequentialCheck(
			{ inputs: [{ name: "Up", bitWidth: 1 }], outputs: ["Count"] },
			{
				initialState: 0,
				step: (count, { Up }) => ({
					outputs: { Count: [count === 1] },
					next: nullthrows(Up?.[0]) ? count + 1 : count,
				}),
			},
			[[true], [false], [true]].map((Up) => ({ Up })),
		);

		expect(check.steps.map(({ outputs }) => outputs)).toEqual([
			{ Count: [false] },
			{ Count: [true] },
			{ Count: [true] },
		]);
	});
});

describe("checkCircuit over time", () => {
	const onOff = (...bits: boolean[]): PinValues[] =>
		bits.map((A) => ({ A: [A] }));
	/** Out is what A was a step before, starting from OFF */
	const delayCheck = (inputSteps: readonly PinValues[]) =>
		sequentialCheck(
			{ inputs: [{ name: "A", bitWidth: 1 }], outputs: ["Out"] },
			{
				initialState: false,
				step: (previous, { A }) => ({
					outputs: { Out: [previous] },
					next: nullthrows(A?.[0]),
				}),
			},
			inputSteps,
		);

	function registerPassThrough(throughFlipFlop: boolean) {
		const store = createTestStore();
		const component = registerTestComponent(store, "Delay");
		const a = registerTestInputNode(store, component.id, "A");
		const out = registerTestOutputNode(store, component.id, "Out");
		if (throughFlipFlop) {
			const ff = registerTestNode(store, component.id, flipflop.component.id);
			const connect = (
				from: Parameters<typeof connectTestNodePins>[2],
				to: typeof from,
			) => connectTestNodePins(store, component.id, from, to);
			connect(a.out, testNodePin(store, ff, flipflop.inputPin.In));
			connect(testNodePin(store, ff, flipflop.outputPin.Out), out.in);
		} else {
			connectTestNodePins(store, component.id, a.out, out.in);
		}
		return { store, componentId: component.id };
	}

	it("feeds each step what the flip-flops held from the step before", () => {
		const { store, componentId } = registerPassThrough(true);

		expect(
			checkCircuit(
				store,
				componentId,
				delayCheck(onOff(false, true, true, false, true)),
			),
		).toEqual({ type: "passed" });
	});

	it("tells the first step at which an output is wrong, with the inputs then", () => {
		const { store, componentId } = registerPassThrough(false);

		expect(
			checkCircuit(store, componentId, delayCheck(onOff(false, false, true))),
		).toEqual({
			type: "wrongOutputAtStep",
			stepNumber: 3,
			inputs: [{ name: "A", value: [true] }],
			pinName: "Out",
			expected: [false],
			actual: [true],
		});
	});

	it("checks a circuit without inputs that changes by itself", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Blink");
		const out = registerTestOutputNode(store, component.id, "Out");
		const ff = registerTestNode(store, component.id, flipflop.component.id);
		const invert = registerTestNode(store, component.id, not.component.id);
		const connect = (
			from: Parameters<typeof connectTestNodePins>[2],
			to: typeof from,
		) => connectTestNodePins(store, component.id, from, to);
		connect(
			testNodePin(store, ff, flipflop.outputPin.Out),
			testNodePin(store, invert, not.inputPin.In),
		);
		connect(
			testNodePin(store, invert, not.outputPin.Out),
			testNodePin(store, ff, flipflop.inputPin.In),
		);
		connect(testNodePin(store, ff, flipflop.outputPin.Out), out.in);
		const blink = sequentialCheck(
			{ inputs: [], outputs: ["Out"] },
			{
				initialState: false,
				step: (isOn) => ({ outputs: { Out: [isOn] }, next: !isOn }),
			},
			new Array<PinValues>(4).fill({}),
		);

		expect(checkCircuit(store, component.id, blink)).toEqual({
			type: "passed",
		});
	});
});
