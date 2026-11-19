import { describe, expect, it } from "vitest";
import { and, or } from "../store/intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestNode,
	testNodePin,
} from "../store/testUtils";
import { checkCombinational } from "./check";
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

const [andStage] = tutorialStages;
if (!andStage) throw new Error("No stage");

describe("checkCombinational", () => {
	it("passes a circuit that outputs what the stage asks for", () => {
		const store = wireGate(andStage, and);

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
