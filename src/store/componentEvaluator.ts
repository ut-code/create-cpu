import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type CCStore from ".";
import type {
	SimulationFrame,
	SimulationValue,
} from "../pages/edit/Editor/store/slices/core";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import * as intrinsics from "./intrinsics";
import type { CCNodeId } from "./node";
import type { CCNodePin, CCNodePinId } from "./nodePin";

function simulateIntrinsic(
	store: CCStore,
	nodeId: CCNodeId,
	inputValues: Map<CCNodePinId, SimulationValue>,
	parentPreviousFrame: SimulationFrame | null,
): Map<CCNodePinId, SimulationValue> | null {
	const node = nullthrows(store.nodes.get(nodeId));
	const { componentId } = node;
	const pinIds = store.componentPins.getPinIdsByComponentId(componentId);
	const nodePins = store.nodePins.getManyByNodeId(nodeId);
	const inputNodePins = nodePins.filter((nodePin: CCNodePin) => {
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		return componentPin.type === "input";
	});
	const outputNodePins = nodePins.filter((nodePin: CCNodePin) => {
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		return componentPin.type === "output";
	});
	switch (componentId) {
		case intrinsics.notIntrinsicComponentDefinition.component.id: {
			invariant(pinIds.length === 2);
			const inputPinId = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.notIntrinsicComponentDefinition.inputPins[0])
							.id,
				),
			).id;
			const inputValue = nullthrows(inputValues.get(inputPinId));
			const outputPinId = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.notIntrinsicComponentDefinition.outputPins[0])
							.id,
				),
			).id;
			const outputValue = [];
			for (const value of inputValue) {
				outputValue.push(!value);
			}
			const outputValues = new Map<CCNodePinId, SimulationValue>();
			outputValues.set(outputPinId, outputValue);
			return outputValues;
		}
		case intrinsics.andIntrinsicComponentDefinition.component.id: {
			invariant(pinIds.length === 3);
			const inputPinId0 = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.andIntrinsicComponentDefinition.inputPins[0])
							.id,
				),
			).id;
			const inputPinId1 = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.andIntrinsicComponentDefinition.inputPins[1])
							.id,
				),
			).id;
			const inputValue0 = nullthrows(inputValues.get(inputPinId0));
			const inputValue1 = nullthrows(inputValues.get(inputPinId1));
			const outputPinId = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.andIntrinsicComponentDefinition.outputPins[0])
							.id,
				),
			).id;
			const outputValue: SimulationValue = [];
			if (inputValue0.length !== inputValue1.length) {
				return null;
			}
			for (let i = 0; i < inputValue0.length; i += 1) {
				outputValue.push(nullthrows(inputValue0[i] && inputValue1[i]));
			}
			const outputValues = new Map<CCNodePinId, SimulationValue>();
			outputValues.set(outputPinId, outputValue);
			return outputValues;
		}
		case intrinsics.orIntrinsicComponentDefinition.component.id: {
			invariant(pinIds.length === 3);
			const inputPinId0 = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.orIntrinsicComponentDefinition.inputPins[0])
							.id,
				),
			).id;
			const inputPinId1 = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.orIntrinsicComponentDefinition.inputPins[1])
							.id,
				),
			).id;
			const inputValue0 = nullthrows(inputValues.get(inputPinId0));
			const inputValue1 = nullthrows(inputValues.get(inputPinId1));
			const outputPinId = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.orIntrinsicComponentDefinition.outputPins[0])
							.id,
				),
			).id;
			const outputValue: SimulationValue = [];
			if (inputValue0.length !== inputValue1.length) {
				return null;
			}
			for (let i = 0; i < inputValue0.length; i += 1) {
				outputValue.push(nullthrows(inputValue0[i] || inputValue1[i]));
			}
			const outputValues = new Map<CCNodePinId, SimulationValue>();
			outputValues.set(outputPinId, outputValue);
			return outputValues;
		}
		case intrinsics.xorIntrinsicComponentDefinition.component.id: {
			invariant(pinIds.length === 3);
			const inputPinId0 = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.xorIntrinsicComponentDefinition.inputPins[0])
							.id,
				),
			).id;
			const inputPinId1 = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.xorIntrinsicComponentDefinition.inputPins[1])
							.id,
				),
			).id;
			const inputValue0 = nullthrows(inputValues.get(inputPinId0));
			const inputValue1 = nullthrows(inputValues.get(inputPinId1));
			const outputPinId = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(intrinsics.xorIntrinsicComponentDefinition.outputPins[0])
							.id,
				),
			).id;
			const outputValue: SimulationValue = [];
			if (inputValue0.length !== inputValue1.length) {
				return null;
			}
			for (let i = 0; i < inputValue0.length; i += 1) {
				outputValue.push(nullthrows(inputValue0[i] !== inputValue1[i]));
			}
			const outputValues = new Map<CCNodePinId, SimulationValue>();
			outputValues.set(outputPinId, outputValue);
			return outputValues;
		}
		case intrinsics.inputIntrinsicComponentDefinition.component.id: {
			invariant(pinIds.length === 2);
			const inputPinId = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(
							intrinsics.inputIntrinsicComponentDefinition.inputPins[0],
						).id,
				),
			).id;
			const inputValue = nullthrows(inputValues.get(inputPinId));
			const outputPinId = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(
							intrinsics.inputIntrinsicComponentDefinition.outputPins[0],
						).id,
				),
			).id;
			const outputValue = [];
			for (const value of inputValue) {
				outputValue.push(value);
			}
			const outputValues = new Map<CCNodePinId, SimulationValue>();
			outputValues.set(outputPinId, outputValue);
			return outputValues;
		}
		case intrinsics.aggregateIntrinsicComponentDefinition.component.id: {
			const outputPin = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(
							intrinsics.aggregateIntrinsicComponentDefinition.outputPins[0],
						).id,
				),
			);
			const outputValue = new Array<boolean>(
				nullthrows(outputPin.userSpecifiedBitWidth),
			).fill(false);
			for (const pin of inputNodePins) {
				outputValue[pin.order] = nullthrows(
					nullthrows(inputValues.get(pin.id))[pin.order],
				);
			}
			const outputMap = new Map<CCNodePinId, SimulationValue>();
			outputMap.set(outputPin.id, outputValue);
			return outputMap;
		}
		case intrinsics.decomposeIntrinsicComponentDefinition.component.id: {
			const inputPinId = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(
							intrinsics.decomposeIntrinsicComponentDefinition.inputPins[0],
						).id,
				),
			).id;
			const inputs = nullthrows(inputValues.get(inputPinId));
			const outputMap = new Map<CCNodePinId, SimulationValue>();
			for (const pin of outputNodePins) {
				outputMap.set(pin.id, [nullthrows(inputs[pin.order])]);
			}
			return outputMap;
		}
		case intrinsics.flipFlopIntrinsicComponentDefinition.component.id: {
			invariant(pinIds.length === 2);
			const inputPinId = nullthrows(
				inputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(
							intrinsics.flipFlopIntrinsicComponentDefinition.inputPins[0],
						).id,
				),
			).id;
			const outputPinId = nullthrows(
				outputNodePins.find(
					(nodePin: CCNodePin) =>
						nodePin.componentPinId ===
						nullthrows(
							intrinsics.flipFlopIntrinsicComponentDefinition.outputPins[0],
						).id,
				),
			).id;
			const outputValues = new Map<CCNodePinId, SimulationValue>();

			if (!parentPreviousFrame) {
				const multiplicity =
					store.nodePins.getNodePinMultiplexability(inputPinId);
				if (multiplicity.isMultiplexable) {
					outputValues.set(outputPinId, [false]);
				} else {
					outputValues.set(
						outputPinId,
						Array.from({ length: multiplicity.multiplicity }, () => false),
					);
				}
			} else {
				const previousValue = nullthrows(
					parentPreviousFrame.nodes.get(nodeId),
				).pins;
				const previousInputValue = nullthrows(previousValue.get(inputPinId));
				outputValues.set(outputPinId, previousInputValue);
			}
			return outputValues;
		}
		// case "Sample":
		//   return true;
		default:
			throw new Error(`invalid component (${componentId})`);
	}
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
					if (
						currentComponentId ===
						intrinsics.flipFlopIntrinsicComponentDefinition.component.id
					) {
						visitedFlipFlops.add(currentNodeId);
					}
				}
			}
		} else if (
			currentComponentId ===
				intrinsics.flipFlopIntrinsicComponentDefinition.component.id &&
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
					if (
						currentComponentId ===
						intrinsics.flipFlopIntrinsicComponentDefinition.component.id
					) {
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
					if (
						currentComponentId ===
						intrinsics.flipFlopIntrinsicComponentDefinition.component.id
					) {
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
