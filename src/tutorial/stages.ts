import nullthrows from "nullthrows";
import type CCStore from "../store";
import { type CCComponentId, CCComponentStore } from "../store/component";
import type { CCComponentPin } from "../store/componentPin";
import { and, input, not, or, output } from "../store/intrinsics/definitions";
import { type CCNodeId, CCNodeStore } from "../store/node";
import type { CombinationalCheck } from "./check";

export const tutorialStageIds = ["and", "xor"] as const;
export type TutorialStageId = (typeof tutorialStageIds)[number];

export type TutorialStage = {
	id: TutorialStageId;
	/** the component the player builds, kept under this id so it is found after a reload */
	componentId: CCComponentId;
	/** the intrinsic components the side panel offers */
	parts: readonly CCComponentId[];
	/** also the input and output pins the stage starts with */
	check: CombinationalCheck;
};

const bit = (value: boolean) => [value];
const isOn = (value: readonly boolean[] | undefined) => nullthrows(value?.[0]);

function twoSwitchesStage(
	id: TutorialStageId,
	lampIsOn: (a: boolean, b: boolean) => boolean,
): TutorialStage {
	return {
		id,
		componentId: `tutorial-${id}` as CCComponentId,
		parts: [and.component.id, or.component.id, not.component.id],
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

export const tutorialStages: readonly TutorialStage[] = [
	twoSwitchesStage("and", (a, b) => a && b),
	twoSwitchesStage("xor", (a, b) => a !== b),
];

export function findTutorialStage(id: string | undefined) {
	return tutorialStages.find((stage) => stage.id === id);
}

/** The pins the stage placed, which the check looks for by name */
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

/** Lay out the component of `stage`, with its input and output pins, in a mounted store */
export function setUpTutorialStage(
	store: CCStore,
	stage: TutorialStage,
	componentName: string,
): void {
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
