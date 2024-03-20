import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCPinId } from "./pin";
import type { CCNodeId } from "./node";
import * as intrinsics from "./intrinsics";

type ComponentEvaluationResult = {
  readonly output: Map<CCPinId, boolean[]>;
  readonly outputNodePinValues?: Map<CCNodeId, Map<CCPinId, boolean[]>>;
};

export default class CCComponentEvaluator {
  #flipFlopValue: Map<CCNodeId, boolean[]> = new Map();

  #store: CCStore;

  #childrenEvaluator: Map<CCNodeId, CCComponentEvaluator> = new Map();

  constructor(store: CCStore) {
    this.#store = store;
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

        if (inputValue) {
          this.#flipFlopValue.set(nodeId!, inputValue!);
        }

        const outputMap = new Map<CCPinId, boolean[]>();
        if (timeStep > 0 && outputValue) {
          outputMap.set(
            intrinsics.flipFlopIntrinsicComponentOutputPin.id,
            outputValue
          );
        } else if (inputValue) {
          const initialValue = [];
          for (let i = 0; i < inputValue!.length; i += 1) {
            initialValue.push(false);
          }
          outputMap.set(
            intrinsics.flipFlopIntrinsicComponentOutputPin.id,
            initialValue
          );
        } else {
          // TODO: decide length of value (temporary: 1 bit)
          outputMap.set(intrinsics.flipFlopIntrinsicComponentOutputPin.id, [
            false,
          ]);
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

  evaluateComponent(
    componentId: CCComponentId,
    input: Map<CCPinId, boolean[]>,
    timeStep: number,
    _nodeId?: CCNodeId
  ): ComponentEvaluationResult | null {
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
        return null;
      }
      const output = new Map<CCPinId, boolean[]>();
      for (const pinId of pinIds) {
        const pin = this.#store.pins.get(pinId)!;
        if (pin.type === "output") {
          output.set(pinId, outputValue.get(pinId)!);
        }
      }
      return { output };
    }
    if (this.isCyclic(componentId)) {
      return null;
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
        .filter((pinId) => this.#store.pins.isInterfacePin(pinId));
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
            this.#store.connections.hasNoConnectionOf(
              connectedNodeId,
              connectedPinId
            )
          ) {
            inputValues
              .get(connectedNodeId)!
              .set(connectedPinId, input.get(pinId)!);
            foundInputNumber.set(
              connectedNodeId,
              foundInputNumber.get(connectedNodeId)! + 1
            );
          }
        }
      }
    }
    const unevaluatedNodes = new Set<CCNodeId>();
    for (const nodeId of nodeIds) {
      unevaluatedNodes.add(nodeId);
    }

    const output = new Map<CCPinId, boolean[]>();
    const outputNodePinValues = new Map<CCNodeId, Map<CCPinId, boolean[]>>();
    const visitedFlipFlops = new Set<CCNodeId>();

    while (unevaluatedNodes.size > 0) {
      const currentNodeId = [...unevaluatedNodes][0]!;
      unevaluatedNodes.delete(currentNodeId);
      const currentNode = this.#store.nodes.get(currentNodeId)!;
      const currentComponentId = currentNode.componentId;

      if (
        inputNumber.get(currentNodeId)! === foundInputNumber.get(currentNodeId)!
      ) {
        if (!this.#childrenEvaluator.has(currentNodeId)) {
          this.#childrenEvaluator.set(
            currentNodeId,
            new CCComponentEvaluator(this.#store)
          );
        }
        const evaluator = this.#childrenEvaluator.get(currentNodeId)!;
        const result = evaluator.evaluateComponent(
          currentComponentId,
          inputValues.get(currentNodeId)!,
          timeStep,
          currentNodeId
        );
        if (!result) {
          return null;
        }
        for (const [outputPinId, outputValue] of result.output) {
          outputNodePinValues.set(
            currentNodeId,
            outputNodePinValues
              .get(currentNodeId)
              ?.set(outputPinId, outputValue) ||
              new Map<CCPinId, boolean[]>().set(outputPinId, outputValue)
          );
          if (!visitedFlipFlops.has(currentNodeId)) {
            const connectionIds =
              this.#store.connections.getConnectionIdsByPinId(
                currentNodeId,
                outputPinId
              )!;
            if (connectionIds.length !== 0) {
              for (const connectionId of connectionIds) {
                const connection = this.#store.connections.get(connectionId)!;
                const connectedNodeId = connection.to.nodeId;
                const connectedPinId = connection.to.pinId;
                inputValues
                  .get(connectedNodeId)!
                  .set(connectedPinId, outputValue);
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
              output.set(parentComponentPinId, outputValue);
            }
            if (
              currentComponentId === intrinsics.flipFlopIntrinsicComponent.id
            ) {
              visitedFlipFlops.add(currentNodeId);
            }
          }
        }
      } else if (
        currentComponentId === intrinsics.flipFlopIntrinsicComponent.id &&
        !visitedFlipFlops.has(currentNodeId)
      ) {
        if (!this.#childrenEvaluator.has(currentNodeId)) {
          this.#childrenEvaluator.set(
            currentNodeId,
            new CCComponentEvaluator(this.#store)
          );
        }
        const evaluator = this.#childrenEvaluator.get(currentNodeId)!;
        const result = evaluator.evaluateComponent(
          currentComponentId,
          inputValues.get(currentNodeId)!,
          timeStep,
          currentNodeId
        );
        if (!result) {
          return null;
        }
        for (const [outputPinId, outputValue] of result.output) {
          outputNodePinValues.set(
            currentNodeId,
            outputNodePinValues
              .get(currentNodeId)
              ?.set(outputPinId, outputValue) ||
              new Map<CCPinId, boolean[]>().set(outputPinId, outputValue)
          );
          const connectionIds = this.#store.connections.getConnectionIdsByPinId(
            currentNodeId,
            outputPinId
          )!;
          if (connectionIds.length !== 0) {
            for (const connectionId of connectionIds) {
              const connection = this.#store.connections.get(connectionId)!;
              const connectedNodeId = connection.to.nodeId;
              const connectedPinId = connection.to.pinId;
              inputValues
                .get(connectedNodeId)!
                .set(connectedPinId, outputValue);
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
            output.set(parentComponentPinId, outputValue);
          }
        }
        visitedFlipFlops.add(currentNodeId);
        unevaluatedNodes.add(currentNodeId);
      } else {
        unevaluatedNodes.add(currentNodeId);
      }
    }
    return { output, outputNodePinValues };
  }
}
