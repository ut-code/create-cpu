import type { CCIntrinsicComponentType } from "../store/intrinsics/types";
import { englishSimulationErrorTexts } from "../store/simulationErrorTexts";
import type { TutorialPartId, TutorialStageId } from "../tutorial/stages";

const bitWidths = (widths: readonly number[]) => `${widths.join("/")} bit`;
const listOf = (names: readonly string[]) =>
	names.length < 2
		? names.join("")
		: `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
const bitCount = (count: number) => (count === 1 ? "1 bit" : `${count} bits`);
const themOf = (names: readonly string[]) =>
	names.length === 1 ? "it" : "them";

type StageTexts = {
	title: string;
	/** paragraphs */
	goal: readonly string[];
	steps: readonly string[];
};

const stageTexts: Record<TutorialStageId, StageTexts> = {
	and: {
		title: "Both switches",
		goal: [
			"Make the lamp {Out} turn [ON] only when both switches {A} and {B} are [ON]. The stage is cleared when the circuit works as in the table below.",
		],
		steps: [
			"Pick a part in the Parts list and drag it onto the editor on the right.",
			"The small squares on the edges of a part are its pins. A pin on the left side is an input, which receives [ON] or [OFF], and a pin on the right side is an output, which sends [ON] or [OFF]. Drag between an output pin and an input pin to connect them with a wire.",
			"Once {Out} and every input pin of the parts you placed are connected, the play button <play> at the bottom right can be pressed. It cannot be pressed while a part has a free input pin.",
			"After pressing the play button <play>, click the switches {A} and {B} to turn them [ON] and [OFF], and watch the lamp {Out}. To fix the circuit, the pencil button <edit> in the same place takes you back to editing.",
			"When it works as in the table, press <check>.",
		],
	},
	"a-only": {
		title: "Only switch A",
		goal: [
			"Make the lamp {Out} turn [ON] only when switch {A} is [ON] and {B} is [OFF]. This time, one part alone is not enough.",
		],
		steps: [],
	},
	xor: {
		title: "Only one switch",
		goal: [
			'Make the lamp {Out} turn [ON] when exactly one of the switches {A} and {B} is [ON]. It stays [OFF] when both are [ON]. "{Only switch A}" is ready to use as a part.',
		],
		steps: [],
	},
	"half-adder": {
		title: "Adding one digit",
		goal: [
			"From here on, think of [ON] as [1] and [OFF] as [0], and the tables write them that way too. Then {A} + {B} is 0, 1 or 2. Binary writes numbers with only 0 and 1: just as 9 + 1 carries over and becomes 10 in everyday numbers, 1 + 1 carries over and becomes 10 in binary. So 0, 1 and 2 are [00], [01] and [10] in two digits. A digit of a binary number is called a bit.",
			"Output the left digit (the twos digit) to {C} and the right digit (the ones digit) to {S}. {C} is called the carry and {S} the sum, and this circuit is called a half adder.",
		],
		steps: [],
	},
	"full-adder": {
		title: "Adding with a carry",
		goal: [
			'Output {A} + {B} + {Cin} as a two-digit binary number to {C} and {S}. {Cin} is the carry coming up from the next lower digit. The answer is 0 to 3, and 3 is [11] in binary. "{Adding one digit}" is ready to use as a part: add {A} and {B} with one, then add {Cin} to its {S} with another. This circuit is called a full adder.',
		],
		steps: [],
	},
	"four-bit-adder": {
		title: "Adding four digits",
		goal: [
			"{A} and {B} are four-digit binary numbers. Output {A} + {B} in four digits to {S}, and its fifth digit, the sixteens digit, to {C}: {C} is [1] when {A} + {B} is 16 or more. The table shows some examples.",
		],
		steps: [
			'Place four "{Adding with a carry}". From the top, the pins on the right of {Decompose} and on the left of {Aggregate} are the eights, fours, twos and ones digits.',
			"For each digit, connect that digit's pin on the upper {Decompose}, which {A} goes into, and on the lower one, which {B} goes into, to the {A} and {B} of one \"{Adding with a carry}\". Connect the {S} of that adder to the same digit's pin of {Aggregate}.",
			"Connect the {C} of each digit's adder to the {Cin} of the adder one digit up. The ones digit's adder gets {False} on its {Cin}, and the {C} of the eights digit's adder goes to the output {C} on the right.",
			"While playing, click a digit of {A} or {B} to switch it between [0] and [1]. The sum {S} is shown as one character on the {Display} at the top right. The {7seg} before it turns the binary number into the shape of a numeral. To write 10 to 15 with one character, A (10), b (11), C (12), d (13), E (14) and F (15) are used. This way of writing is called hexadecimal.",
		],
	},
	counter: {
		title: "Counter",
		goal: [
			"After pressing the play button <play>, a number with an arrow button on each side <previousStep><nextStep> appears at the bottom. The number is called the time step, and the right arrow <nextStep> goes to the next one. The circuit runs one time step at a time.",
			"Make {Count} go up by 1 at each time step, and go back to [0000] after [1111]. [0000] to [1111] are 0 to F in hexadecimal.",
		],
		steps: [
			"Place a {FlipFlop}. A {FlipFlop} outputs what it received at the time step before, and [0000] at the first time step. Connect its output to {Count} and to the {7seg} at the top right.",
			'Place a {Const}. A {Const} always outputs the value written in it. Change [00000000] in its box to [0001] and press <constApply> (four bits, to match the {B} it connects to). The "4 bits" below the box is the number of bits of the value.',
			'Place "{Adding four digits}". Connect the output of the {FlipFlop} to its {A}, the {Const} to its {B}, and its {S} to the input of the {FlipFlop}. Then the number the {FlipFlop} outputs plus 1 comes out of the {FlipFlop} at the next time step. {C} is not used.',
			"Press the play button <play> and go through the time steps with the right arrow <nextStep>. Press <auto> to go on by itself, one time step a second. The circuit works when the {Display} at the top right shows 0 to F in turn.",
		],
	},
	"decimal-digit": {
		title: "One decimal digit",
		goal: [
			"Writing numbers with 0 to 9, carrying over after 9 as everyday numbers do, is called decimal.",
			"Make {Count} go up by 1 only at the time steps when {Up} is [ON], and go back to [0000] after [1001]. [1001] is 9, 8 plus 1. At a time step when {Count} is [1001] and {Up} is [ON], make {Carry} turn [ON]: it tells the digit above to go up.",
			"<check> turns {Up} [ON] until {Count} reaches [1001], then [OFF] for two time steps to see that {Count} stays at [1001] and {Carry} stays [OFF], and then [ON] again to see that {Count} goes back to [0000].",
		],
		steps: [
			'The {Const}, {Broadcast} and {And} on the left send [0001] to {B} of "{Adding four digits}" when {Up} is [ON], and [0000] when it is [OFF]. A {Broadcast} spreads a one-bit value over several bits: [1111] for [ON], [0000] for [OFF]. An {And} given values of several bits makes each bit [1] only where both are [1].',
			"Make {Carry}. From [0000] to [1001], only [1001] has [1] in both the eights and the ones digit. Join the top pin (eights) and the bottom pin (ones) on the right of the {Decompose} at the bottom with an {And}, join its output and {Up} with another {And}, and connect that to {Carry}.",
			"Place a {Broadcast} and click the pin on its right. The box that appears is the bit width, the number of bits of the output. Change its 1 to 4 and press <pinApply>, and the output has four bits. Do this before connecting it.",
			"Go back to [0000] when {Carry} is [ON]. {S} is not connected to the {FlipFlop} yet. Connect the output of the {And} that goes to {Carry} to a {Not} as well to turn it over, spread it to four bits with that {Broadcast}, join it and {S} with an {And}, and connect the {And} to the input of the {FlipFlop}.",
			"While playing, click {Up} to switch it [ON] and [OFF], and go through the time steps with the right arrow <nextStep>. The circuit works when the number on the {Display} goes up only while {Up} is [ON], and goes back to 0 after 9.",
		],
	},
	stopwatch: {
		title: "Stopwatch",
		goal: [
			"Finally, a stopwatch counting minutes and seconds like 12:34. It goes on by one second at each time step when {Start} is [ON]. The {Display} at the top right shows, from the left, the tens digit of the minutes ({M10}), the ones digit of the minutes ({M1}), a colon, the tens digit of the seconds ({S10}) and the ones digit of the seconds ({S1}). {M10} and {S10} count 0 to 5, and {M1} and {S1} count 0 to 9. After 59:59 it goes back to 00:00.",
			"The {7seg}s, {Const}, {Decompose} and {Aggregate} left of the {Display} put the four numerals and the colon side by side on that one {Display}.",
			"<check> keeps {Start} [ON] until 59:59 has gone back to 00:00, then turns it [OFF] for two time steps to see that the stopwatch stops, and [ON] again to see that it goes on.",
		],
		steps: [
			'Place two "{One base-6 digit}" and two "{One decimal digit}". "{One base-6 digit}" is built like "{One decimal digit}", but counts 0 to 5 and carries over after 5, as decimal does after 9.',
			'Give each of the four parts one of {M10}, {M1}, {S10} and {S1}: "{One base-6 digit}" for {M10} and {S10}, and "{One decimal digit}" for {M1} and {S1}. Connect the {Count} of each to the output on the right named after its digit, and to the {7seg} of that digit. The {7seg}s are, from the top, for {M10}, {M1}, {S10} and {S1}.',
			"Connect {Start} to {Up} of the part connected to {S1}. Then connect {Carry} of the part for {S1} to {Up} of the part for {S10}, {Carry} for {S10} to {Up} for {M1}, and {Carry} for {M1} to {Up} for {M10}. A digit then goes on only when the digit one lower goes back to 0.",
			"Press the play button <play>. If {Start} is [OFF] at the first time step, click it to turn it [ON]. Press <auto>, and the {Display} goes on like a clock, one time step a second. To see what comes after 59:59, stop <auto>, click the number at the bottom, enter 3600 and press the <enter> key. It goes to that time step at once and shows 59:59, and the right arrow <nextStep> shows 00:00.",
		],
	},
};

export const en = {
	languageName: "English",
	common: {
		components: "Components",
		newComponentName: "New Component",
		cancel: "Cancel",
		apply: "Apply",
		delete: "Delete",
	},
	parts: {
		summaries: {
			AND: "ON only when both inputs are ON.",
			OR: "ON when at least one input is ON.",
			NOT: "Turns ON into OFF, and OFF into ON.",
			XOR: "ON when exactly one input is ON.",
			TRUE: "Always ON.",
			FALSE: "Always OFF.",
			DECOMPOSE:
				"Splits a value of several bits, the higher digits to the upper pins.",
			AGGREGATE: "Joins values into one, the upper pins as the higher digits.",
			FLIPFLOP:
				"Outputs what it received at the time step before (0 at the first time step).",
			CONST: "Always outputs the value written in it.",
			BROADCAST: "Repeats a one-bit value over several bits.",
			ANDN: "ON only when every bit of In is 1.",
			ORN: "ON when any bit of In is 1.",
			SEVEN_SEGMENT:
				"Turns the 4-bit value of In into the shape of a hexadecimal character, 0 to F. Out is a 28-bit value of a picture 4 pixels wide and 7 high, with 1 for the character. While editing, the gear button sets its pixel order.",
			DISPLAY:
				"While playing, shows the value of Pixels as a picture, one bit per pixel (1 is black, 0 is white). From the highest digit, the pixels go from the top left row by row in row-major order, or column by column in column-major order. While editing, the gear button sets the resolution and the pixel order.",
			INPUT:
				"Adds an input to the component it is placed in. Where that component is placed as a part, the input is a pin on its left. While playing, its value can be changed on the placed Input.",
			OUTPUT:
				"Adds an output to the component it is placed in. Where that component is placed as a part, the output is a pin on its right. While playing, it shows the value it receives.",
		} satisfies Record<CCIntrinsicComponentType, string>,
		pinBitWidth: (pinName: string, canAddPins: boolean) =>
			`The number in the ${pinName} pin is its number of bits. To change it, click the pin while editing, change the field and press "Apply".${canAddPins ? ` Each field added with "Add" becomes another ${pinName} pin.` : ""}`,
		about: (name: string) => `About ${name}`,
		ofStage: "Available parts",
	},
	header: {
		language: "Language",
		modes: {
			free: "Free mode",
			tutorial: "Tutorial",
		},
	},
	start: {
		title: "What would you like to do?",
		tutorial:
			"Build logic circuits step by step, starting from a pair of switches.",
		free: "Build any circuit you like.",
	},
	home: {
		file: "File",
		export: "Export",
		import: "Import",
		reset: "Reset",
		selectToEdit: "Select a component to start editing.",
		create: "Create",
		nodeCount: (count: number) => `${count} ${count === 1 ? "node" : "nodes"}`,
		componentMenu: "Component menu",
		resetDialog: {
			title: "Reset all components?",
			body: "Every component is replaced with the sample. This cannot be undone, so export first to keep a copy.",
		},
		importDialog: {
			title: (fileName: string) => `Import ${fileName}?`,
			body: "Every current component is replaced with the ones in the file. This cannot be undone, so export first to keep a copy.",
		},
		deleteDialog: {
			title: (componentName: string) => `Delete ${componentName}?`,
			unused: "This cannot be undone.",
			used: (count: number, places: readonly string[], otherCount: number) =>
				`It is used ${count === 1 ? "once" : `${count} times`} in ${places.join(", ")}${otherCount > 0 ? ` and ${otherCount} other ${otherCount === 1 ? "component" : "components"}` : ""}. Deleting it also removes those nodes and their connections. This cannot be undone.`,
		},
		errors: {
			read: (fileName: string) => `Could not read ${fileName}.`,
			notImportable: (fileName: string) =>
				`Could not import ${fileName}: it is not a file exported from this app, or it is damaged.`,
			storageFull:
				"The storage of this browser is full, so nothing was replaced.",
			importFailed: (fileName: string) => `Could not import ${fileName}.`,
			resetFailed: "Could not reset the components.",
			deleteFailed: (componentName: string) =>
				`Could not delete ${componentName}.`,
		},
	},
	recovery: {
		title: "Your saved components could not be loaded",
		body: "The components saved in this browser are damaged, or were saved in a form this version cannot read. Nothing is saved over them until you start over, so download them first to keep a copy.",
		download: "Download saved data",
		startOver: "Start over with the sample",
		startOverDialog: {
			title: "Start over with the sample?",
			body: "The saved components are replaced with the sample and cannot be brought back. Download them first to keep a copy.",
			confirm: "Start over",
		},
		errors: {
			storageFull:
				"The storage of this browser is full, so the sample could not be saved.",
			startOverFailed: "Could not start over.",
		},
	},
	truthTable: {
		timeStep: "Time step",
	},
	tutorial: {
		lead: "Starting at the first stage, build circuit after circuit, and finish a stopwatch in the last stage. Each stage hands you the circuits of the earlier stages as finished parts, so you can start from any stage.",
		stageNumber: (number: number) => `Stage ${number}`,
		cleared: "Cleared",
		startOver: "Start over from the beginning",
		startOverDialog: {
			title: "Start the tutorial over?",
			body: "Every stage goes back to how it started, and the stages cleared are forgotten.",
			confirm: "Start over",
		},
		startOverFailed: "Could not start the tutorial over.",
		stages: "Stages",
		parts: "Parts",
		goalHeading: "Goal",
		stepsHeading: "Steps",
		digitsLegend: "The tables write ON as 1 and OFF as 0.",
		check: "Check",
		checking: "Checking…",
		passed: "Cleared! The circuit works for every combination of the inputs.",
		passedSteps: (count: number) =>
			`Cleared! The circuit works at every time step up to time step ${count}.`,
		next: "Next stage",
		backToStages: "Back to the stages",
		missingPin: (pinType: "input" | "output", pinName: string) =>
			`The ${pinType} ${pinName} on the ${pinType === "input" ? "left" : "right"} is missing. Reset this stage to bring back how it started.`,
		wrongBitWidth: (pinName: string, expected: number, actual: number) =>
			`${pinName} should have ${bitCount(expected)}, but it has ${bitCount(actual)}. Check what it is connected to.`,
		wrongOutput: (
			inputs: readonly { name: string; value: string }[],
			pinName: string,
			expected: string,
			actual: string | null,
		) =>
			`When ${listOf(inputs.map(({ name, value }) => `${name} is ${value}`))}, ${pinName} should be ${expected}, but it ${actual === null ? "has no value" : `is ${actual}`}.`,
		wrongOutputAtStep: (
			stepNumber: number,
			inputs: readonly { name: string; value: string }[],
			pinName: string,
			expected: string,
			actual: string | null,
		) =>
			`At time step ${stepNumber}${inputs.length > 0 ? ` (${listOf(inputs.map(({ name, value }) => `${name} is ${value}`))})` : ""}, ${pinName} should be ${expected}, but it ${actual === null ? "has no value" : `is ${actual}`}.`,
		checkFailed:
			"Something went wrong while checking. Change the circuit a little and press Check again.",
		simulationFailed: (detail: string) => `The circuit cannot run. ${detail}`,
		resetStage: "Reset this stage",
		resetStageDialog: {
			title: "Reset this stage?",
			body: "The circuit of this stage goes back to how it started.",
			confirm: "Reset",
		},
		resetStageFailed: "Could not reset the stage.",
		stageTexts,
		partTitles: { "senary-digit": "One base-6 digit" } satisfies Record<
			TutorialPartId,
			string
		>,
	},
	componentProperties: {
		title: (componentName: string) => `${componentName} Properties`,
		name: "Name",
		inputPins: "Input Pins",
		outputPins: "Output Pins",
	},
	sidePanel: {
		component: "Component",
		search: "Search components",
	},
	editor: {
		contextMenu: {
			createComponent: "Create a new component...",
			edit: "Edit...",
			cannotDelete: (names: readonly string[]) =>
				`${listOf(names)} cannot be deleted, as the stage uses ${themOf(names)}`,
			keptOnDelete: (names: readonly string[]) =>
				`${listOf(names)} ${names.length === 1 ? "is" : "are"} kept, as the stage uses ${themOf(names)}`,
		},
		frameControl: {
			auto: "Auto",
			autoPlay: "Auto play",
			previousStep: "Previous step",
			timeStep: "Time step",
			nextStep: "Next step",
			clockFrequency: "Clock frequency (Hz)",
			speedRange: (min: number, max: number) => `Enter ${min} to ${max}`,
		},
		nodePinBitWidth: {
			description: "Specify the bit width to assign to the pin.",
			add: "Add",
			remove: "Remove",
		},
		renamePin: "Rename Pin",
		editProperties: "Edit the properties",
		close: "Close",
		editValue: "Edit the value",
		displaySettings: "Display Settings",
		resolution: "Resolution",
		sevenSegmentSettings: "7seg Settings",
		pixelOrder: "Pixel order",
		rowMajor: "Row-major",
		columnMajor: "Column-major",
		valueEditor: {
			bits: (count: number) => `${count} ${count === 1 ? "bit" : "bits"}`,
			empty: "Enter a value",
			invalid: (mode: "binary" | "hex") => `Not a valid ${mode} value`,
			tooWide: (required: number, width: number) =>
				`Needs ${required} bits, but the width is ${width}`,
		},
		connectionRejection: {
			sameDirection: "Cannot connect two input pins or two output pins",
			sameNode: "Cannot connect pins of the same node",
			differentParentComponent:
				"Cannot connect pins placed in different components",
			inputAlreadyConnected: "This input pin is already connected",
			bitWidthConflict: (a: readonly number[], b: readonly number[]) =>
				`Bit widths do not match (${bitWidths(a)} and ${bitWidths(b)})`,
			bitWidthConflictAlready: (a: readonly number[], b: readonly number[]) =>
				`Cannot connect to a wire whose bit widths already disagree (${bitWidths(a)} and ${bitWidths(b)})`,
		},
		inputValueReset: (inputs: readonly { name: string; bitWidth: number }[]) =>
			`Input values that no longer fit their bit width were reset to 0: ${inputs
				.map(({ name, bitWidth }) => `${name} (${bitWidths([bitWidth])})`)
				.join(", ")}`,
	},
	simulation: englishSimulationErrorTexts,
};

export type Messages = typeof en;
