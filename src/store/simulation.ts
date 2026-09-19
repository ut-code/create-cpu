import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCComponentPin, CCComponentPinId } from "./componentPin";
import type {
	CCComponentPinInstanceShapes,
	CCIntrinsicComponentShape,
	ComponentEvaluationContext,
} from "./intrinsics/base";
import { definitionByComponentId } from "./intrinsics/definitions";
import type { CCIntrinsicComponentSpec } from "./intrinsics/types";
import type { CCNodeId } from "./node";
import type { CCNodePin, CCNodePinId } from "./nodePin";

export type SimulationValue = boolean[];

export function wrappingIncrementSimulationValue(
	value: SimulationValue,
): SimulationValue {
	const result = value.slice();
	for (let i = result.length - 1; i >= 0; i--) {
		if (!result[i]) {
			result[i] = true;
			break;
		}
		result[i] = false; // carry the increment
	}
	return result;
}

export type SimulationFrame = {
	componentId: CCComponentId;
	nodes: Map<
		CCNodeId,
		{
			pins: Map<CCNodePinId, SimulationValue>;
			/** null if intrinsic */
			child: SimulationFrame | null;
		}
	>;
};

function createShape(
	store: CCStore,
	nodeId: CCNodeId,
	pin: Record<string, CCComponentPin>,
	context: ComponentEvaluationContext,
): Record<string, CCComponentPinInstanceShapes> {
	const node = nullthrows(store.nodes.get(nodeId));
	const { componentId } = node;
	const nodePins = store.nodePins.getManyByNodeId(nodeId);
	const componentDefinition = definitionByComponentId.get(componentId);
	invariant(componentDefinition);
	const shape: Record<string, CCComponentPinInstanceShapes> = {};
	for (const key in pin) {
		const componentPin = nullthrows(pin[key]);
		const inputNodePins = nodePins.filter(
			(nodePin: CCNodePin) => componentPin.id === nodePin.componentPinId,
		);
		inputNodePins.sort((a, b) => a.order - b.order);
		shape[key] = [];
		for (const nodePin of inputNodePins) {
			const bitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
				nodePin.id,
			);
			const bitWidth = !bitWidthStatus.isFixed
				? context.defaultBitWidth
				: bitWidthStatus.bitWidth;
			shape[key].push({ nodePinId: nodePin.id, bitWidth });
		}
	}
	return shape;
}

function createIntrinsicComponentShape<Spec extends CCIntrinsicComponentSpec>(
	store: CCStore,
	nodeId: CCNodeId,
	context: ComponentEvaluationContext,
): CCIntrinsicComponentShape<Spec> {
	const node = nullthrows(store.nodes.get(nodeId));
	const { componentId } = node;
	const componentDefinition = definitionByComponentId.get(componentId);
	invariant(componentDefinition);
	const inputPin = componentDefinition.inputPin;
	const outputPin = componentDefinition.outputPin;
	const inputShape = createShape(store, nodeId, inputPin, context);
	const outputShape = createShape(store, nodeId, outputPin, context);

	return { inputShape, outputShape };
}

function simulateIntrinsic(
	store: CCStore,
	nodeId: CCNodeId,
	context: ComponentEvaluationContext,
): boolean {
	const node = nullthrows(store.nodes.get(nodeId));
	const { componentId } = node;
	const componentDefinition = definitionByComponentId.get(componentId);
	invariant(componentDefinition);
	const shape = createIntrinsicComponentShape(store, nodeId, context);
	return componentDefinition.evaluate(context, nodeId, shape, node.config);
}

