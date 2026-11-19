import nullthrows from "nullthrows";
import type { BitNotation } from "../common/bitLabel";
import type CCStore from "../store";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "../store/component";
import type { CCComponentPin } from "../store/componentPin";
import {
	and,
	input,
	not,
	or,
	output,
	xor,
} from "../store/intrinsics/definitions";
import { type CCNodeId, CCNodeStore } from "../store/node";
import type { CombinationalCheck, PinValues } from "./check";
import { StageCircuit } from "./circuit";

export const tutorialStageIds = [
	"and",
	"a-only",
	"xor",
	"half-adder",
	"full-adder",
] as const;
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
	tableNotation: BitNotation;
	/** also the input and output pins the stage starts with */
	check: CombinationalCheck;
	/** inputs the goal shows when every combination of them is too many */
	examples: readonly PinValues[];
	/** how far left and right of the middle the input and output pins sit */
	pinDistance: number;
	/**
	 * Places what the stage starts with besides its pins, and returns how to clear it
	 * from there. Decorations, such as a display, are only placed for the player.
	 */
	layOut(circuit: StageCircuit, options: { decorate: boolean }): () => void;
};

const gateParts = [and, or, not].map((gate) => gate.component.id);

const bit = (value: boolean) => [value];
const isOn = (value: readonly boolean[] | undefined) => nullthrows(value?.[0]);

const oneBitInputs = (...names: string[]) =>
	names.map((name) => ({ name, bitWidth: 1 }));

/** For a stage that starts with nothing but its pins */
type Solving = { solve(circuit: StageCircuit): void };

type StageDefinition = Pick<TutorialStage, "parts" | "check"> &
	Partial<
		Pick<
			TutorialStage,
			"givenParts" | "tableNotation" | "pinDistance" | "examples"
		>
	> &
	(Pick<TutorialStage, "layOut"> | Solving);

function defineStage(
	id: TutorialStageId,
	definition: StageDefinition,
): TutorialStage {
	const {
		parts,
		check,
		givenParts = [],
		tableNotation = "onOff",
		pinDistance = 300,
		examples = [],
	} = definition;
	return {
		id,
		componentId: `tutorial-${id}` as CCComponentId,
		parts,
		check,
		givenParts,
		tableNotation,
		pinDistance,
		examples,
		allowsNewComponents: false,
		layOut:
			"layOut" in definition
				? definition.layOut
				: (circuit) => () => definition.solve(circuit),
	};
}

function twoSwitchesStage(
	id: TutorialStageId,
	definition: Pick<TutorialStage, "parts"> &
		Partial<Pick<TutorialStage, "givenParts">> &
		Solving,
	lampIsOn: (a: boolean, b: boolean) => boolean,
): TutorialStage {
	return defineStage(id, {
		...definition,
		check: {
			inputs: oneBitInputs("A", "B"),
			outputs: ["Out"],
			expected: (values) => ({
				Out: bit(lampIsOn(isOn(values.A), isOn(values.B))),
			}),
		},
	});
}

function addingCheck(...inputNames: string[]): CombinationalCheck {
	return {
		inputs: oneBitInputs(...inputNames),
		outputs: ["C", "S"],
		expected: (values) => {
			const total = inputNames.filter((name) => isOn(values[name])).length;
			return { C: bit(total >= 2), S: bit(total % 2 === 1) };
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

const halfAdderStage = defineStage("half-adder", {
	parts: [and.component.id, xor.component.id],
	tableNotation: "digits",
	check: addingCheck("A", "B"),
	solve(circuit) {
		const carry = circuit.place(and.component.id, { x: 0, y: -100 });
		const sum = circuit.place(xor.component.id, { x: 0, y: 100 });
		for (const [node, gate] of [
			[carry, and],
			[sum, xor],
		] as const) {
			circuit.connect(circuit.pin("A"), circuit.pinOf(node, gate.inputPin.A));
			circuit.connect(circuit.pin("B"), circuit.pinOf(node, gate.inputPin.B));
		}
		circuit.connect(circuit.pinOf(carry, and.outputPin.Out), circuit.pin("C"));
		circuit.connect(circuit.pinOf(sum, xor.outputPin.Out), circuit.pin("S"));
	},
});

const fullAdderStage = defineStage("full-adder", {
	parts: [or.component.id],
	givenParts: ["half-adder"],
	tableNotation: "digits",
	check: addingCheck("A", "B", "Cin"),
	solve(circuit) {
		const first = circuit.place(halfAdderStage.componentId, {
			x: -140,
			y: -100,
		});
		const second = circuit.place(halfAdderStage.componentId, { x: 0, y: 100 });
		const either = circuit.place(or.component.id, { x: 150, y: -100 });
		circuit.connect(circuit.pin("A"), circuit.pinOf(first, "A"));
		circuit.connect(circuit.pin("B"), circuit.pinOf(first, "B"));
		circuit.connect(circuit.pinOf(first, "S"), circuit.pinOf(second, "A"));
		circuit.connect(circuit.pin("Cin"), circuit.pinOf(second, "B"));
		circuit.connect(
			circuit.pinOf(first, "C"),
			circuit.pinOf(either, or.inputPin.A),
		);
		circuit.connect(
			circuit.pinOf(second, "C"),
			circuit.pinOf(either, or.inputPin.B),
		);
		circuit.connect(circuit.pinOf(either, or.outputPin.Out), circuit.pin("C"));
		circuit.connect(circuit.pinOf(second, "S"), circuit.pin("S"));
	},
});

export const tutorialStages: readonly TutorialStage[] = [
	andStage,
	aOnlyStage,
	xorStage,
	halfAdderStage,
	fullAdderStage,
];

export function findTutorialStage(id: string | undefined) {
	return tutorialStages.find((stage) => stage.id === id);
}

function tutorialStageById(id: TutorialStageId): TutorialStage {
	return nullthrows(findTutorialStage(id), `No stage ${id}`);
}

function stagesBuiltIn(stage: TutorialStage): TutorialStage[] {
	return [
		stage,
		...stage.givenParts.flatMap((id) => stagesBuiltIn(tutorialStageById(id))),
	];
}

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
	const owner = stageOwning(stage, editedComponentId);
	if (owner && owner !== stage) {
		return component.intrinsicType
			? owner.parts.includes(component.id)
			: owner.givenParts.some(
					(id) => tutorialStageById(id).componentId === component.id,
				);
	}
	if (!component.intrinsicType) return true;
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
		-stage.pinDistance,
	);
	place(
		output.component.id,
		output.inputPin.In,
		stage.check.outputs,
		stage.pinDistance,
	);
}

/** Skips the parts `store` already has, as a save from before may lack only some */
export function registerGivenParts(
	store: CCStore,
	stage: TutorialStage,
	titleOf: StageTitleOf,
): void {
	for (const given of stage.givenParts.map(tutorialStageById)) {
		if (store.components.get(given.componentId)) continue;
		registerGivenParts(store, given, titleOf);
		registerStageComponent(store, given, titleOf(given.id));
		given.layOut(new StageCircuit(store, given.componentId), {
			decorate: false,
		})();
	}
}

/**
 * Lay out the component of `stage`, with its pins and what else it starts with, and the
 * components it hands over, in a mounted store
 * @returns builds the stage's solution from there
 */
export function setUpTutorialStage(
	store: CCStore,
	stage: TutorialStage,
	titleOf: StageTitleOf,
): () => void {
	registerGivenParts(store, stage, titleOf);
	registerStageComponent(store, stage, titleOf(stage.id));
	return stage.layOut(new StageCircuit(store, stage.componentId), {
		decorate: true,
	});
}
