import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type CCStore from ".";
import type {
	SimulationFrame,
	SimulationValue,
} from "../pages/edit/Editor/store/slices/core";
import type { CCComponentId } from "./component";
import type { CCComponentPin, CCComponentPinId } from "./componentPin";
import { definitionByComponentId, flipflop } from "./intrinsics/definitions";
import type { CCNodeId } from "./node";
import type { CCNodePin, CCNodePinId } from "./nodePin";

function createInput(
	nodePins: CCNodePin[],
	inputPin: Record<string, CCComponentPin>,
	inputValues: Map<CCNodePinId, SimulationValue>,
): Record<string, SimulationValue[]> {
	const input: Partial<Record<string, SimulationValue[]>> = {};
	for (const key in inputPin) {
		const componentPin = nullthrows(inputPin[key]);
		const targetNodePins = nodePins.filter(
			(nodePin: CCNodePin) => componentPin.id === nodePin.componentPinId,
		);
		targetNodePins.sort((a, b) => a.order - b.order);
		const values = targetNodePins.map((nodePin: CCNodePin) =>
			nullthrows(inputValues.get(nodePin.id)),
		);
		input[key] = values;
	}
	return input as Record<string, SimulationValue[]>;
}

function createOutputShape(
	store: CCStore,
	nodePins: CCNodePin[],
	outputPin: CCComponentPin,
): { multiplicity: number }[] {
	const targetNodePins = nodePins.filter(
		(nodePin: CCNodePin) => outputPin.id === nodePin.componentPinId,
	);
	targetNodePins.sort((a, b) => a.order - b.order);
	const multiplicity = targetNodePins.map((nodePin: CCNodePin) => {
		const multiplexability = store.nodePins.getNodePinMultiplexability(
			nodePin.id,
		);
		if (multiplexability.isMultiplexable) {
			return 1;
		}
		return multiplexability.multiplicity;
	});
	const outputShape = multiplicity.map((multiplicity) => ({ multiplicity }));
	return outputShape;
}

function simulateIntrinsic(
	store: CCStore,
	nodeId: CCNodeId,
	inputValues: Map<CCNodePinId, SimulationValue>,
	parentPreviousFrame: SimulationFrame | null,
): Map<CCNodePinId, SimulationValue> | null {
	const node = nullthrows(store.nodes.get(nodeId));
	const { componentId } = node;
	const nodePins = store.nodePins.getManyByNodeId(nodeId);
	const componentDefinition = definitionByComponentId.get(componentId);
	invariant(componentDefinition);
	const inputPin = componentDefinition.inputPin;
	const outputPin = componentDefinition.outputPin;
	const _input = createInput(nodePins, inputPin, inputValues);
	const outputShape = createOutputShape(store, nodePins, outputPin);
	const previousInputValues = new Map<CCNodePinId, SimulationValue>();
	for (const nodePin of nodePins) {
		const previousValue = parentPreviousFrame?.nodes
			.get(nodeId)
			?.pins.get(nodePin.id);
		if (previousValue) {
			previousInputValues.set(nodePin.id, previousValue);
		}
	}
	const previousInput = createInput(nodePins, inputPin, previousInputValues);
	const output = componentDefinition.evaluate(
		_input,
		outputShape,
		previousInput,
	);
	const outputValues = new Map<CCNodePinId, SimulationValue>();
	const targetNodePins = nodePins.filter(
		(nodePin: CCNodePin) => outputPin.id === nodePin.componentPinId,
	);
	targetNodePins.sort((a, b) => a.order - b.order);
	for (let i = 0; i < output.length; i++) {
		const nodePin = targetNodePins[i];
		const value = output[i];
		invariant(nodePin && value);
		outputValues.set(nodePin.id, value);
	}
	return outputValues;
}

