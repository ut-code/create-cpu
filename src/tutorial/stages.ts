import nullthrows from "nullthrows";
import type CCStore from "../store";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "../store/component";
import type { CCComponentPin } from "../store/componentPin";
import { and, input, not, or, output } from "../store/intrinsics/definitions";
import { type CCNodeId, CCNodeStore } from "../store/node";
import type { CombinationalCheck } from "./check";
import { StageCircuit } from "./circuit";

export const tutorialStageIds = ["and", "a-only", "xor"] as const;
export type TutorialStageId = (typeof tutorialStageIds)[number];
export type StageTitleOf = (id: TutorialStageId) => string;

export type TutorialStage = {
	id: TutorialStageId;
	/** the component the player builds, kept under this id so it is found after a reload */
	componentId: CCComponentId;
	/** the intrinsic components the side panel offers */
	parts: readonly CCComponentId[];
	/** earlier stages whose components the stage hands over, built and ready to use */
	givenParts: readonly TutorialStageId[];
	allowsNewComponents: boolean;
	/** also the input and output pins the stage starts with */
	check: CombinationalCheck;
	/** builds a circuit that clears the stage, inside its laid out component */
	solve(circuit: StageCircuit): void;
};

const bit = (value: boolean) => [value];
const isOn = (value: readonly boolean[] | undefined) => nullthrows(value?.[0]);

function twoSwitchesStage(
	id: TutorialStageId,
	definition: Pick<TutorialStage, "parts" | "solve"> &
		Partial<Pick<TutorialStage, "givenParts">>,
	lampIsOn: (a: boolean, b: boolean) => boolean,
): TutorialStage {
	return {
		id,
		componentId: `tutorial-${id}` as CCComponentId,
		givenParts: [],
		...definition,
		allowsNewComponents: false,
		check: {
			inputs: [
				{ name: "A", bitWidth: 1 },
				{ name: "B", bitWidth: 1 },
			],
			outputs: ["Out"],
			expected: (values) => ({
				Out: bit(lampIsOn(isOn(values.A), isOn(values.B))),
			}),
		},
	};
}

const andStage = twoSwitchesStage(
	"and",
	{
		parts: [and.component.id, or.component.id, not.component.id],
		solve(circuit) {
			const gate = circuit.place(and.component.id, { x: 0, y: 0 });
			circuit.connect(circuit.pin("A"), circuit.pinOf(gate, "A"));
			circuit.connect(circuit.pin("B"), circuit.pinOf(gate, "B"));
			circuit.connect(circuit.pinOf(gate, "Out"), circuit.pin("Out"));
		},
	},
	(a, b) => a && b,
);

const aOnlyStage = twoSwitchesStage(
	"a-only",
	{
		parts: [and.component.id, or.component.id, not.component.id],
		solve(circuit) {
			const notB = circuit.place(not.component.id, { x: -120, y: 100 });
			const gate = circuit.place(and.component.id, { x: 120, y: 0 });
			circuit.connect(circuit.pin("A"), circuit.pinOf(gate, "A"));
			circuit.connect(circuit.pin("B"), circuit.pinOf(notB, "In"));
			circuit.connect(circuit.pinOf(notB, "Out"), circuit.pinOf(gate, "B"));
			circuit.connect(circuit.pinOf(gate, "Out"), circuit.pin("Out"));
		},
	},
	(a, b) => a && !b,
);

const xorStage = twoSwitchesStage(
	"xor",
	{
		parts: [or.component.id],
		givenParts: ["a-only"],
		solve(circuit) {
			const aOnly = circuit.place(aOnlyStage.componentId, { x: 0, y: -100 });
			const bOnly = circuit.place(aOnlyStage.componentId, { x: 0, y: 100 });
			const either = circuit.place(or.component.id, { x: 200, y: 0 });
			circuit.connect(circuit.pin("A"), circuit.pinOf(aOnly, "A"));
			circuit.connect(circuit.pin("B"), circuit.pinOf(aOnly, "B"));
			circuit.connect(circuit.pin("B"), circuit.pinOf(bOnly, "A"));
			circuit.connect(circuit.pin("A"), circuit.pinOf(bOnly, "B"));
			circuit.connect(circuit.pinOf(aOnly, "Out"), circuit.pinOf(either, "A"));
			circuit.connect(circuit.pinOf(bOnly, "Out"), circuit.pinOf(either, "B"));
			circuit.connect(circuit.pinOf(either, "Out"), circuit.pin("Out"));
		},
	},
	(a, b) => a !== b,
);

