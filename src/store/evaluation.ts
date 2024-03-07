import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCPinId } from "./pin";
import type { CCNodeId } from "./node";
import * as intrinsics from "./intrinsics";

export type CCEvaluationId = string;

type EvaluationCache = {
  componentOutputs: Map<CCPinId, boolean[]>;
  outputNodePinValues: Map<CCNodeId, Map<CCPinId, boolean[]>>;
};

export default class CCEvaluation {
  #cache: Map<CCEvaluationId, EvaluationCache>;

  #previousValueOfOutputNodePins: Map<CCNodeId, Map<CCPinId, boolean[]>> | null;

  #flipFlopValue: Map<CCNodeId, boolean[]> = new Map();

  static readonly #cacheSize = 5;

  #store: CCStore;

  constructor(store: CCStore) {
    this.#cache = new Map<CCEvaluationId, EvaluationCache>();
    this.#previousValueOfOutputNodePins = null;
    this.#store = store;
  }

  clear() {
    this.#cache.clear();
    this.#previousValueOfOutputNodePins?.clear();
  }

  static createId(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>,
    timeStep: number
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
    id += timeStep;
    return id;
  }

  evaluateIntrinsic(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>,
    timeStep: number,
    nodeId?: CCNodeId
  ): Map<CCPinId, boolean[]> | null {
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
        const outputMap = new Map<CCPinId, boolean[]>();
        outputMap.set(
          intrinsics.notIntrinsicComponentOutputPin.id,
          outputValue
        );
        return outputMap;
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
        const outputMap = new Map<CCPinId, boolean[]>();
        outputMap.set(
          intrinsics.andIntrinsicComponentOutputPin.id,
          outputValue
        );
        return outputMap;
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
        const outputMap = new Map<CCPinId, boolean[]>();
        outputMap.set(intrinsics.orIntrinsicComponentOutputPin.id, outputValue);
        return outputMap;
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
        const outputMap = new Map<CCPinId, boolean[]>();
        outputMap.set(
          intrinsics.xorIntrinsicComponentOutputPin.id,
          outputValue
        );
        return outputMap;
      }
      case intrinsics.inputIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        const inputValue = input.get(
          intrinsics.inputIntrinsicComponentInputPin.id
        );
        const outputMap = new Map<CCPinId, boolean[]>();
        outputMap.set(
          intrinsics.inputIntrinsicComponentOutputPin.id,
          inputValue!
        );
        return outputMap;
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
          const outputMap = new Map<CCPinId, boolean[]>();
          outputMap.set(
            intrinsics.fourBitsIntrinsicComponentOutputPin.id,
            outputValue
          );
          return outputMap;
        }
        return null;
      }
      case intrinsics.distiributeFourBitsIntrinsicComponent.id: {
        invariant(pinIds.length === 5);
        const inputValue = input.get(
          intrinsics.distiributeFourBitsIntrinsicComponentInputPin.id
        );
        if (inputValue!.length === 4) {
          const outputMap = new Map<CCPinId, boolean[]>();
          outputMap.set(
            intrinsics.distiributeFourBitsIntrinsicComponentOutputPin0.id,
            [inputValue![3]!]
          );
          outputMap.set(
            intrinsics.distiributeFourBitsIntrinsicComponentOutputPin1.id,
            [inputValue![2]!]
          );
          outputMap.set(
            intrinsics.distiributeFourBitsIntrinsicComponentOutputPin2.id,
            [inputValue![1]!]
          );
          outputMap.set(
            intrinsics.distiributeFourBitsIntrinsicComponentOutputPin3.id,
            [inputValue![0]!]
          );
          return outputMap;
        }
        return null;
      }
      case intrinsics.flipFlopIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        if (timeStep === 0) {
          this.#flipFlopValue.set(nodeId!, [false]);
        }
        const inputValue = input.get(
          intrinsics.flipFlopIntrinsicComponentInputPin.id
        );

        const outputValue = this.#flipFlopValue.get(nodeId!);

        this.#flipFlopValue.set(nodeId!, inputValue!);

        const outputMap = new Map<CCPinId, boolean[]>();
        if (timeStep > 0 && outputValue) {
          outputMap.set(
            intrinsics.flipFlopIntrinsicComponentOutputPin.id,
            outputValue
          );
        } else {
          const initialValue = [];
          for (let i = 0; i < inputValue!.length; i += 1) {
            initialValue.push(false);
          }
          outputMap.set(
            intrinsics.flipFlopIntrinsicComponentOutputPin.id,
            initialValue
          );
        }
        return outputMap;
      }
      // case "Sample":
      //   return true;
      default:
        throw new Error(`invalid component (${component.name})`);
    }
  }

  isCyclic(componentId: CCComponentId): boolean {
    const seen = new Set<CCNodeId>();
    const finished = new Set<CCNodeId>();
    const nodes = this.#store.nodes.getNodeIdsByParentComponentId(componentId);
    const dfs = (nodeId: CCNodeId) => {
      const node = this.#store.nodes.get(nodeId)!;
      const pinIds = this.#store.pins.getPinIdsByComponentId(node.componentId);
      const connectionIds = this.#store.connections.getConnectionIdsByPinId(
        nodeId,
        pinIds.find((pinId) => {
          const pin = this.#store.pins.get(pinId)!;
          return pin.type === "output";
        })!
      );
      seen.add(nodeId);
      for (const connectionId of connectionIds!) {
        const connection = this.#store.connections.get(connectionId)!;
        const connectedNodeId = connection.to.nodeId;
        if (!finished.has(connectedNodeId)) {
          if (seen.has(connectedNodeId)) return true;
          if (dfs(connectedNodeId)) return true;
        }
      }
      finished.add(nodeId);
      return false;
    };
    return dfs(nodes[0]!);
  }

  getCalculatedPinValue(
    nodeId: CCNodeId,
    pinId: CCPinId
  ): boolean[] | undefined {
    return this.#previousValueOfOutputNodePins?.get(nodeId)?.get(pinId);
  }

  evaluateComponent(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>,
    timeStep: number,
    _nodeId?: CCNodeId
  ): Map<CCPinId, boolean[]> | undefined {
    const id = CCEvaluation.createId(componentId, input, timeStep);
    const cacheHit = this.#cache.get(id);
    if (cacheHit) {
      this.#previousValueOfOutputNodePins = cacheHit.outputNodePinValues;
      return cacheHit.componentOutputs;
    }
    const component = this.#store.components.get(componentId);
    if (!component) throw new Error(`Component ${component} is not defined.`);
    const pinIds = this.#store.pins.getPinIdsByComponentId(componentId);
    if (component.isIntrinsic) {
      const outputValue = this.evaluateIntrinsic(
        componentId,
        input,
        timeStep,
        _nodeId
      );
      if (!outputValue) {
        return undefined;
      }
      const outputMap = new Map<CCPinId, boolean[]>();
      for (const pinId of pinIds) {
        const pin = this.#store.pins.get(pinId)!;
        if (pin.type === "output") {
          outputMap.set(pinId, outputValue.get(pinId)!);
        }
      }
      return outputMap;
    }
    if (this.isCyclic(componentId)) {
      return undefined;
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
    const outputNodePinValues = new Map<CCNodeId, Map<CCPinId, boolean[]>>();
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
          inputValues.get(currentNodeId)!,
          timeStep,
          currentNodeId
        );
        if (!outputs) {
          return undefined;
        }
        for (const [outputPinId, outputValue] of outputs) {
          const nodePinValue =
            outputNodePinValues.get(currentNodeId) ??
            new Map<CCPinId, boolean[]>();
          nodePinValue.set(outputPinId, outputValue);
          outputNodePinValues.set(currentNodeId, nodePinValue);
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
    if (this.#cache.size >= CCEvaluation.#cacheSize) {
      this.#cache.delete([...this.#cache.keys()][0]!);
    }
    this.#cache.set(id, {
      componentOutputs,
      outputNodePinValues,
    });
    this.#previousValueOfOutputNodePins = outputNodePinValues;
    return componentOutputs;
  }
}
