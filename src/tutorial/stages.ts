import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
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
	"stopwatch",
] as const;
export type TutorialStageId = (typeof tutorialStageIds)[number];

/** Parts handed over that no stage of the list builds */
export const tutorialPartIds = ["senary-digit"] as const;
export type TutorialPartId = (typeof tutorialPartIds)[number];
export type GivenPartId = TutorialStageId | TutorialPartId;
export type StageTitleOf = (id: GivenPartId) => string;

export function isTutorialStageId(value: unknown): value is TutorialStageId {
	return tutorialStageIds.some((id) => id === value);
}

type StageOf<Id extends GivenPartId> = {
	id: Id;
	/** the component the player builds, kept under this id so it is found after a reload */
	componentId: CCComponentId;
	/** the intrinsic components the side panel offers */
	parts: readonly CCComponentId[];
	/** earlier stages or parts whose components the stage hands over, built and ready to use */
	givenParts: readonly GivenPartId[];
	allowsNewComponents: boolean;
	tableNotation: BitNotation;
	/** also the input and output pins the stage starts with */
	check: CircuitCheck;
	/** how far left and right of the middle the input and output pins sit */
	pinDistance: number;
	/** how far apart the pins in each column sit */
	pinSpacing: number;
	/**
	 * Places what the stage starts with besides its pins, and returns how to clear it
	 * from there. Decorations, such as a display, are only placed for the player.
	 */
	layOut(circuit: StageCircuit, options: { decorate: boolean }): () => void;
};

export type TutorialStage = StageOf<TutorialStageId>;
/** A stage, or a part that is built like one but not played */
export type GivenPart = StageOf<GivenPartId>;

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
			"givenParts" | "tableNotation" | "pinDistance" | "pinSpacing"
		>
	> &
	(Pick<TutorialStage, "layOut"> | Solving);