export const tutorialStages: readonly TutorialStage[] = [
	andStage,
	aOnlyStage,
	xorStage,
];

export function findTutorialStage(id: string | undefined) {
	return tutorialStages.find((stage) => stage.id === id);
}

export function isStagePart(
	stage: TutorialStage,
	component: CCComponent,
	editedComponentId: CCComponentId,
) {
	if (!component.intrinsicType || stage.parts.includes(component.id)) {
		return true;
	}
	// A component of the player's own gets its pins from Input and Output nodes
	return (
		editedComponentId !== stage.componentId &&
		(component.id === input.component.id ||
			component.id === output.component.id)
	);
}

export function isStagePinNode(
	store: CCStore,
	stage: TutorialStage,
	nodeId: CCNodeId,
): boolean {
	const node = store.nodes.get(nodeId);
	return (
		node?.parentComponentId === stage.componentId &&
		(node.componentId === input.component.id ||
			node.componentId === output.component.id)
	);
}

function renamePinOfNode(
	store: CCStore,
	nodeId: CCNodeId,
	componentPin: CCComponentPin,
	name: string,
) {
	const nodePin = nullthrows(
		store.nodePins
			.getManyByNodeId(nodeId)
			.find((pin) => pin.componentPinId === componentPin.id),
	);
	const exposed = nullthrows(
		store.componentPins.getByImplementation(nodePin.id),
	);
	store.componentPins.update(exposed.id, { name });
}

function registerStageComponent(
	store: CCStore,
	stage: TutorialStage,
	componentName: string,
) {
	store.components.register({
		...CCComponentStore.create({ name: componentName }),
		id: stage.componentId,
	});
	const place = (
		interfaceComponentId: CCComponentId,
		componentPin: CCComponentPin,
		names: readonly string[],
		x: number,
	) => {
		for (const [index, name] of names.entries()) {
			const node = CCNodeStore.create({
				parentComponentId: stage.componentId,
				componentId: interfaceComponentId,
				position: { x, y: (index - (names.length - 1) / 2) * 200 },
			});
			store.nodes.register(node);
			renamePinOfNode(store, node.id, componentPin, name);
		}
	};
	place(
		input.component.id,
		input.outputPin.Out,
		stage.check.inputs.map(({ name }) => name),
		-300,
	);
	place(output.component.id, output.inputPin.In, stage.check.outputs, 300);
}

function registerGivenParts(
	store: CCStore,
	stage: TutorialStage,
	titleOf: StageTitleOf,
) {
	for (const givenId of stage.givenParts) {
		const given = nullthrows(findTutorialStage(givenId));
		if (store.components.get(given.componentId)) continue;
		registerGivenParts(store, given, titleOf);
		registerStageComponent(store, given, titleOf(given.id));
		given.solve(new StageCircuit(store, given.componentId));
	}
}

/**
 * Lay out the component of `stage`, with its input and output pins, and the components
 * it hands over, in a mounted store
 */
export function setUpTutorialStage(
	store: CCStore,
	stage: TutorialStage,
	titleOf: StageTitleOf,
): void {
	registerGivenParts(store, stage, titleOf);
	registerStageComponent(store, stage, titleOf(stage.id));
}

export function hasStageComponents(
	store: CCStore,
	stage: TutorialStage,
): boolean {
	return [stage.id, ...stage.givenParts].every(
		(id) =>
			store.components.get(nullthrows(findTutorialStage(id)).componentId) !==
			undefined,
	);
}
