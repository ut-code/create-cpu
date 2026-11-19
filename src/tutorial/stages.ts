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
	solve(circuit: StageCircuit): void;
};

const gateParts = [and, or, not].map((gate) => gate.component.id);

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
		parts: gateParts,
		solve(circuit) {
			const gate = circuit.place(and.component.id, { x: 0, y: 0 });
			circuit.connect(circuit.pin("A"), circuit.pinOf(gate, and.inputPin.A));
			circuit.connect(circuit.pin("B"), circuit.pinOf(gate, and.inputPin.B));
			circuit.connect(
				circuit.pinOf(gate, and.outputPin.Out),
				circuit.pin("Out"),
			);
		},
	},
	(a, b) => a && b,
);

const aOnlyStage = twoSwitchesStage(
	"a-only",
	{
		parts: gateParts,
		solve(circuit) {
			const notB = circuit.place(not.component.id, { x: -120, y: 100 });
			const gate = circuit.place(and.component.id, { x: 120, y: 0 });
			circuit.connect(circuit.pin("A"), circuit.pinOf(gate, and.inputPin.A));
			circuit.connect(circuit.pin("B"), circuit.pinOf(notB, not.inputPin.In));
			circuit.connect(
				circuit.pinOf(notB, not.outputPin.Out),
				circuit.pinOf(gate, and.inputPin.B),
			);
			circuit.connect(
				circuit.pinOf(gate, and.outputPin.Out),
				circuit.pin("Out"),
			);
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
			const aOnly = circuit.place(aOnlyStage.componentId, { x: -40, y: -100 });
			const bOnly = circuit.place(aOnlyStage.componentId, { x: -40, y: 100 });
			const either = circuit.place(or.component.id, { x: 140, y: 0 });
			circuit.connect(circuit.pin("A"), circuit.pinOf(aOnly, "A"));
			circuit.connect(circuit.pin("B"), circuit.pinOf(aOnly, "B"));
			circuit.connect(circuit.pin("B"), circuit.pinOf(bOnly, "A"));
			circuit.connect(circuit.pin("A"), circuit.pinOf(bOnly, "B"));
			circuit.connect(
				circuit.pinOf(aOnly, "Out"),
				circuit.pinOf(either, or.inputPin.A),
			);
			circuit.connect(
				circuit.pinOf(bOnly, "Out"),
				circuit.pinOf(either, or.inputPin.B),
			);
			circuit.connect(
				circuit.pinOf(either, or.outputPin.Out),
				circuit.pin("Out"),
			);
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

function tutorialStageById(id: TutorialStageId): TutorialStage {
	return nullthrows(findTutorialStage(id), `No stage ${id}`);
}

/** `stage` and the stages it hands over, down to the ones those hand over */
function stagesBuiltIn(stage: TutorialStage): TutorialStage[] {
	return [
		stage,
		...stage.givenParts.flatMap((id) => stagesBuiltIn(tutorialStageById(id))),
	];
}

/** The stage whose component `componentId` is, among those `stage` lays out */
function stageOwning(stage: TutorialStage, componentId: CCComponentId) {
	return stagesBuiltIn(stage).find((s) => s.componentId === componentId);
}

export function isStageComponent(
	stage: TutorialStage,
	componentId: CCComponentId,
): boolean {
	return stageOwning(stage, componentId) !== undefined;
}

/** Inside a given part, its own parts are offered, so that what was deleted can be put back */
export function isStagePart(
	stage: TutorialStage,
	component: CCComponent,
	editedComponentId: CCComponentId,
) {
	if (!component.intrinsicType) return true;
	const owner = stageOwning(stage, editedComponentId);
	if (owner) return owner.parts.includes(component.id);
	// A component of the player's own gets its pins from Input and Output nodes
	return (
		stage.parts.includes(component.id) ||
		component.id === input.component.id ||
		component.id === output.component.id
	);
}

export function isStagePinNode(
	store: CCStore,
	stage: TutorialStage,
	nodeId: CCNodeId,
): boolean {
	const node = store.nodes.get(nodeId);
	return (
		node !== undefined &&
		isStageComponent(stage, node.parentComponentId) &&
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

/** Lay out the components `stage` hands over that `store` lacks, with their solutions */
export function registerGivenParts(
	store: CCStore,
	stage: TutorialStage,
	titleOf: StageTitleOf,
): void {
	for (const given of stage.givenParts.map(tutorialStageById)) {
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
