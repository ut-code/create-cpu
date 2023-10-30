import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCPinId } from "./pin";
import type { CCNodeId } from "./node";
import * as intrinsics from "./intrinsics";

export type CCEvaluationId = string;

export default class CCEvaluation {
  #inputCache: Map<CCEvaluationId, Map<CCPinId, boolean>>;

  #inputMultipleCache: Map<CCEvaluationId, Map<CCPinId, boolean[]>>;

  static readonly #cacheSize = 5;

  #store: CCStore;

  constructor(store: CCStore) {
    this.#inputCache = new Map<CCEvaluationId, Map<CCPinId, boolean>>();
    this.#inputMultipleCache = new Map<
      CCEvaluationId,
      Map<CCPinId, boolean[]>
    >();
    this.#store = store;
  }

  clear() {
    this.#inputCache.clear();
    this.#inputMultipleCache.clear();
  }

  static createId(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean>
  ): CCEvaluationId {
    let id = "";
    id += componentId as string;
    id += "_";
    for (const [key, value] of input) {
      id += key;
      id += "_";
      if (value) {
        id += "1";
      } else {
        id += "0";
      }
      id += "_";
    }
    return id;
  }

  evaluateIntrinsic(componentId: CCComponentId, input: Map<CCPinId, boolean>) {
    const component = this.#store.components.get(componentId)!;
    const pinIds = this.#store.pins.getPinIdsByComponentId(componentId);
    switch (component.id) {
      case intrinsics.notIntrinsicComponent.id:
        if (pinIds.length === 2) {
          const inputValue = input.get(
            intrinsics.notIntrinsicComponentInputPin.id
          );
          return !inputValue;
        }
        throw new Error(`invalid input number (${component.name})`);
      case intrinsics.andIntrinsicComponent.id:
        if (pinIds.length === 3) {
          const inputValue0 = input.get(
            intrinsics.andIntrinsicComponentInputPinA.id
          );
          const inputValue1 = input.get(
            intrinsics.andIntrinsicComponentInputPinB.id
          );
          return inputValue0 && inputValue1;
        }
        throw new Error(`invalid input number (${component.name})`);
      case intrinsics.orIntrinsicComponent.id:
        if (pinIds.length === 3) {
          const inputValue0 = input.get(
            intrinsics.orIntrinsicComponentInputPinA.id
          );
          const inputValue1 = input.get(
            intrinsics.orIntrinsicComponentInputPinB.id
          );
          return inputValue0 || inputValue1;
        }
        throw new Error(`invalid input number (${component.name})`);
      case intrinsics.xorIntrinsicComponent.id:
        if (pinIds.length === 3) {
          const inputValue0 = input.get(
            intrinsics.xorIntrinsicComponentInputPinA.id
          );
          const inputValue1 = input.get(
            intrinsics.xorIntrinsicComponentInputPinB.id
          );
          return inputValue0 !== inputValue1;
        }
        throw new Error(`invalid input number (${component.name})`);
      case intrinsics.inputIntrinsicComponent.id:
        if (pinIds.length === 2) {
          const inputValue = input.get(
            intrinsics.inputIntrinsicComponentInputPin.id
          );
          return inputValue;
        }
        throw new Error(`invalid input number (${component.name})`);
      // case "Sample":
      //   return true;
      default:
        throw new Error(`invalid component (${component.name})`);
    }
  }

