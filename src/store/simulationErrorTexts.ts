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
	loop: "The outlined nodes form a loop, so their values cannot be determined. Fix the connections in the loop, or add a FlipFlop to it if the value should feed back.",
	loopInside: (place, component) =>
		`There is a loop inside ${place}, so the values in it cannot be determined. Open ${component} to fix the connections, or add a FlipFlop to the loop if the value should feed back.`,
	unconnectedPin: (pin, node) =>
		`Input pin ${pin} of ${node} is not connected.`,
	unconnectedNode: (node) => `${node} is not connected.`,
	openToConnect: (component) => `Open ${component} to connect it.`,
	bitWidthConflict: (component) =>
		`The bit widths of some connected pins in ${component} do not match. Fix the highlighted connections.`,
	bitWidthConflictInside: (component) =>
		`The bit widths of some connected pins in ${component} do not match. Open ${component} to fix the highlighted connections.`,
};
