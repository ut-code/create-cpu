import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import { pointsOnConnection } from "../pages/edit/Editor/renderer/Connection/path";
import { getCCComponentEditorRendererNodeGeometry } from "../pages/edit/Editor/renderer/Node/geometry";
import type { CCComponentId } from "../store/component";
import {
	and,
	display,
	input,
	not,
	or,
	output,
	seven_segment,
	xor,
} from "../store/intrinsics/definitions";
import type { CCNodeId } from "../store/node";
import type { CCNodePinId } from "../store/nodePin";
import {
	createTestStore,
	registerTestComponent,
	registerTestNode,
} from "../store/testUtils";
import { checkCircuit, goalTableOf } from "./check";
import {
	findTutorialStage,
	isStagePart,
	isStagePinNode,
	setUpTutorialStage,
	type TutorialStageId,
	tutorialStages,
} from "./stages";

const [stage] = tutorialStages;
if (!stage) throw new Error("No stage");
const xorStage = nullthrows(findTutorialStage("xor"));
const aOnlyStage = nullthrows(findTutorialStage("a-only"));
const titleOf = (id: TutorialStageId) => `Stage ${id}`;

describe("tutorialStages", () => {
	it("writes tables in digits from the stage that teaches binary on", () => {
		const binaryFrom = tutorialStages.findIndex((s) => s.id === "half-adder");

		expect(tutorialStages.map((s) => s.tableNotation)).toEqual(
			tutorialStages.map((_, index) =>
				index < binaryFrom ? "onOff" : "digits",
			),
		);
	});

	it("hands over only the parts of earlier stages", () => {
		for (const [index, later] of tutorialStages.entries()) {
			for (const id of later.givenParts) {
				expect(tutorialStages.findIndex((s) => s.id === id)).toBeLessThan(
					index,
				);
			}
		}
	});

	it.each(tutorialStages.map((s) => [s.id, s] as const))(
		"%s is cleared by its solution, made of the parts it offers",
		(_, solved) => {
			const store = createTestStore();
			const solve = setUpTutorialStage(store, solved, titleOf);
			const laidOut = new Set(
				store.nodes
					.getManyByParentComponentId(solved.componentId)
					.map((node) => node.id),
			);

			solve();

			expect(checkCircuit(store, solved.componentId, solved.check)).toEqual({
				type: "passed",
			});
			const placed = store.nodes
				.getManyByParentComponentId(solved.componentId)
				.filter((node) => !laidOut.has(node.id))
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

describe("the layout of every stage", () => {
	it.each(tutorialStages.map((s) => [s.id, s] as const))(
		"%s places no node over another, also once solved",
		(_, laidOut) => {
			const store = createTestStore();
			setUpTutorialStage(store, laidOut, titleOf)();
			const rects = store.nodes
				.getManyByParentComponentId(laidOut.componentId)
				.map((node) => ({
					name: nullthrows(store.components.get(node.componentId)).name,
					...getCCComponentEditorRendererNodeGeometry(store, node.id).rect,
				}));
			const overlaps = rects.flatMap((a, i) =>
				rects
					.slice(i + 1)
					.filter(
						(b) =>
							a.position.x < b.position.x + b.size.x &&
							b.position.x < a.position.x + a.size.x &&
							a.position.y < b.position.y + b.size.y &&
							b.position.y < a.position.y + a.size.y,
					)
					.map((b) => `${a.name} and ${b.name}`),
			);

			expect(overlaps).toEqual([]);
		},
	);
});

describe("the wires every stage starts with", () => {
	// A node's name is written above it
	const titleHeight = 17;
	const clearance = 6;

	it.each(tutorialStages.map((s) => [s.id, s] as const))(
		"%s runs no wire over a node or its name",
		(_, laidOut) => {
			const store = createTestStore();
			setUpTutorialStage(store, laidOut, titleOf);
			const nodes = store.nodes.getManyByParentComponentId(laidOut.componentId);
			const nameOf = (nodeId: CCNodeId) =>
				nullthrows(
					store.components.get(nullthrows(store.nodes.get(nodeId)).componentId),
				).name;
			const endpointOf = (nodePinId: CCNodePinId) => {
				const nodePin = nullthrows(store.nodePins.get(nodePinId));
				return {
					nodeId: nodePin.nodeId,
					direction: nullthrows(store.componentPins.get(nodePin.componentPinId))
						.type,
					position: nullthrows(
						getCCComponentEditorRendererNodeGeometry(
							store,
							nodePin.nodeId,
						).nodePinPositionById.get(nodePinId),
					),
				};
			};
			const crossings = store.connections
				.getManyByParentComponentId(laidOut.componentId)
				.flatMap((connection) => {
					const from = endpointOf(connection.from);
					const to = endpointOf(connection.to);
					const points = pointsOnConnection(from, to, 100);
					return nodes
						.filter((node) => {
							const { position, size } =
								getCCComponentEditorRendererNodeGeometry(store, node.id).rect;
							return points.some(
								(point) =>
									point.x > position.x - clearance &&
									point.x < position.x + size.x + clearance &&
									point.y > position.y - titleHeight - clearance &&
									point.y < position.y + size.y + clearance,
							);
						})
						.map(
							(node) =>
								`${nameOf(from.nodeId)} to ${nameOf(to.nodeId)} over ${nameOf(node.id)}`,
						);
				});

			expect(crossings).toEqual([]);
		},
	);
});

describe("setUpTutorialStage", () => {
	it("hands over the parts of earlier stages, built and named after them", () => {
		const store = createTestStore();

		setUpTutorialStage(store, xorStage, titleOf);

		expect(store.components.get(aOnlyStage.componentId)?.name).toBe(
			"Stage a-only",
		);
		expect(
			checkCircuit(store, aOnlyStage.componentId, aOnlyStage.check),
		).toEqual({ type: "passed" });
	});
});

describe("the counter stage", () => {
	it("shows the first steps and the wrap from 1111 to 0000 as its goal", () => {
		const counter = nullthrows(findTutorialStage("counter"));
		const table = nullthrows(goalTableOf(counter.check));

		expect(
			table.rows.map(({ stepNumber, outputs }) => [
				stepNumber,
				outputs.map((value) => value.map(Number).join("")),
			]),
		).toEqual([
			[1, ["0000"]],
			[2, ["0001"]],
			[3, ["0010"]],
			[16, ["1111"]],
			[17, ["0000"]],
		]);
	});
});

describe("the decimal digit stage", () => {
	it("shows Count held at 1001 while Up is OFF, and the carry back to 0000", () => {
		const decimal = nullthrows(findTutorialStage("decimal-digit"));
		const table = nullthrows(goalTableOf(decimal.check));
		const digitsOf = (values: boolean[][]) =>
			values.map((value) => value.map(Number).join(""));

		expect(table.inputs).toEqual(["Up"]);
		expect(table.outputs).toEqual(["Count", "Carry"]);
		expect(
			table.rows.map(({ stepNumber, inputs, outputs }) => [
				stepNumber,
				...digitsOf(inputs),
				...digitsOf(outputs),
			]),
		).toEqual([
			[1, "1", "0000", "0"],
			[2, "1", "0001", "0"],
			[10, "0", "1001", "0"],
			[11, "0", "1001", "0"],
			[12, "1", "1001", "1"],
			[13, "1", "0000", "0"],
		]);
	});
});

describe("setUpTutorialStage with decorations", () => {
	it("places the display only for the player, not inside the part handed over", () => {
		const fourBit = nullthrows(findTutorialStage("four-bit-adder"));
		const counter = nullthrows(findTutorialStage("counter"));
		const store = createTestStore();
		setUpTutorialStage(store, counter, titleOf);
		const decorationsIn = (componentId: CCComponentId) =>
			store.nodes
				.getManyByParentComponentId(componentId)
				.filter(
					(node) =>
						node.componentId === seven_segment.component.id ||
						node.componentId === display.component.id,
				);

		expect(decorationsIn(counter.componentId)).toHaveLength(2);
		expect(decorationsIn(fourBit.componentId)).toHaveLength(0);
		expect(checkCircuit(store, fourBit.componentId, fourBit.check)).toEqual({
			type: "passed",
		});
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

	it("keeps the pins of a part handed over too", () => {
		const store = createTestStore();
		setUpTutorialStage(store, xorStage, titleOf);
		const nodesOfGiven = store.nodes.getManyByParentComponentId(
			aOnlyStage.componentId,
		);
		const isPin = (componentId: string) =>
			componentId === input.component.id || componentId === output.component.id;

		expect(nodesOfGiven.filter((node) => isPin(node.componentId))).toHaveLength(
			3,
		);
		for (const node of nodesOfGiven) {
			expect(isStagePinNode(store, xorStage, node.id)).toBe(
				isPin(node.componentId),
			);
		}
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

	it("offers only the parts handed over directly, not those built into them", () => {
		const fourBit = nullthrows(findTutorialStage("four-bit-adder"));
		const store = createTestStore();
		setUpTutorialStage(store, fourBit, titleOf);
		const componentOf = (id: TutorialStageId) =>
			nullthrows(
				store.components.get(nullthrows(findTutorialStage(id)).componentId),
			);

		expect(
			isStagePart(fourBit, componentOf("full-adder"), fourBit.componentId),
		).toBe(true);
		expect(
			isStagePart(fourBit, componentOf("half-adder"), fourBit.componentId),
		).toBe(false);
	});

	it("offers inside a part handed over what its own stage offers, and no pins", () => {
		const inGiven = (component: Parameters<typeof isStagePart>[1]) =>
			isStagePart(xorStage, component, aOnlyStage.componentId);

		expect(isStagePart(xorStage, not.component, xorStage.componentId)).toBe(
			false,
		);
		expect(inGiven(not.component)).toBe(true);
		expect(inGiven(or.component)).toBe(true);
		expect(inGiven(xor.component)).toBe(false);
		expect(inGiven(input.component)).toBe(false);
	});

	it("offers inside a part handed over none of the components outside it", () => {
		const store = createTestStore();
		const own = registerTestComponent(store, "Mine");
		setUpTutorialStage(store, xorStage, titleOf);
		const xorComponent = nullthrows(store.components.get(xorStage.componentId));

		expect(isStagePart(xorStage, own, aOnlyStage.componentId)).toBe(false);
		expect(isStagePart(xorStage, xorComponent, aOnlyStage.componentId)).toBe(
			false,
		);
		expect(isStagePart(xorStage, own, xorStage.componentId)).toBe(true);
	});
});
