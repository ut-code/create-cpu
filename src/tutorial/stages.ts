import nullthrows from "nullthrows";
import type { BitNotation } from "../common/bitLabel";
import { bitsOf, numberOf } from "../common/bits";
import type { Rect } from "../common/rect";
import type { Vector2 } from "../common/vector2";
import type CCStore from "../store";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "../store/component";
import type { CCComponentPin } from "../store/componentPin";
import {
	aggregate,
	and,
	broadcast,
	const_,
	decompose,
	display,
	false_,
	flipflop,
	input,
	not,
	or,
	output,
	seven_segment,
	xor,
} from "../store/intrinsics/definitions";
import { type CCNodeId, CCNodeStore } from "../store/node";
import type { CCNodePinId } from "../store/nodePin";
import {
	type CircuitCheck,
	type CombinationalCheck,
	type PinValues,
	sequentialCheck,
} from "./check";
import { StageCircuit } from "./circuit";

export const tutorialStageIds = [
	"and",
	"a-only",
	"xor",
	"half-adder",
	"full-adder",
	"four-bit-adder",
	"counter",
	"decimal-digit",
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
	check: CircuitCheck;
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
	Partial<Pick<TutorialStage, "givenParts" | "tableNotation" | "pinDistance">> &
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
	} = definition;
	return {
		id,
		componentId: `tutorial-${id}` as CCComponentId,
		parts,
		check,
		givenParts,
		tableNotation,
		pinDistance,
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
			kind: "combinational",
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
		kind: "combinational",
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

const digitCount = 4;

/** A 7seg at `position` showing a number on a Display right of it; returns the 7seg's input */
function placeNumeral(
	circuit: StageCircuit,
	position: Vector2 = { x: 290, y: -250 },
): CCNodePinId {
	const digit = circuit.place(seven_segment.component.id, position);
	const screen = circuit.place(
		display.component.id,
		{ x: position.x + 140, y: position.y },
		{ resolution: { x: 4, y: 7 }, pixelOrder: "row-major" },
	);
	circuit.connect(
		circuit.pinOf(digit, seven_segment.outputPin.Out),
		circuit.pinOf(screen, display.inputPin.Pixels),
	);
	return circuit.pinOf(digit, seven_segment.inputPin.In);
}

const fourBitAdderStage = defineStage("four-bit-adder", {
	parts: [decompose, aggregate, false_].map((part) => part.component.id),
	givenParts: ["full-adder"],
	tableNotation: "digits",
	pinDistance: 420,
	check: {
		kind: "combinational",
		inputs: [
			{ name: "A", bitWidth: digitCount },
			{ name: "B", bitWidth: digitCount },
		],
		outputs: ["C", "S"],
		expected: (values) => {
			const total =
				numberOf(nullthrows(values.A)) + numberOf(nullthrows(values.B));
			return {
				C: bit(total >= 2 ** digitCount),
				S: bitsOf(total % 2 ** digitCount, digitCount),
			};
		},
		examples: [
			[3, 5],
			[6, 7],
			[9, 8],
		].map(([a, b]) => ({
			A: bitsOf(nullthrows(a), digitCount),
			B: bitsOf(nullthrows(b), digitCount),
		})),
	},
	layOut(circuit, { decorate }) {
		const single = new Array<number>(digitCount).fill(1);
		const splitA = circuit.place(decompose.component.id, { x: -250, y: -170 });
		const splitB = circuit.place(decompose.component.id, { x: -250, y: 170 });
		const joined = circuit.place(aggregate.component.id, { x: 150, y: 100 });
		circuit.split(splitA, decompose.outputPin.Out, single);
		circuit.split(splitB, decompose.outputPin.Out, single);
		circuit.split(joined, aggregate.inputPin.In, single);
		circuit.connect(
			circuit.pin("A"),
			circuit.pinOf(splitA, decompose.inputPin.In),
		);
		circuit.connect(
			circuit.pin("B"),
			circuit.pinOf(splitB, decompose.inputPin.In),
		);
		const sum = circuit.pinOf(joined, aggregate.outputPin.Out);
		circuit.connect(sum, circuit.pin("S"));
		if (decorate) circuit.connect(sum, placeNumeral(circuit));
		return () => {
			const adders = Array.from({ length: digitCount }, (_, index) =>
				circuit.place(fullAdderStage.componentId, {
					x: -50,
					y: -300 + 200 * index,
				}),
			);
			const noCarry = circuit.place(false_.component.id, { x: -200, y: 390 });
			for (const [index, adder] of adders.entries()) {
				circuit.connect(
					circuit.pinOf(splitA, decompose.outputPin.Out, index),
					circuit.pinOf(adder, "A"),
				);
				circuit.connect(
					circuit.pinOf(splitB, decompose.outputPin.Out, index),
					circuit.pinOf(adder, "B"),
				);
				circuit.connect(
					circuit.pinOf(adder, "S"),
					circuit.pinOf(joined, aggregate.inputPin.In, index),
				);
				const lower = adders[index + 1];
				circuit.connect(
					lower
						? circuit.pinOf(lower, "C")
						: circuit.pinOf(noCarry, false_.outputPin.Out),
					circuit.pinOf(adder, "Cin"),
				);
			}
			circuit.connect(
				circuit.pinOf(nullthrows(adders[0]), "C"),
				circuit.pin("C"),
			);
		};
	},
});

const counterStage = defineStage("counter", {
	parts: [flipflop, const_].map((part) => part.component.id),
	givenParts: ["four-bit-adder"],
	tableNotation: "digits",
	pinDistance: 420,
	check: sequentialCheck(
		{ inputs: [], outputs: ["Count"] },
		{
			initialState: 0,
			step: (count) => ({
				outputs: { Count: bitsOf(count, digitCount) },
				next: (count + 1) % 2 ** digitCount,
			}),
		},
		new Array<PinValues>(2 * 2 ** digitCount).fill({}),
		[1, 2, 3, 16, 17],
	),
	layOut(circuit, { decorate }) {
		const numeral = decorate ? placeNumeral(circuit) : null;
		return () => {
			const memory = circuit.place(flipflop.component.id, { x: 150, y: 0 });
			const adder = circuit.place(fourBitAdderStage.componentId, {
				x: -100,
				y: 0,
			});
			const one = circuit.place(
				const_.component.id,
				{ x: -450, y: 150 },
				{ mode: "binary", data: bitsOf(1, digitCount) },
			);
			const count = circuit.pinOf(memory, flipflop.outputPin.Out);
			circuit.connect(count, circuit.pin("Count"));
			if (numeral) circuit.connect(count, numeral);
			circuit.connect(count, circuit.pinOf(adder, "A"));
			circuit.connect(
				circuit.pinOf(one, const_.outputPin.Out),
				circuit.pinOf(adder, "B"),
			);
			circuit.connect(
				circuit.pinOf(adder, "S"),
				circuit.pinOf(memory, flipflop.inputPin.In),
			);
		};
	},
});

const decimalDigitCount = 10;

/** Count goes up while Up is ON and back to 0 after 9; Carry is ON when it goes back */
const decimalDigitStage = defineStage("decimal-digit", {
	parts: [flipflop, const_, broadcast, and, not, decompose].map(
		(part) => part.component.id,
	),
	givenParts: ["four-bit-adder"],
	tableNotation: "digits",
	pinDistance: 560,
	check: sequentialCheck(
		{ inputs: oneBitInputs("Up"), outputs: ["Count", "Carry"] },
		{
			initialState: 0,
			step: (count, { Up }) => {
				const isUp = isOn(Up);
				const carries = isUp && count === decimalDigitCount - 1;
				return {
					outputs: { Count: bitsOf(count, digitCount), Carry: bit(carries) },
					next: carries ? 0 : isUp ? count + 1 : count,
				};
			},
		},
		// Up is OFF while Count stays at 9, so a Carry that ignores Up is caught
		Array.from({ length: 24 }, (_, index) => ({
			Up: bit(index + 1 < 10 || index + 1 > 11),
		})),
		[1, 2, 10, 11, 12, 13],
	),
	layOut(circuit, { decorate }) {
		// The adder sits well below the FlipFlop, so that the wire from Count to A
		// crosses over and does not look like S already going into the FlipFlop
		const memory = circuit.place(flipflop.component.id, { x: 80, y: -100 });
		const adder = circuit.place(fourBitAdderStage.componentId, {
			x: 0,
			y: 120,
		});
		const one = circuit.place(
			const_.component.id,
			{ x: -400, y: -300 },
			{ mode: "binary", data: bitsOf(1, digitCount) },
		);
		const spreadUp = circuit.place(broadcast.component.id, { x: -380, y: 100 });
		const step = circuit.place(and.component.id, { x: -220, y: 40 });
		const digits = circuit.place(decompose.component.id, { x: 200, y: 170 });
		circuit.setBitWidth(spreadUp, broadcast.outputPin.Out, digitCount);
		circuit.split(
			digits,
			decompose.outputPin.Out,
			new Array<number>(digitCount).fill(1),
		);
		const count = circuit.pinOf(memory, flipflop.outputPin.Out);
		circuit.connect(count, circuit.pin("Count"));
		circuit.connect(count, circuit.pinOf(adder, "A"));
		circuit.connect(count, circuit.pinOf(digits, decompose.inputPin.In));
		circuit.connect(
			circuit.pin("Up"),
			circuit.pinOf(spreadUp, broadcast.inputPin.In),
		);
		circuit.connect(
			circuit.pinOf(one, const_.outputPin.Out),
			circuit.pinOf(step, and.inputPin.A),
		);
		circuit.connect(
			circuit.pinOf(spreadUp, broadcast.outputPin.Out),
			circuit.pinOf(step, and.inputPin.B),
		);
		circuit.connect(
			circuit.pinOf(step, and.outputPin.Out),
			circuit.pinOf(adder, "B"),
		);
		if (decorate) {
			circuit.connect(count, placeNumeral(circuit, { x: 380, y: -330 }));
		}
		return () => {
			const nineAt = circuit.place(and.component.id, { x: 340, y: 230 });
			const carries = circuit.place(and.component.id, { x: 440, y: 130 });
			const stays = circuit.place(not.component.id, { x: 340, y: 30 });
			const spreadStays = circuit.place(broadcast.component.id, {
				x: 340,
				y: -30,
			});
			const kept = circuit.place(and.component.id, { x: -100, y: -60 });
			circuit.setBitWidth(spreadStays, broadcast.outputPin.Out, digitCount);
			const digit = (index: number) =>
				circuit.pinOf(digits, decompose.outputPin.Out, index);
			circuit.connect(digit(0), circuit.pinOf(nineAt, and.inputPin.A));
			circuit.connect(
				digit(digitCount - 1),
				circuit.pinOf(nineAt, and.inputPin.B),
			);
			circuit.connect(
				circuit.pinOf(nineAt, and.outputPin.Out),
				circuit.pinOf(carries, and.inputPin.A),
			);
			circuit.connect(
				circuit.pin("Up"),
				circuit.pinOf(carries, and.inputPin.B),
			);
			const carry = circuit.pinOf(carries, and.outputPin.Out);
			circuit.connect(carry, circuit.pin("Carry"));
			circuit.connect(carry, circuit.pinOf(stays, not.inputPin.In));
			circuit.connect(
				circuit.pinOf(stays, not.outputPin.Out),
				circuit.pinOf(spreadStays, broadcast.inputPin.In),
			);
			circuit.connect(
				circuit.pinOf(adder, "S"),
				circuit.pinOf(kept, and.inputPin.A),
			);
			circuit.connect(
				circuit.pinOf(spreadStays, broadcast.outputPin.Out),
				circuit.pinOf(kept, and.inputPin.B),
			);
			circuit.connect(
				circuit.pinOf(kept, and.outputPin.Out),
				circuit.pinOf(memory, flipflop.inputPin.In),
			);
		};
	},
});

export const tutorialStages: readonly TutorialStage[] = [
	andStage,
	aOnlyStage,
	xorStage,
	halfAdderStage,
	fullAdderStage,
	fourBitAdderStage,
	counterStage,
	decimalDigitStage,
];

/** Between the columns of input and output pins, also for a stage without inputs */
export function stageAreaOf(stage: TutorialStage): Rect {
	return {
		position: { x: -stage.pinDistance, y: 0 },
		size: { x: 2 * stage.pinDistance, y: 0 },
	};
}

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
	const isGivenTo = (receiver: TutorialStage) =>
		receiver.givenParts.some(
			(id) => tutorialStageById(id).componentId === component.id,
		);
	if (owner && owner !== stage) {
		return component.intrinsicType
			? owner.parts.includes(component.id)
			: isGivenTo(owner);
	}
	if (!component.intrinsicType) {
		// A part handed over to a part handed over is built in, not offered
		return !isStageComponent(stage, component.id) || isGivenTo(stage);
	}
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