function simulateNode(
	store: CCStore,
	nodeId: CCNodeId,
	context: ComponentEvaluationContext,
): boolean {
	const node = nullthrows(store.nodes.get(nodeId));
	const component = store.components.get(node.componentId);
	if (!component) throw new Error(`Component ${component} is not defined.`);
	if (component.intrinsicType) {
		return simulateIntrinsic(store, nodeId, context);
	}
	const nodePins = store.nodePins.getManyByNodeId(nodeId);
	const outerNodePinValues: Map<CCNodePinId, SimulationValue> = nullthrows(
		context.currentFrame.nodes.get(nodeId)?.pins,
	);

	const inputValues: Map<CCComponentPinId, SimulationValue> = new Map();
	// check all input values are in context
	for (const outerNodePin of nodePins) {
		const componentPin = nullthrows(
			store.componentPins.get(outerNodePin.componentPinId),
		);
		if (componentPin.type === "input") {
			if (!outerNodePinValues.has(outerNodePin.id)) {
				return false;
			}
			inputValues.set(
				componentPin.id,
				nullthrows(outerNodePinValues.get(outerNodePin.id)),
			);
		}
	}

	let childDefaultBitWidth = context.defaultBitWidth;
	for (const nodePin of nodePins) {
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		const componentPinBitWidthStatus =
			store.componentPins.getComponentPinBitWidthStatus(componentPin.id);
		if (
			!componentPinBitWidthStatus.isFixed &&
			componentPinBitWidthStatus.fixMode === "automatic"
		) {
			const nodePinBitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
				nodePin.id,
			);
			if (nodePinBitWidthStatus.isFixed) {
				childDefaultBitWidth = nodePinBitWidthStatus.bitWidth;
				break;
			}
		}
	}

	const innerSimulationFrame = simulateComponent(
		store,
		component.id,
		inputValues,
		context.previousFrame
			? nullthrows(context.previousFrame.nodes.get(nodeId)).child
			: null,
		childDefaultBitWidth,
	);

	// Set output values for component to parent
	for (const nodePin of nodePins) {
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		if (componentPin.type === "output") {
			const implementationNodePin = nullthrows(
				store.nodePins.get(nullthrows(componentPin.implementation)),
			);
			const value = nullthrows(
				innerSimulationFrame.nodes
					.get(implementationNodePin.nodeId)
					?.pins.get(implementationNodePin.id),
			);
			outerNodePinValues.set(nodePin.id, value);
		}
	}

	nullthrows(context.currentFrame.nodes.get(nodeId)).child =
		innerSimulationFrame;
	return true;
}

export default function simulateComponent(
	store: CCStore,
	componentId: CCComponentId,
	inputValues: Map<CCComponentPinId, SimulationValue>,
	previousFrame: SimulationFrame | null,
	defaultBitWidth: number = 1,
): SimulationFrame {
	const currentSimulationFrame = {
		componentId: componentId,
		nodes: new Map<
			CCNodeId,
			{
				pins: Map<CCNodePinId, SimulationValue>;
				/** null if intrinsic */
				child: SimulationFrame | null;
			}
		>(),
	};
	const children = store.nodes.getManyByParentComponentId(componentId);

	for (const child of children) {
		const pins = store.nodePins.getManyByNodeId(child.id);
		for (const pin of pins) {
			const componentPin = nullthrows(
				store.componentPins.get(pin.componentPinId),
			);
			if (componentPin.type === "input") {
				const connections = nullthrows(
					store.connections.getConnectionsByNodePinId(pin.id),
				);
				if (connections.length === 0) {
					throw new Error(
						`Input pin ${pin.id} of node ${child.id} is not connected.`,
					);
				}
			}
		}
	}

	const nodePinInputNumber = new Map<CCNodeId, number>();

	// Initialize maps
	for (const child of children) {
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
		currentSimulationFrame.nodes.set(child.id, {
			pins: new Map(),
			child: null,
		});
	}

	for (const [componentPinId, inputValue] of inputValues) {
		const componentPin = nullthrows(store.componentPins.get(componentPinId));
		if (componentPin.type === "input") {
			const connectedNodePin = nullthrows(
				store.nodePins.get(nullthrows(componentPin.implementation)),
			);
			currentSimulationFrame.nodes
				.get(connectedNodePin.nodeId)
				?.pins.set(connectedNodePin.id, inputValue);
		}
	}

	const unevaluatedNodes = new Set<CCNodeId>();
	for (const child of children) {
		unevaluatedNodes.add(child.id);
	}

	const childContext = {
		previousFrame: previousFrame,
		currentFrame: currentSimulationFrame,
		defaultBitWidth,
	};

	while (unevaluatedNodes.size > 0) {
		const currentNodeId = nullthrows([...unevaluatedNodes][0]);
		unevaluatedNodes.delete(currentNodeId);

		if (simulateNode(store, currentNodeId, childContext)) {
			// propagate output values through connections
			const currentNodePinValues = nullthrows(
				childContext.currentFrame.nodes.get(currentNodeId)?.pins,
			);
			for (const [nodePinId, outputValue] of currentNodePinValues) {
				const nodePin = nullthrows(store.nodePins.get(nodePinId));
				const componentPin = nullthrows(
					store.componentPins.get(nodePin.componentPinId),
				);
				if (componentPin.type === "output") {
					const connections = nullthrows(
						store.connections.getConnectionsByNodePinId(nodePinId),
					);
					for (const connection of connections) {
						const toNodePin = nullthrows(store.nodePins.get(connection.to));
						const toNodePinValues = nullthrows(
							childContext.currentFrame.nodes.get(toNodePin.nodeId)?.pins,
						);
						toNodePinValues.set(toNodePin.id, outputValue);
					}
				}
			}
		} else {
			unevaluatedNodes.add(currentNodeId);
		}
	}
	return currentSimulationFrame;
}
