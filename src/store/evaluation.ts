import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCPinId } from "./pin";
import type { CCNodeId } from "./node";

function evaluateIntrinsic(
  store: CCStore,
  componentId: CCComponentId,
  input: Map<CCPinId, boolean>
) {
  const component = store.components.get(componentId)!;
  const pinIds = store.pins.getPinIdsByComponentId(componentId);
  switch (component.name) {
    case "Not":
      if (pinIds.length === 1) {
        const inputValue = input.get(pinIds[0] as CCPinId);
        return !inputValue;
      }
      throw new Error(`invalid input number (${component.name})`);
    case "And":
      if (pinIds.length === 2) {
        const inputValue0 = input.get(pinIds[0] as CCPinId);
        const inputValue1 = input.get(pinIds[1] as CCPinId);
        return inputValue0 && inputValue1;
      }
      throw new Error(`invalid input number (${component.name})`);
    case "Or":
      if (pinIds.length === 2) {
        const inputValue0 = input.get(pinIds[0] as CCPinId);
        const inputValue1 = input.get(pinIds[1] as CCPinId);
        return inputValue0 || inputValue1;
      }
      throw new Error(`invalid input number (${component.name})`);
    case "Sample":
      return true;
    default:
      throw new Error(`invalid component (${component.name})`);
  }
}

export default function evaluateComponent(
  store: CCStore,
  componentId: CCComponentId,
  input: Map<CCPinId, boolean>
) {
  const component = store.components.get(componentId);
  if (!component) throw new Error(`Component ${component} is not defined.`);
  const pinIds = store.pins.getPinIdsByComponentId(componentId);
  if (component.isIntrinsic) {
    const outputValue = evaluateIntrinsic(store, componentId, input)!;
    const outputMap = new Map<CCPinId, boolean>();
    for (const pinId of pinIds) {
      const pin = store.pins.get(pinId)!;
      if (pin.type === "output") {
        outputMap.set(pinId, outputValue);
      }
    }
    return outputMap;
  }
  const nodeIds = store.nodes.getNodeIdsByParentComponentId(componentId);
  const foundInputNumber = new Map<CCNodeId, number>();
  const inputNumber = new Map<CCNodeId, number>();
  const inputValues = new Map<CCNodeId, Map<CCPinId, boolean>>();
  for (const nodeId of nodeIds) {
    foundInputNumber.set(nodeId, 0);
    inputValues.set(nodeId, new Map<CCPinId, boolean>());
    const node = store.nodes.get(nodeId)!;
    const innerComponentId = node.componentId;
    const innerPinIds = store.pins.getPinIdsByComponentId(innerComponentId);
    let inputPinNumber = 0;
    for (const innerPinId of innerPinIds) {
      const innerPin = store.pins.get(innerPinId)!;
      if (innerPin.type === "input") {
        inputPinNumber += 1;
      }
    }
    inputNumber.set(nodeId, inputPinNumber);
  }
  for (const pinId of pinIds) {
    const pin = store.pins.get(pinId)!;
    if (pin.type === "input") {
      if (pin.implementation.type === "user") {
        const connectedNodeId = pin.implementation.nodeId;
        const connectedPinId = pin.implementation.pinId;
        const tmp = inputValues.get(connectedNodeId)!;
        tmp.set(connectedPinId, input.get(pinId)!);
        inputValues.set(connectedNodeId, tmp);
        foundInputNumber.set(
          connectedNodeId,
          foundInputNumber.get(connectedNodeId)! + 1
        );
      }
    }
  }
  const unvisitedNodes = new Set<CCNodeId>();
  for (const nodeId of nodeIds) {
    unvisitedNodes.add(nodeId);
  }

  const componentOutputs = new Map<CCPinId, boolean>();
  while (unvisitedNodes.size > 0) {
    const currentNodeId = [...unvisitedNodes][0]!;
    unvisitedNodes.delete(currentNodeId);
    const currentNode = store.nodes.get(currentNodeId)!;
    const currentComponentId = currentNode.componentId;
    if (
      inputNumber.get(currentNodeId)! === foundInputNumber.get(currentNodeId)!
    ) {
      const outputs = evaluateComponent(
        store,
        currentComponentId,
        inputValues.get(currentNodeId)!
      )!;
      for (const [outputPinId, outputValue] of outputs) {
        const connectionId = store.connections.getConnectionIdByPinId(
          currentNodeId,
          outputPinId
        )!;
        const connection = store.connections.get(connectionId);
        if (connection) {
          const connectedNodeId = connection.to.nodeId;
          const connectedPinId = connection.to.pinId;
          const tmp = inputValues.get(connectedNodeId)!;
          tmp.set(connectedPinId, outputValue);
          inputValues.set(connectedNodeId, tmp);
          foundInputNumber.set(
            connectedNodeId,
            foundInputNumber.get(connectedNodeId)! + 1
          );
        } else {
          componentOutputs.set(outputPinId, outputValue);
        }
      }
    } else {
      unvisitedNodes.add(currentNodeId);
    }
  }
  return componentOutputs;
}
