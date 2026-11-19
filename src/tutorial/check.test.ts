import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import { extractNodesIntoNewComponent } from "../store/extractComponent";
import { aggregate, and, decompose, or } from "../store/intrinsics/definitions";
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
	checkCombinational,
	goalTableOf,
	inputCombinations,
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
			inputs: [{ name: "A", bitWidth: 1 }],
			outputs: ["Out"],
			expected: () => ({}),
		};

		expect(() => goalTableOf(check, [])).toThrow("Out");
	});
});

describe("checkCombinational", () => {
	it("passes a circuit that outputs what the stage asks for", () => {
		const store = wireGate(andStage, and);

		expect(
			checkCombinational(store, andStage.componentId, andStage.check),
		).toEqual({
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
		expect(
			checkCombinational(store, andStage.componentId, andStage.check),
		).toEqual({
			type: "passed",
		});
	});

	it("tells the first inputs for which an output is wrong", () => {
		const store = wireGate(andStage, or);

		expect(
			checkCombinational(store, andStage.componentId, andStage.check),
		).toEqual({
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
			checkCombinational(store, andStage.componentId, {
				...andStage.check,
				expected: () => {
					throw error;
				},
			}),
		).toEqual({ type: "checkFailed", error });
	});

	it("reports a circuit that cannot be simulated", () => {
		const { store } = stageStore(andStage);

		expect(
			checkCombinational(store, andStage.componentId, andStage.check),
		).toMatchObject({ type: "simulationFailed" });
	});

	it("reports a pin the player removed or renamed", () => {
		const { store } = stageStore(andStage);
		const pinB = store.componentPins
			.getManyByComponentId(andStage.componentId)
			.find((pin) => pin.name === "B");
		if (!pinB) throw new Error("No pin B");
		store.componentPins.update(pinB.id, { name: "C" });

		expect(
			checkCombinational(store, andStage.componentId, andStage.check),
		).toEqual({
			type: "missingPin",
			pinType: "input",
			pinName: "B",
		});
	});
});

describe("checkCombinational on pins of several bits", () => {
	const twoBitCheck: CombinationalCheck = {
		inputs: [{ name: "A", bitWidth: 2 }],
		outputs: ["Out"],
		expected: (values) => ({ Out: [...nullthrows(values.A)] }),
	};

	it("tells an input left one bit wide", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Wide");
		registerTestInputNode(store, component.id, "A");
		registerTestOutputNode(store, component.id, "Out");

		expect(checkCombinational(store, component.id, twoBitCheck)).toEqual({
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

		expect(checkCombinational(store, component.id, twoBitCheck)).toMatchObject({
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
		expect(checkCombinational(store, component.id, twoBitCheck)).toMatchObject({
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

		expect(checkCombinational(store, component.id, twoBitCheck)).toEqual({
			type: "wrongBitWidth",
			pinName: "Out",
			expected: 2,
			actual: 3,
		});
	});
});
