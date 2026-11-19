import { englishSimulationErrorTexts } from "../store/simulationErrorTexts";

const bitWidths = (widths: readonly number[]) => `${widths.join("/")} bit`;

export const en = {
	languageName: "English",
	common: {
		components: "Components",
		newComponentName: "New Component",
		cancel: "Cancel",
		apply: "Apply",
		delete: "Delete",
	},
	header: {
		language: "Language",
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