function defineStage<Id extends GivenPartId>(
	id: Id,
	definition: StageDefinition,
): StageOf<Id> {
	const {
		parts,
		check,
		givenParts = [],
		tableNotation = "onOff",
		pinDistance = 300,
		pinSpacing = 200,
	} = definition;
	return {
		id,
		componentId: `tutorial-${id}` as CCComponentId,
		parts,
		check,
		givenParts,
		tableNotation,
		pinDistance,
		pinSpacing,
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

/**
 * One digit of base `base`: Count goes up while Up is ON and back to 0 after the
 * largest digit, and Carry is ON when it goes back. Up is OFF for two steps while
 * Count stays at that digit, so a Carry that ignores Up is caught.
 */
function digitStage<Id extends GivenPartId>(id: Id, base: number) {
	const largest = base - 1;
	const offSteps = [base, base + 1];
	// The digits that are 1 in the largest digit, e.g. eights and ones in 1001
	const largestOnes = bitsOf(largest, digitCount).flatMap((isOne, index) =>
		isOne ? [index] : [],
	);
	const [firstOne, secondOne] = largestOnes;
	invariant(
		largestOnes.length === 2 &&
			firstOne !== undefined &&
			secondOne !== undefined,
		"Carry is told by two digits that are 1",
	);
	return defineStage(id, {
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
					const carries = isUp && count === largest;
					return {
						outputs: { Count: bitsOf(count, digitCount), Carry: bit(carries) },
						next: carries ? 0 : isUp ? count + 1 : count,
					};
				},
			},
			Array.from({ length: 2 * base + 4 }, (_, index) => ({
				Up: bit(!offSteps.includes(index + 1)),
			})),
			[1, 2, ...offSteps, base + 2, base + 3],
		),
		layOut(circuit, { decorate }) {
			// Every wire placed here runs left to right, so that none crosses a node
			const memory = circuit.place(flipflop.component.id, { x: -150, y: -150 });
			const adder = circuit.place(fourBitAdderStage.componentId, {
				x: 100,
				y: 0,
			});
			const one = circuit.place(
				const_.component.id,
				{ x: -400, y: -300 },
				{ mode: "binary", data: bitsOf(1, digitCount) },
			);
			const spreadUp = circuit.place(broadcast.component.id, {
				x: -400,
				y: 120,
			});
			const step = circuit.place(and.component.id, { x: -150, y: 120 });
			const digits = circuit.place(decompose.component.id, { x: 0, y: 250 });
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
				const largestAt = circuit.place(and.component.id, { x: 180, y: 290 });
				const carries = circuit.place(and.component.id, { x: 330, y: 200 });
				const stays = circuit.place(not.component.id, { x: 380, y: 40 });
				const spreadStays = circuit.place(broadcast.component.id, {
					x: 380,
					y: -30,
				});
				const kept = circuit.place(and.component.id, { x: -320, y: -120 });
				circuit.setBitWidth(spreadStays, broadcast.outputPin.Out, digitCount);
				const digit = (index: number) =>
					circuit.pinOf(digits, decompose.outputPin.Out, index);
				circuit.connect(
					digit(firstOne),
					circuit.pinOf(largestAt, and.inputPin.A),
				);
				circuit.connect(
					digit(secondOne),
					circuit.pinOf(largestAt, and.inputPin.B),
				);
				circuit.connect(
					circuit.pinOf(largestAt, and.outputPin.Out),
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
}

const decimalDigitStage = digitStage("decimal-digit", 10);
/** Handed over to the stopwatch for the tens of seconds and of minutes */
const senaryDigitPart = digitStage("senary-digit", 6);

const partById = {
	"senary-digit": senaryDigitPart,
} satisfies { [Id in TutorialPartId]: StageOf<Id> };
export const tutorialParts: readonly GivenPart[] = Object.values(partById);

const secondsInHour = 3600;
/** From the left of MM:SS, with where the 7seg of each sits */
const stopwatchDigits = [
	{ name: "M10", part: senaryDigitPart, numeralY: -570 },
	{ name: "M1", part: decimalDigitStage, numeralY: -495 },
	{ name: "S10", part: senaryDigitPart, numeralY: -345 },
	{ name: "S1", part: decimalDigitStage, numeralY: -270 },
] as const;
// Start is OFF for a while only after 59:59 has gone back to 00:00, so that the
// steps of the goal are those a player reaches with Start ON from the first step
const stopwatchOffSteps = [secondsInHour + 2, secondsInHour + 3];
const numeralWidth = 4;
const numeralHeight = 7;
const blankColumn = new Array<boolean>(numeralHeight).fill(false);
// The rows the dots of a colon light, as tall as a 7seg's numeral
const colonColumn = [false, false, true, false, true, false, false];
/** The columns between the numerals: a gap; a gap, the colon and a gap; a gap */
const spacerColumns = [
	[blankColumn],
	[blankColumn, colonColumn, blankColumn],
	[blankColumn],
];
const spacerWidths = spacerColumns.map(
	(columns) => columns.length * numeralHeight,
);
const spacers = spacerColumns.flat(2);

/** MM:SS, one second a step while Start is ON, back to 00:00 after 59:59 */
const stopwatchStage = defineStage("stopwatch", {
	parts: [],
	givenParts: ["decimal-digit", "senary-digit"],
	tableNotation: "digits",
	pinDistance: 560,
	// Close enough for the outputs to sit below the display
	pinSpacing: 120,
	check: sequentialCheck(
		{
			inputs: oneBitInputs("Start"),
			outputs: stopwatchDigits.map(({ name }) => name),
		},
		{
			initialState: 0,
			step: (seconds, { Start }) => {
				const minutes = Math.floor(seconds / 60);
				const values = [
					Math.floor(minutes / 10),
					minutes % 10,
					Math.floor((seconds % 60) / 10),
					seconds % 10,
				];
				return {
					outputs: Object.fromEntries(
						stopwatchDigits.map(({ name }, index) => [
							name,
							bitsOf(nullthrows(values[index]), digitCount),
						]),
					),
					next: isOn(Start) ? (seconds + 1) % secondsInHour : seconds,
				};
			},
		},
		Array.from({ length: secondsInHour + 5 }, (_, index) => ({
			Start: bit(!stopwatchOffSteps.includes(index + 1)),
		})),
		[
			1,
			2,
			60,
			61,
			...Array.from({ length: 6 }, (_, index) => secondsInHour + index),
		],
	),
	layOut(circuit, { decorate }) {
		const numerals = stopwatchDigits.map(({ numeralY }) =>
			decorate
				? circuit.place(
						seven_segment.component.id,
						{ x: -150, y: numeralY },
						{ pixelOrder: "column-major" },
					)
				: null,
		);
		if (decorate) {
			const spacing = circuit.place(
				const_.component.id,
				{ x: -560, y: -430 },
				{ mode: "binary", data: spacers },
			);
			const spaces = circuit.place(decompose.component.id, {
				x: -260,
				y: -430,
			});
			const joined = circuit.place(aggregate.component.id, {
				x: 100,
				y: -430,
			});
			const screen = circuit.place(
				display.component.id,
				{ x: 420, y: -430 },
				{
					resolution: {
						x:
							stopwatchDigits.length * numeralWidth +
							spacers.length / numeralHeight,
						y: numeralHeight,
					},
					pixelOrder: "column-major",
				},
			);
			circuit.split(spaces, decompose.outputPin.Out, spacerWidths);
			const numeralBits = numeralWidth * numeralHeight;
			circuit.split(joined, aggregate.inputPin.In, [
				numeralBits,
				...spacerWidths.flatMap((width) => [width, numeralBits]),
			]);
			circuit.connect(
				circuit.pinOf(spacing, const_.outputPin.Out),
				circuit.pinOf(spaces, decompose.inputPin.In),
			);
			for (const [index, numeral] of numerals.entries()) {
				circuit.connect(
					circuit.pinOf(nullthrows(numeral), seven_segment.outputPin.Out),
					circuit.pinOf(joined, aggregate.inputPin.In, 2 * index),
				);
			}
			for (const index of spacerWidths.keys()) {
				circuit.connect(
					circuit.pinOf(spaces, decompose.outputPin.Out, index),
					circuit.pinOf(joined, aggregate.inputPin.In, 2 * index + 1),
				);
			}
			circuit.connect(
				circuit.pinOf(joined, aggregate.outputPin.Out),
				circuit.pinOf(screen, display.inputPin.Pixels),
			);
		}
		return () => {
			const nodes = stopwatchDigits.map(({ part }, index) =>
				circuit.place(part.componentId, {
					x: 250 - 200 * index,
					y: 300 - 150 * index,
				}),
			);
			for (const [index, node] of nodes.entries()) {
				const { name } = nullthrows(stopwatchDigits[index]);
				const count = circuit.pinOf(node, "Count");
				circuit.connect(count, circuit.pin(name));
				const numeral = numerals[index];
				if (numeral) {
					circuit.connect(
						count,
						circuit.pinOf(numeral, seven_segment.inputPin.In),
					);
				}
				const lower = nodes[index + 1];
				circuit.connect(
					lower ? circuit.pinOf(lower, "Carry") : circuit.pin("Start"),
					circuit.pinOf(node, "Up"),
				);
			}
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
	stopwatchStage,
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

export function givenPartById(id: GivenPartId): GivenPart {
	return nullthrows(
		[...tutorialStages, ...tutorialParts].find((part) => part.id === id),
		`No stage or part ${id}`,
	);
}

function stagesBuiltIn(stage: GivenPart): GivenPart[] {
	return [
		stage,
		...stage.givenParts.flatMap((id) => stagesBuiltIn(givenPartById(id))),
	];
}

function stageOwning(stage: GivenPart, componentId: CCComponentId) {
	return stagesBuiltIn(stage).find((s) => s.componentId === componentId);
}

export function isStageComponent(
	stage: GivenPart,
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
	const isGivenTo = (receiver: GivenPart) =>
		receiver.givenParts.some(
			(id) => givenPartById(id).componentId === component.id,
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
	stage: GivenPart,
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
				position: {
					x,
					y: (index - (names.length - 1) / 2) * stage.pinSpacing,
				},
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

/** Names the components of `stage` and of what it hands over by `titleOf` */
export function nameStageComponents(
	store: CCStore,
	stage: GivenPart,
	titleOf: StageTitleOf,
): void {
	for (const built of stagesBuiltIn(stage)) {
		const name = titleOf(built.id);
		const component = store.components.get(built.componentId);
		if (component && component.name !== name) {
			store.components.update(component.id, { name });
		}
	}
}

/** Skips the parts `store` already has, as a save from before may lack only some */
export function registerGivenParts(
	store: CCStore,
	stage: GivenPart,
	titleOf: StageTitleOf,
): void {
	for (const given of stage.givenParts.map(givenPartById)) {
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
	stage: GivenPart,
	titleOf: StageTitleOf,
): () => void {
	registerGivenParts(store, stage, titleOf);
	registerStageComponent(store, stage, titleOf(stage.id));
	return stage.layOut(new StageCircuit(store, stage.componentId), {
		decorate: true,
	});
}