function simulateNode(
	store: CCStore,
	nodeId: CCNodeId,
	inputValues: Map<CCNodePinId, SimulationValue>,
	previousFrame: SimulationFrame | null,
): {
	outputValues: Map<CCNodePinId, SimulationValue>;
	pins: Map<CCNodePinId, SimulationValue>;
	child: SimulationFrame | null;
} | null {
	const node = nullthrows(store.nodes.get(nodeId));
	const component = store.components.get(node.componentId);
	if (!component) throw new Error(`Component ${component} is not defined.`);
	if (component.intrinsicType) {
		const outputValues = simulateIntrinsic(
			store,
			nodeId,
			inputValues,
			previousFrame,
		);
		if (!outputValues) {
			return null;
		}
		const pins = new Map<CCNodePinId, SimulationValue>();
		for (const [key, value] of inputValues) {
			pins.set(key, value);
		}
		for (const [key, value] of outputValues) {
			pins.set(key, value);
		}
		return { outputValues, pins, child: null };
	}
	const childMap = new Map<
		CCNodeId,
		{
			pins: Map<CCNodePinId, SimulationValue>;
			/** null if intrinsic */
			child: SimulationFrame | null;
		}
	>();
	const nodePins = store.nodePins.getManyByNodeId(nodeId);
	const children = store.nodes.getManyByParentComponentId(component.id);
	const foundInputNumber = new Map<CCNodeId, number>();
	const nodePinInputNumber = new Map<CCNodeId, number>();
	const nodePinInputValues = new Map<CCNodePinId, SimulationValue>();
	for (const child of children) {
		foundInputNumber.set(child.id, 0);
		const innerPins = store.nodePins.getManyByNodeId(child.id);
		let inputPinNumber = 0;
		for (const innerPin of innerPins) {
			const componentPin = nullthrows(
				store.componentPins.get(innerPin.componentPinId),
			);
			if (componentPin.type === "input") {
				inputPinNumber += 1;
			}
		}
		nodePinInputNumber.set(child.id, inputPinNumber);
	}
	for (const nodePin of nodePins) {
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		if (componentPin.type === "input" && componentPin.implementation) {
			const connectedNodePin = nullthrows(
				store.nodePins.get(componentPin.implementation),
			);
			nodePinInputValues.set(
				connectedNodePin.id,
				nullthrows(inputValues.get(nodePin.id)),
			);
			foundInputNumber.set(
				connectedNodePin.nodeId,
				nullthrows(foundInputNumber.get(connectedNodePin.nodeId)) + 1,
			);
		}
	}
	const unevaluatedNodes = new Set<CCNodeId>();
	for (const child of children) {
		unevaluatedNodes.add(child.id);
	}

	const outputValues = new Map<CCNodePinId, SimulationValue>();
	const visitedFlipFlops = new Set<CCNodeId>();

	while (unevaluatedNodes.size > 0) {
		const currentNodeId = nullthrows([...unevaluatedNodes][0]);
		unevaluatedNodes.delete(currentNodeId);
		const currentNode = nullthrows(store.nodes.get(currentNodeId));
		const currentComponentId = currentNode.componentId;

		if (
			nullthrows(nodePinInputNumber.get(currentNodeId)) ===
			nullthrows(foundInputNumber.get(currentNodeId))
		) {
			const frame = previousFrame
				? nullthrows(nullthrows(previousFrame).nodes.get(currentNodeId)).child
				: null;
			const result = simulateNode(
				store,
				currentNodeId,
				nodePinInputValues,
				frame,
			);
			if (!result) {
				return null;
			}
			childMap.set(currentNodeId, result);
			for (const [outputPinId, outputValue] of result.outputValues) {
				if (!visitedFlipFlops.has(currentNodeId)) {
					const connections = nullthrows(
						store.connections.getConnectionsByNodePinId(outputPinId),
					);
					if (connections.length !== 0) {
						for (const connection of connections) {
							const connectedNodePin = nullthrows(
								store.nodePins.get(connection.to),
							);
							nodePinInputValues.set(connectedNodePin.id, outputValue);
							foundInputNumber.set(
								connectedNodePin.nodeId,
								nullthrows(foundInputNumber.get(connectedNodePin.nodeId)) + 1,
							);
						}
					} else {
						const parentNodePin = nullthrows(
							nodePins.find((nodePin) => {
								const componentPin = nullthrows(
									store.componentPins.get(nodePin.componentPinId),
								);
								return (
									componentPin.type === "output" &&
									componentPin.implementation === outputPinId
								);
							}),
						);
						outputValues.set(parentNodePin.id, outputValue);
					}
					if (currentComponentId === flipflop.id) {
						visitedFlipFlops.add(currentNodeId);
					}
				}
			}
		} else if (
			currentComponentId === flipflop.id &&
			!visitedFlipFlops.has(currentNodeId)
		) {
			const frame = previousFrame
				? nullthrows(previousFrame?.nodes.get(currentNodeId)).child
				: null;
			const result = simulateNode(
				store,
				currentNodeId,
				nodePinInputValues,
				frame,
			);
			if (!result) {
				return null;
			}
			childMap.set(currentNodeId, result);
			for (const [outputPinId, outputValue] of result.outputValues) {
				if (!visitedFlipFlops.has(currentNodeId)) {
					const connections = nullthrows(
						store.connections.getConnectionsByNodePinId(outputPinId),
					);
					if (connections.length !== 0) {
						for (const connection of connections) {
							const connectedNodePin = nullthrows(
								store.nodePins.get(connection.to),
							);
							nodePinInputValues.set(connectedNodePin.id, outputValue);
							foundInputNumber.set(
								connectedNodePin.nodeId,
								nullthrows(foundInputNumber.get(connectedNodePin.nodeId)) + 1,
							);
						}
					} else {
						const parentNodePin = nullthrows(
							nodePins.find((nodePin) => {
								const componentPin = nullthrows(
									store.componentPins.get(nodePin.componentPinId),
								);
								return (
									componentPin.type === "output" &&
									componentPin.implementation === outputPinId
								);
							}),
						);
						outputValues.set(parentNodePin.id, outputValue);
					}
					if (currentComponentId === flipflop.outputPin.componentId) {
						visitedFlipFlops.add(currentNodeId);
					}
				}
			}
			visitedFlipFlops.add(currentNodeId);
			unevaluatedNodes.add(currentNodeId);
		} else {
			unevaluatedNodes.add(currentNodeId);
		}
	}

	const pins = new Map<CCNodePinId, SimulationValue>();
	for (const [key, value] of inputValues) {
		pins.set(key, value);
	}
	for (const [key, value] of outputValues) {
		pins.set(key, value);
	}
	const child = { componentId: node.componentId, nodes: childMap };
	return { outputValues, pins, child };
}

