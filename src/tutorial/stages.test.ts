import { describe, expect, it } from "vitest";
import { and, input, xor } from "../store/intrinsics/definitions";
import {
	createTestStore,
	registerTestComponent,
	registerTestNode,
} from "../store/testUtils";
import {
	isStagePart,
	isStagePinNode,
	setUpTutorialStage,
	tutorialStages,
} from "./stages";

const [stage] = tutorialStages;
if (!stage) throw new Error("No stage");

describe("isStagePinNode", () => {
	it("tells the pins the stage placed from the nodes the player adds", () => {
		const store = createTestStore();
		setUpTutorialStage(store, stage, "Lamp");
		const placed = store.nodes.getManyByParentComponentId(stage.componentId);
		const gate = registerTestNode(store, stage.componentId, and.component.id);
		const own = registerTestComponent(store, "Mine");
		const pinOfOwn = registerTestNode(store, own.id, input.component.id);

		expect(placed).toHaveLength(3);
		for (const node of placed) {
			expect(isStagePinNode(store, stage, node.id)).toBe(true);
		}
		expect(isStagePinNode(store, stage, gate.id)).toBe(false);
		expect(isStagePinNode(store, stage, pinOfOwn.id)).toBe(false);
	});
});

describe("isStagePart", () => {
	it("offers the stage's parts and the components the player made", () => {
		const store = createTestStore();
		const own = registerTestComponent(store, "Mine");

		expect(isStagePart(stage, and.component)).toBe(true);
		expect(isStagePart(stage, own)).toBe(true);
		expect(isStagePart(stage, xor.component)).toBe(false);
		expect(isStagePart(stage, input.component)).toBe(false);
	});
});
