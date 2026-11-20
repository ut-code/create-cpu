export type SimulationErrorTexts = {
	/** a node by the names of the nodes it is in, given from the outside in */
	nodeName(outerToInner: readonly string[]): string;
	sentences(sentences: readonly string[]): string;
	loop: string;
	loopInside(place: string, component: string): string;
	unconnectedPin(pin: string, node: string): string;
	unconnectedNode(node: string): string;
	openToConnect(component: string): string;
	bitWidthConflict(component: string): string;
	bitWidthConflictInside(component: string): string;
};

export const englishSimulationErrorTexts: SimulationErrorTexts = {
	nodeName: (outerToInner) => outerToInner.toReversed().join(" in "),
	sentences: (sentences) => sentences.join(" "),
	loop: "The output of each part outlined in red comes back to its own input along the wires. Its output would need itself to be worked out, so this cannot run. Reconnect a wire, or put a FlipFlop on the way back.",
	loopInside: (place, component) =>
		`Inside ${place}, the output of some parts comes back to their own input along the wires. Their output would need itself to be worked out, so this cannot run. Open ${component} to reconnect a wire, or put a FlipFlop on the way back.`,
	unconnectedPin: (pin, node) => `Pin ${pin} of ${node} is not connected.`,
	unconnectedNode: (node) => `${node} is not connected.`,
	openToConnect: (component) => `Open ${component} to connect it.`,
	bitWidthConflict: (component) =>
		`The bit widths of some connected pins in ${component} do not match. Fix the highlighted connections.`,
	bitWidthConflictInside: (component) =>
		`The bit widths of some connected pins in ${component} do not match. Open ${component} to fix the highlighted connections.`,
};