export default function simulateComponent(
	store: CCStore,
	componentId: CCComponentId,
	inputValues: Map<CCComponentPinId, SimulationValue>,
	previousFrame: SimulationFrame | null,
): SimulationFrame | null {
	const component = store.components.get(componentId);
	if (!component) throw new Error(`Component ${component} is not defined.`);
	const childMap = new Map<
		CCNodeId,
		{
			pins: Map<CCNodePinId, SimulationValue>;
			/** null if intrinsic */
			child: SimulationFrame | null;
		}
	>();
	const componentPins = store.componentPins.getManyByComponentId(componentId);
	const children = store.nodes.getManyByParentComponentId(component.id);
	const foundInputNumber = new Map<CCNodeId, number>();
	const nodePinInputNumber = new Map<CCNodeId, number>();
	const nodePinInputValues = new Map<CCNodePinId, SimulationValue>();
	for (const child of children) {
		foundInputNumber.set(child.id, 0);
		const innerPins = store.nodePins.getManyByNodeId(child.id);
		let inputPinNumber = 0;
		for (const innerPin of innerPins) {
			const componentPin = nullthrows(
				store.componentPins.get(innerPin.componentPinId),
			);
			if (componentPin.type === "input") {
				inputPinNumber += 1;
			}
		}
		nodePinInputNumber.set(child.id, inputPinNumber);
	}
	for (const componentPin of componentPins) {
		if (componentPin.type === "input" && componentPin.implementation) {
			const connectedNodePin = nullthrows(
				store.nodePins.get(componentPin.implementation),
			);
			nodePinInputValues.set(
				connectedNodePin.id,
				nullthrows(inputValues.get(componentPin.id)),
			);
			foundInputNumber.set(
				connectedNodePin.nodeId,
				nullthrows(foundInputNumber.get(connectedNodePin.nodeId)) + 1,
			);
		}
	}
	const unevaluatedNodes = new Set<CCNodeId>();
	for (const child of children) {
		unevaluatedNodes.add(child.id);
	}

	const outputValues = new Map<CCComponentPinId, SimulationValue>();
	const outputNodePinValues = new Map<CCNodePinId, SimulationValue>();
	const visitedFlipFlops = new Set<CCNodeId>();

	while (unevaluatedNodes.size > 0) {
		const currentNodeId = nullthrows([...unevaluatedNodes][0]);
		unevaluatedNodes.delete(currentNodeId);
		const currentNode = nullthrows(store.nodes.get(currentNodeId));
		const currentComponentId = currentNode.componentId;
		const currentComponent = nullthrows(
			store.components.get(currentComponentId),
		);

		if (
			nodePinInputNumber.get(currentNodeId) ===
			foundInputNumber.get(currentNodeId)
		) {
			const frame = (() => {
				if (!previousFrame) return null;
				if (currentComponent.intrinsicType) {
					return previousFrame;
				}
				return nullthrows(previousFrame.nodes.get(currentNodeId)).child;
			})();
			const currentNodePinInputValues = new Map<CCNodePinId, SimulationValue>();
			for (const nodePin of store.nodePins.getManyByNodeId(currentNodeId)) {
				const inputValue = nodePinInputValues.get(nodePin.id);
				if (inputValue) currentNodePinInputValues.set(nodePin.id, inputValue);
			}
			const result = simulateNode(
				store,
				currentNodeId,
				currentNodePinInputValues,
				frame,
			);
			if (!result) {
				return null;
			}
			childMap.set(currentNodeId, result);
			for (const [outputPinId, outputValue] of result.outputValues) {
				outputNodePinValues.set(outputPinId, outputValue);
				if (!visitedFlipFlops.has(currentNodeId)) {
					const connections =
						store.connections.getConnectionsByNodePinId(outputPinId);
					if (connections.length !== 0) {
						for (const connection of connections) {
							const connectedNodePin = nullthrows(
								store.nodePins.get(connection.to),
							);
							nodePinInputValues.set(connectedNodePin.id, outputValue);
							foundInputNumber.set(
								connectedNodePin.nodeId,
								nullthrows(foundInputNumber.get(connectedNodePin.nodeId)) + 1,
							);
						}
					} else {
						const parentComponentPin = nullthrows(
							componentPins.find((componentPin) => {
								return (
									componentPin.type === "output" &&
									componentPin.implementation === outputPinId
								);
							}),
						);
						outputValues.set(parentComponentPin.id, outputValue);
					}
					if (currentComponentId === flipflop.outputPin.componentId) {
						visitedFlipFlops.add(currentNodeId);
					}
				}
			}
		} else {
			unevaluatedNodes.add(currentNodeId);
		}
	}
	return { componentId, nodes: childMap };
}