  evaluateComponent(componentId: CCComponentId, input: Map<CCPinId, boolean>) {
    const component = this.#store.components.get(componentId);
    if (!component) throw new Error(`Component ${component} is not defined.`);
    const pinIds = this.#store.pins.getPinIdsByComponentId(componentId);
    if (component.isIntrinsic) {
      const outputValue = this.evaluateIntrinsic(componentId, input)!;
      const outputMap = new Map<CCPinId, boolean>();
      for (const pinId of pinIds) {
        const pin = this.#store.pins.get(pinId)!;
        if (pin.type === "output") {
          outputMap.set(pinId, outputValue);
        }
      }
      return outputMap;
    }
    const cacheHit = this.#inputCache.get(
      CCEvaluation.createId(componentId, input)
    );
    if (cacheHit) {
      return cacheHit;
    }
    const nodeIds =
      this.#store.nodes.getNodeIdsByParentComponentId(componentId);
    const foundInputNumber = new Map<CCNodeId, number>();
    const inputNumber = new Map<CCNodeId, number>();
    const inputValues = new Map<CCNodeId, Map<CCPinId, boolean>>();
    for (const nodeId of nodeIds) {
      foundInputNumber.set(nodeId, 0);
      inputValues.set(nodeId, new Map<CCPinId, boolean>());
      const node = this.#store.nodes.get(nodeId)!;
      const innerComponentId = node.componentId;
      const innerPinIds =
        this.#store.pins.getPinIdsByComponentId(innerComponentId);
      let inputPinNumber = 0;
      for (const innerPinId of innerPinIds) {
        const innerPin = this.#store.pins.get(innerPinId)!;
        if (innerPin.type === "input") {
          inputPinNumber += 1;
        }
      }
      inputNumber.set(nodeId, inputPinNumber);
    }
    for (const pinId of pinIds) {
      const pin = this.#store.pins.get(pinId)!;
      if (pin.type === "input") {
        if (pin.implementation.type === "user") {
          const connectedNodeId = pin.implementation.nodeId;
          const connectedPinId = pin.implementation.pinId;
          if (
            this.#store.connections.getConnectionIdsByPinId(
              connectedNodeId,
              connectedPinId
            )?.length === 0
          ) {
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
    }
    const unvisitedNodes = new Set<CCNodeId>();
    for (const nodeId of nodeIds) {
      unvisitedNodes.add(nodeId);
    }

    const componentOutputs = new Map<CCPinId, boolean>();
    while (unvisitedNodes.size > 0) {
      const currentNodeId = [...unvisitedNodes][0]!;
      unvisitedNodes.delete(currentNodeId);
      const currentNode = this.#store.nodes.get(currentNodeId)!;
      const currentComponentId = currentNode.componentId;
      if (
        inputNumber.get(currentNodeId)! === foundInputNumber.get(currentNodeId)!
      ) {
        const outputs = this.evaluateComponent(
          currentComponentId,
          inputValues.get(currentNodeId)!
        )!;
        for (const [outputPinId, outputValue] of outputs) {
          const connectionIds = this.#store.connections.getConnectionIdsByPinId(
            currentNodeId,
            outputPinId
          )!;
          if (connectionIds.length !== 0) {
            for (const connectionId of connectionIds) {
              const connection = this.#store.connections.get(connectionId)!;
              const connectedNodeId = connection.to.nodeId;
              const connectedPinId = connection.to.pinId;
              const tmp = inputValues.get(connectedNodeId)!;
              tmp.set(connectedPinId, outputValue);
              inputValues.set(connectedNodeId, tmp);
              foundInputNumber.set(
                connectedNodeId,
                foundInputNumber.get(connectedNodeId)! + 1
              );
            }
          } else {
            const parentComponentPinId = pinIds.find((id) => {
              const pin = this.#store.pins.get(id)!;
              return (
                pin.type === "output" &&
                pin.implementation.type === "user" &&
                pin.implementation.nodeId === currentNodeId &&
                pin.implementation.pinId === outputPinId
              );
            })!;
            componentOutputs.set(parentComponentPinId, outputValue);
          }
        }
      } else {
        unvisitedNodes.add(currentNodeId);
      }
    }
    this.#inputCache.set(
      CCEvaluation.createId(componentId, input),
      componentOutputs
    );
    return componentOutputs;
  }

  static createMultipleId(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>
  ): CCEvaluationId {
    let id = "";
    id += componentId as string;
    id += "_";
    for (const [key, values] of input) {
      id += key;
      id += "_";
      for (const value of values) {
        if (value) {
          id += "1";
        } else {
          id += "0";
        }
        id += "_";
      }
    }
    return id;
  }

  evaluateMultipleIntrinsic(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>
  ): boolean[] | null {
    const component = this.#store.components.get(componentId)!;
    const pinIds = this.#store.pins.getPinIdsByComponentId(componentId);
    switch (component.id) {
      case intrinsics.notIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        const inputValue = input.get(
          intrinsics.notIntrinsicComponentInputPin.id
        );
        const outputValue = [];
        for (const value of inputValue!) {
          outputValue.push(!value);
        }
        return outputValue;
      }
      case intrinsics.andIntrinsicComponent.id: {
        invariant(pinIds.length === 3);
        const inputValue0 = input.get(
          intrinsics.andIntrinsicComponentInputPinA.id
        );
        const inputValue1 = input.get(
          intrinsics.andIntrinsicComponentInputPinB.id
        );
        const outputValue = [];
        if (inputValue0!.length !== inputValue1!.length) {
          return null;
        }
        for (let i = 0; i < inputValue0!.length; i += 1) {
          outputValue.push(inputValue0![i]! && inputValue1![i]!);
        }
        return outputValue;
      }
      case intrinsics.orIntrinsicComponent.id: {
        invariant(pinIds.length === 3);
        const inputValue0 = input.get(
          intrinsics.orIntrinsicComponentInputPinA.id
        );
        const inputValue1 = input.get(
          intrinsics.orIntrinsicComponentInputPinB.id
        );
        if (inputValue0!.length !== inputValue1!.length) {
          return null;
        }
        const outputValue = [];
        for (let i = 0; i < inputValue0!.length; i += 1) {
          outputValue.push(inputValue0![i]! || inputValue1![i]!);
        }
        return outputValue;
      }
      case intrinsics.xorIntrinsicComponent.id: {
        invariant(pinIds.length === 3);
        const inputValue0 = input.get(
          intrinsics.xorIntrinsicComponentInputPinA.id
        );
        const inputValue1 = input.get(
          intrinsics.xorIntrinsicComponentInputPinB.id
        );
        if (inputValue0!.length !== inputValue1!.length) {
          return null;
        }
        const outputValue = [];
        for (let i = 0; i < inputValue0!.length; i += 1) {
          outputValue.push(inputValue0![i]! !== inputValue1![i]!);
        }
        return outputValue;
      }
      case intrinsics.inputIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        const inputValue = input.get(
          intrinsics.inputIntrinsicComponentInputPin.id
        );
        return inputValue!;
      }
      case intrinsics.fourBitsIntrinsicComponent.id: {
        invariant(pinIds.length === 5);
        const inputValue0 = input.get(
          intrinsics.fourBitsIntrinsicComponentInputPin0.id
        );
        const inputValue1 = input.get(
          intrinsics.fourBitsIntrinsicComponentInputPin1.id
        );
        const inputValue2 = input.get(
          intrinsics.fourBitsIntrinsicComponentInputPin2.id
        );
        const inputValue3 = input.get(
          intrinsics.fourBitsIntrinsicComponentInputPin3.id
        );
        if (
          inputValue0!.length === 1 &&
          inputValue1!.length === 1 &&
          inputValue2!.length === 1 &&
          inputValue3!.length === 1
        ) {
          const outputValue = [];
          outputValue.push(inputValue3![0]!);
          outputValue.push(inputValue2![0]!);
          outputValue.push(inputValue1![0]!);
          outputValue.push(inputValue0![0]!);
          return outputValue;
        }
        return null;
      }
      // case "Sample":
      //   return true;
      default:
        throw new Error(`invalid component (${component.name})`);
    }
  }

  evaluateMultipleComponent(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>
  ): Map<CCPinId, boolean[]> | null {
    const component = this.#store.components.get(componentId);
    if (!component) throw new Error(`Component ${component} is not defined.`);
    const pinIds = this.#store.pins.getPinIdsByComponentId(componentId);
    if (component.isIntrinsic) {
      const outputValue = this.evaluateMultipleIntrinsic(componentId, input);
      if (!outputValue) {
        return null;
      }
      const outputMap = new Map<CCPinId, boolean[]>();
      for (const pinId of pinIds) {
        const pin = this.#store.pins.get(pinId)!;
        if (pin.type === "output") {
          outputMap.set(pinId, outputValue);
        }
      }
      return outputMap;
    }
    const id = CCEvaluation.createMultipleId(componentId, input);
    const cacheHit = this.#inputMultipleCache.get(id);
    if (cacheHit) {
      return cacheHit;
    }
    const nodeIds =
      this.#store.nodes.getNodeIdsByParentComponentId(componentId);
    const foundInputNumber = new Map<CCNodeId, number>();
    const inputNumber = new Map<CCNodeId, number>();
    const inputValues = new Map<CCNodeId, Map<CCPinId, boolean[]>>();
    for (const nodeId of nodeIds) {
      foundInputNumber.set(nodeId, 0);
      inputValues.set(nodeId, new Map<CCPinId, boolean[]>());
      const node = this.#store.nodes.get(nodeId)!;
      const innerComponentId = node.componentId;
      const innerPinIds = this.#store.pins
        .getPinIdsByComponentId(innerComponentId)
        .filter((pinId) => {
          const pin = this.#store.pins.get(pinId)!;
          return (
            pin.implementation.type === "intrinsic" ||
            (pin.implementation.type === "user" &&
              this.#store.connections.getConnectionIdsByPinId(
                pin.implementation.nodeId,
                pin.implementation.pinId
              )?.length === 0)
          );
        });
      let inputPinNumber = 0;
      for (const innerPinId of innerPinIds) {
        const innerPin = this.#store.pins.get(innerPinId)!;
        if (innerPin.type === "input") {
          inputPinNumber += 1;
        }
      }
      inputNumber.set(nodeId, inputPinNumber);
    }
    for (const pinId of pinIds) {
      const pin = this.#store.pins.get(pinId)!;
      if (pin.type === "input") {
        if (pin.implementation.type === "user") {
          const connectedNodeId = pin.implementation.nodeId;
          const connectedPinId = pin.implementation.pinId;
          if (
            this.#store.connections.getConnectionIdsByPinId(
              connectedNodeId,
              connectedPinId
            )?.length === 0
          ) {
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
    }
    const unvisitedNodes = new Set<CCNodeId>();
    for (const nodeId of nodeIds) {
      unvisitedNodes.add(nodeId);
    }

    const componentOutputs = new Map<CCPinId, boolean[]>();
    while (unvisitedNodes.size > 0) {
      const currentNodeId = [...unvisitedNodes][0]!;
      unvisitedNodes.delete(currentNodeId);
      const currentNode = this.#store.nodes.get(currentNodeId)!;
      const currentComponentId = currentNode.componentId;
      if (
        inputNumber.get(currentNodeId)! === foundInputNumber.get(currentNodeId)!
      ) {
        const outputs = this.evaluateMultipleComponent(
          currentComponentId,
          inputValues.get(currentNodeId)!
        );
        if (!outputs) {
          return null;
        }
        for (const [outputPinId, outputValue] of outputs) {
          const connectionIds = this.#store.connections.getConnectionIdsByPinId(
            currentNodeId,
            outputPinId
          )!;
          if (connectionIds.length !== 0) {
            for (const connectionId of connectionIds) {
              const connection = this.#store.connections.get(connectionId)!;
              const connectedNodeId = connection.to.nodeId;
              const connectedPinId = connection.to.pinId;
              const tmp = inputValues.get(connectedNodeId)!;
              tmp.set(connectedPinId, outputValue);
              inputValues.set(connectedNodeId, tmp);
              foundInputNumber.set(
                connectedNodeId,
                foundInputNumber.get(connectedNodeId)! + 1
              );
            }
          } else {
            const parentComponentPinId = pinIds.find((pinId) => {
              const pin = this.#store.pins.get(pinId)!;
              return (
                pin.type === "output" &&
                pin.implementation.type === "user" &&
                pin.implementation.nodeId === currentNodeId &&
                pin.implementation.pinId === outputPinId
              );
            })!;
            componentOutputs.set(parentComponentPinId, outputValue);
          }
        }
      } else {
        unvisitedNodes.add(currentNodeId);
      }
    }
    if (this.#inputMultipleCache.size >= CCEvaluation.#cacheSize) {
      this.#inputMultipleCache.delete([...this.#inputMultipleCache.keys()][0]!);
    }
    this.#inputMultipleCache.set(id, componentOutputs);
    return componentOutputs;
  }
}
