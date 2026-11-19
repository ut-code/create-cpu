import { describe, expect, it } from "vitest";
import { extractNodesIntoNewComponent } from "../store/extractComponent";
import { and, not, or } from "../store/intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestNode,
	testNodePin,
} from "../store/testUtils";
import {
	type CombinationalCheck,
	checkCombinational,
	inputCombinations,
	truthTableOfCheck,
} from "./check";
import {
	setUpTutorialStage,
	type TutorialStage,
	tutorialStages,
} from "./stages";

function stageStore(stage: TutorialStage) {
	const store = createTestStore();
	setUpTutorialStage(store, stage, "Lamp");
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

const [andStage, xorStage] = tutorialStages;
if (!andStage || !xorStage) throw new Error("Two stages are expected");

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

describe("truthTableOfCheck", () => {
	it("lists what the stage asks for, in the order the check tries the inputs", () => {
		expect(truthTableOfCheck(xorStage.check)).toEqual({
			inputs: ["A", "B"],
			outputs: ["Out"],
			rows: [
				{ inputs: [false, false], outputs: [false] },
				{ inputs: [false, true], outputs: [true] },
				{ inputs: [true, false], outputs: [true] },
				{ inputs: [true, true], outputs: [false] },
			],
		});
	});

	it("gives no table when a pin carries more than one bit", () => {
		const wideInput: CombinationalCheck = {
			inputs: [{ name: "A", bitWidth: 2 }],
			outputs: ["Out"],
			expected: () => ({ Out: [false] }),
		};
		const wideOutput: CombinationalCheck = {
			inputs: [{ name: "A", bitWidth: 1 }],
			outputs: ["Out"],
			expected: () => ({ Out: [false, false] }),
		};

		expect(truthTableOfCheck(wideInput)).toBeNull();
		expect(truthTableOfCheck(wideOutput)).toBeNull();
	});

	it("refuses a check that gives no value for an output", () => {
		const check: CombinationalCheck = {
			inputs: [{ name: "A", bitWidth: 1 }],
			outputs: ["Out"],
			expected: () => ({}),
		};

		expect(() => truthTableOfCheck(check)).toThrow("Out");
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

	it("passes the second stage built from AND, OR and NOT", () => {
		const { store, pinOf } = stageStore(xorStage);
		const id = xorStage.componentId;
		const either = registerTestNode(store, id, or.component.id);
		const both = registerTestNode(store, id, and.component.id);
		const notBoth = registerTestNode(store, id, not.component.id);
		const only = registerTestNode(store, id, and.component.id);
		const connect = (
			from: Parameters<typeof connectTestNodePins>[2],
			to: typeof from,
		) => connectTestNodePins(store, id, from, to);
		for (const [node, gate] of [
			[either, or],
			[both, and],
		] as const) {
			connect(pinOf("A"), testNodePin(store, node, gate.inputPin.A));
			connect(pinOf("B"), testNodePin(store, node, gate.inputPin.B));
		}
		connect(
			testNodePin(store, both, and.outputPin.Out),
			testNodePin(store, notBoth, not.inputPin.In),
		);
		connect(
			testNodePin(store, either, or.outputPin.Out),
			testNodePin(store, only, and.inputPin.A),
		);
		connect(
			testNodePin(store, notBoth, not.outputPin.Out),
			testNodePin(store, only, and.inputPin.B),
		);
		connect(testNodePin(store, only, and.outputPin.Out), pinOf("Out"));

		expect(checkCombinational(store, id, xorStage.check)).toEqual({
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
