import { englishSimulationErrorTexts } from "../store/simulationErrorTexts";

const bitWidths = (widths: readonly number[]) => `${widths.join("/")} bit`;
const listOf = (names: readonly string[]) =>
	names.length < 2
		? names.join("")
		: `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
const themOf = (names: readonly string[]) =>
	names.length === 1 ? "it" : "them";

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
			AND: "ON only when both inputs are ON",
			OR: "ON when at least one input is ON",
			NOT: "Turns ON into OFF, and OFF into ON",
			XOR: "ON when exactly one input is ON",
			TRUE: "Always ON",
			FALSE: "Always OFF",
		},
		about: (name: string) => `About ${name}`,
		ofStage: "Parts you can use in this stage",
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
	tutorial: {
		lead: "Going from the top is recommended, but you can start from any stage.",
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
		goalTable: "The stage is cleared when the circuit works like this",
		check: "Check",
		passed: "Cleared! The circuit works for every combination of the inputs.",
		next: "Next stage",
		backToStages: "Back to the stages",
		missingPin: (pinType: "input" | "output", pinName: string) =>
			`There is no ${pinType} pin named ${pinName}. "Reset this stage" brings back how the stage started.`,
		wrongOutput: (
			inputs: readonly { name: string; value: string }[],
			pinName: string,
			expected: string,
			actual: string | null,
		) =>
			`When ${inputs.map(({ name, value }) => `${name} is ${value}`).join(" and ")}, ${pinName} should be ${expected}, but it ${actual === null ? "has no value" : `is ${actual}`}.`,
		simulationFailed: (detail: string) =>
			`The circuit could not be simulated. ${detail}`,
		resetStage: "Reset this stage",
		resetStageDialog: {
			title: "Reset this stage?",
			body: "The circuit of this stage goes back to how it started.",
			confirm: "Reset",
		},
		resetStageFailed: "Could not reset the stage.",
		stageTexts: {
			and: {
				title: "Both switches",
				goal: "Make the lamp Out light up only when both switches A and B are ON. Drag parts from the Parts list onto the editor, and drag from pin to pin to connect them. The play button at the bottom right lets you try the switches. When it works, press Check.",
			},
			xor: {
				title: "Only one switch",
				goal: "Make the lamp Out light up when exactly one of the switches A and B is ON. It does not light up when both are ON.",
			},
		},
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
