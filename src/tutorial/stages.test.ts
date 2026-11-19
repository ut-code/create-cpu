import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import { and, input, output, xor } from "../store/intrinsics/definitions";
import {
	createTestStore,
	registerTestComponent,
	registerTestNode,
} from "../store/testUtils";
import { checkCombinational } from "./check";
import { StageCircuit } from "./circuit";
import {
	findTutorialStage,
	hasStageComponents,
	isStagePart,
	isStagePinNode,
	setUpTutorialStage,
	type TutorialStageId,
	tutorialStages,
} from "./stages";

const [stage] = tutorialStages;
if (!stage) throw new Error("No stage");
const titleOf = (id: TutorialStageId) => `Stage ${id}`;

describe("tutorialStages", () => {
	it.each(tutorialStages.map((s) => [s.id, s] as const))(
		"%s is cleared by its solution, made of the parts it offers",
		(_, solved) => {
			const store = createTestStore();
			setUpTutorialStage(store, solved, titleOf);

			solved.solve(new StageCircuit(store, solved.componentId));

			expect(
				checkCombinational(store, solved.componentId, solved.check),
			).toEqual({ type: "passed" });
			const placed = store.nodes
				.getManyByParentComponentId(solved.componentId)
				.filter((node) => !isStagePinNode(store, solved, node.id))
				.map((node) => node.componentId);
			const offered = [
				...solved.parts,
				...solved.givenParts.map(
					(id) => nullthrows(findTutorialStage(id)).componentId,
				),
			];
			expect(placed.length).toBeGreaterThan(0);
			expect(offered).toEqual(expect.arrayContaining(placed));
		},
	);
});

describe("setUpTutorialStage", () => {
	it("hands over the parts of earlier stages, built and named after them", () => {
		const xorStage = nullthrows(findTutorialStage("xor"));
		const aOnlyStage = nullthrows(findTutorialStage("a-only"));
		const store = createTestStore();

		setUpTutorialStage(store, xorStage, titleOf);

		expect(hasStageComponents(store, xorStage)).toBe(true);
		expect(store.components.get(aOnlyStage.componentId)?.name).toBe(
			"Stage a-only",
		);
		expect(
			checkCombinational(store, aOnlyStage.componentId, aOnlyStage.check),
		).toEqual({ type: "passed" });
	});
});

describe("isStagePinNode", () => {
	it("tells the pins the stage placed from the nodes the player adds", () => {
		const store = createTestStore();
		setUpTutorialStage(store, stage, titleOf);
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
		const inStage = (component: Parameters<typeof isStagePart>[1]) =>
			isStagePart(stage, component, stage.componentId);

		expect(inStage(and.component)).toBe(true);
		expect(inStage(own)).toBe(true);
		expect(inStage(xor.component)).toBe(false);
		expect(inStage(input.component)).toBe(false);
	});

	it("offers pins inside a component the player made", () => {
		const store = createTestStore();
		const own = registerTestComponent(store, "Mine");

		expect(isStagePart(stage, input.component, own.id)).toBe(true);
		expect(isStagePart(stage, output.component, own.id)).toBe(true);
		expect(isStagePart(stage, xor.component, own.id)).toBe(false);
	});
});
