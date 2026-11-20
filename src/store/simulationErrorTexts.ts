export type SimulationErrorTexts = {
	/** a node by the names of the nodes it is in, given from the outside in */
	nodeName(outerToInner: readonly string[]): string;
	/** an Input or Output node, by the pin it adds */
	interfaceNode(type: "input" | "output", pin: string): string;
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
	interfaceNode: (type, pin) =>
		`${type === "input" ? "Input" : "Output"} ${pin}`,
	sentences: (sentences) => sentences.join(" "),
	loop: "The output of each component outlined in red comes back to its own input along the wires. Working out its output needs that same output, so the circuit cannot run as it is. Reconnect a wire, or put a FlipFlop somewhere along the way.",
	loopInside: (place, component) =>
		`Inside ${place}, the output of some components comes back to their own input along the wires. Working out their output needs that same output, so the circuit cannot run as it is. Open ${component} to reconnect a wire, or put a FlipFlop somewhere along the way.`,
	unconnectedPin: (pin, node) => `Pin ${pin} of ${node} is not connected.`,
	unconnectedNode: (node) => `${node} is not connected.`,
	openToConnect: (component) => `Open ${component} to connect it.`,
	bitWidthConflict: (component) =>
		`The bit widths of some connected pins in ${component} do not match. Fix the highlighted connections.`,
	bitWidthConflictInside: (component) =>
		`The bit widths of some connected pins in ${component} do not match. Open ${component} to fix the highlighted connections.`,
};
