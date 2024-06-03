import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCNodeId } from "./node";
import * as intrinsics from "./intrinsics";
import type { CCNodePin, CCNodePinId } from "./nodePin";
import type { CCComponentPinId } from "./componentPin";
import type {
  SimulationFrame,
  SimulationValue,
} from "../pages/edit/Editor/store";

type ComponentEvaluationResult = {
  readonly output: Map<CCComponentPinId, SimulationValue>;
  readonly outputNodePinValues?: Map<CCNodePinId, SimulationValue>;
};

/**
 * Class for component evaluator
 */
export default class CCComponentEvaluator {
  #flipFlopValue: Map<CCNodeId, SimulationValue> = new Map();

  #store: CCStore;

  #childrenEvaluator: Map<CCNodeId, CCComponentEvaluator> = new Map();

  /**
   * Constructor of CCComponentEvaluator
   * @param store store
   */
  constructor(store: CCStore) {
    this.#store = store;
  }

  /**
   * Evaluate intrinsic component
   * @param componentId id of component
   * @param input map of input pins and their values
   * @param timeStep time step
   * @param nodeId id of node
   * @returns map of output pins and their values
   */
  evaluateIntrinsic(
    nodeId: CCNodeId,
    input: Map<CCNodePinId, SimulationValue>,
    timeStep: number
  ): Map<CCNodePinId, SimulationValue> | null {
    const node = this.#store.nodes.get(nodeId)!;
    const { componentId } = node;
    const pinIds =
      this.#store.componentPins.getPinIdsByComponentId(componentId);
    const nodePins = this.#store.nodePins.getManyByNodeId(nodeId);
    const store = this.#store;
    const inputNodePins = nodePins.filter((nodePin: CCNodePin) => {
      const componentPin = store.componentPins.get(nodePin.componentPinId)!;
      return componentPin.type === "input";
    });
    const outputNodePins = nodePins.filter((nodePin: CCNodePin) => {
      const componentPin = store.componentPins.get(nodePin.componentPinId)!;
      return componentPin.type === "output";
    });
    switch (componentId) {
      case intrinsics.notIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        const inputPinId = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.notIntrinsicComponentInputPin.id
        )!.id;
        const inputValue = input.get(inputPinId);
        const outputPinId = outputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.notIntrinsicComponentOutputPin.id
        )!.id;
        const outputValue = [];
        for (const value of inputValue!) {
          outputValue.push(!value);
        }
        const outputMap = new Map<CCNodePinId, SimulationValue>();
        outputMap.set(outputPinId, outputValue);
        return outputMap;
      }
      case intrinsics.andIntrinsicComponent.id: {
        invariant(pinIds.length === 3);
        const inputPinId0 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.andIntrinsicComponentInputPinA.id
        )!.id;
        const inputPinId1 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.andIntrinsicComponentInputPinB.id
        )!.id;
        const inputValue0 = input.get(inputPinId0);
        const inputValue1 = input.get(inputPinId1);
        const outputPinId = outputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.andIntrinsicComponentOutputPin.id
        )!.id;
        const outputValue = [];
        if (inputValue0!.length !== inputValue1!.length) {
          return null;
        }
        for (let i = 0; i < inputValue0!.length; i += 1) {
          outputValue.push(inputValue0![i]! && inputValue1![i]!);
        }
        const outputMap = new Map<CCNodePinId, SimulationValue>();
        outputMap.set(outputPinId, outputValue);
        return outputMap;
      }
      case intrinsics.orIntrinsicComponent.id: {
        invariant(pinIds.length === 3);
        const inputPinId0 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.orIntrinsicComponentInputPinA.id
        )!.id;
        const inputPinId1 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.orIntrinsicComponentInputPinB.id
        )!.id;
        const inputValue0 = input.get(inputPinId0);
        const inputValue1 = input.get(inputPinId1);
        const outputPinId = outputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.orIntrinsicComponentOutputPin.id
        )!.id;
        const outputValue = [];
        if (inputValue0!.length !== inputValue1!.length) {
          return null;
        }
        for (let i = 0; i < inputValue0!.length; i += 1) {
          outputValue.push(inputValue0![i]! || inputValue1![i]!);
        }
        const outputMap = new Map<CCNodePinId, SimulationValue>();
        outputMap.set(outputPinId, outputValue);
        return outputMap;
      }
      case intrinsics.xorIntrinsicComponent.id: {
        invariant(pinIds.length === 3);
        const inputPinId0 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.xorIntrinsicComponentInputPinA.id
        )!.id;
        const inputPinId1 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.xorIntrinsicComponentInputPinB.id
        )!.id;
        const inputValue0 = input.get(inputPinId0);
        const inputValue1 = input.get(inputPinId1);
        const outputPinId = outputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.xorIntrinsicComponentOutputPin.id
        )!.id;
        const outputValue = [];
        if (inputValue0!.length !== inputValue1!.length) {
          return null;
        }
        for (let i = 0; i < inputValue0!.length; i += 1) {
          outputValue.push(inputValue0![i]! !== inputValue1![i]!);
        }
        const outputMap = new Map<CCNodePinId, SimulationValue>();
        outputMap.set(outputPinId, outputValue);
        return outputMap;
      }
      case intrinsics.inputIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        const inputPinId = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.inputIntrinsicComponentInputPin.id
        )!.id;
        const inputValue = input.get(inputPinId);
        const outputPinId = outputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.inputIntrinsicComponentOutputPin.id
        )!.id;
        const outputValue = [];
        for (const value of inputValue!) {
          outputValue.push(!value);
        }
        const outputMap = new Map<CCNodePinId, SimulationValue>();
        outputMap.set(outputPinId, outputValue);
        return outputMap;
      }
      case intrinsics.fourBitsIntrinsicComponent.id: {
        invariant(pinIds.length === 5);
        const inputPinId0 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.fourBitsIntrinsicComponentInputPin0.id
        )!.id;
        const inputPinId1 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.fourBitsIntrinsicComponentInputPin1.id
        )!.id;
        const inputPinId2 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.fourBitsIntrinsicComponentInputPin2.id
        )!.id;
        const inputPinId3 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.fourBitsIntrinsicComponentInputPin3.id
        )!.id;
        const inputValue0 = input.get(inputPinId0);
        const inputValue1 = input.get(inputPinId1);
        const inputValue2 = input.get(inputPinId2);
        const inputValue3 = input.get(inputPinId3);
        const outputPinId = outputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.fourBitsIntrinsicComponentOutputPin.id
        )!.id;
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
          const outputMap = new Map<CCNodePinId, SimulationValue>();
          outputMap.set(outputPinId, outputValue);
          return outputMap;
        }
        return null;
      }
      case intrinsics.distributeFourBitsIntrinsicComponent.id: {
        invariant(pinIds.length === 5);
        const inputPinId = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.distributeFourBitsIntrinsicComponentInputPin.id
        )!.id;
        const inputValue = input.get(inputPinId);
        const outputPinId0 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.distributeFourBitsIntrinsicComponentOutputPin0.id
        )!.id;
        const outputPinId1 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.distributeFourBitsIntrinsicComponentOutputPin1.id
        )!.id;
        const outputPinId2 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.distributeFourBitsIntrinsicComponentOutputPin2.id
        )!.id;
        const outputPinId3 = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.distributeFourBitsIntrinsicComponentOutputPin3.id
        )!.id;
        if (inputValue!.length === 4) {
          const outputMap = new Map<CCNodePinId, SimulationValue>();
          outputMap.set(outputPinId0, [inputValue![3]!]);
          outputMap.set(outputPinId1, [inputValue![2]!]);
          outputMap.set(outputPinId2, [inputValue![1]!]);
          outputMap.set(outputPinId3, [inputValue![0]!]);
          return outputMap;
        }
        return null;
      }
      case intrinsics.flipFlopIntrinsicComponent.id: {
        invariant(pinIds.length === 2);
        const inputPinId = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.flipFlopIntrinsicComponentInputPin.id
        )!.id;
        if (timeStep === 0) {
          const multiplicity =
            this.#store.nodePins.getNodePinMultiplexability(inputPinId);
          if (multiplicity.isMultiplexable) {
            this.#flipFlopValue.set(nodeId!, [false]);
          } else {
            this.#flipFlopValue.set(
              nodeId!,
              Array.from({ length: multiplicity.multiplicity }, () => false)
            );
          }
        }
        const inputValue = input.get(inputPinId);

        const outputPinId = inputNodePins.find(
          (nodePin: CCNodePin) =>
            nodePin.componentPinId ===
            intrinsics.flipFlopIntrinsicComponentOutputPin.id
        )!.id;

        const outputValue = this.#flipFlopValue.get(nodeId!);

        if (inputValue) {
          this.#flipFlopValue.set(nodeId!, inputValue!);
        }

        const outputMap = new Map<CCNodePinId, SimulationValue>();
        if (timeStep > 0 && outputValue) {
          outputMap.set(outputPinId, outputValue);
        } else if (inputValue) {
          const initialValue = [];
          for (let i = 0; i < inputValue!.length; i += 1) {
            initialValue.push(false);
          }
          outputMap.set(outputPinId, initialValue);
        } else {
          // TODO: decide length of value (temporary: 1 bit)
          outputMap.set(outputPinId, [false]);
        }
        return outputMap;
      }
      // case "Sample":
      //   return true;
      default:
        throw new Error(`invalid component (${componentId})`);
    }
  }

  /**
   * Check if nodes and connections of the component of `componentId` are forming a cycle
   * @param componentId id of component
   * @returns if nodes and connections of the component of `componentId` are forming a cycle, `true` returns (otherwise `false`)
   */
  isCyclic(componentId: CCComponentId): boolean {
    const seen = new Set<CCNodeId>();
    const finished = new Set<CCNodeId>();
    const nodes = this.#store.nodes.getManyByParentComponentId(componentId);
    const dfs = (nodeId: CCNodeId) => {
      const node = this.#store.nodes.get(nodeId)!;
      const pins = this.#store.nodePins.getManyByNodeId(node.id);
      const connections = this.#store.connections.getConnectionsByNodePinId(
        pins.find((pin: CCNodePin) => {
          const componentPin = this.#store.componentPins.get(
            pin.componentPinId
          )!;
          return componentPin.type === "output";
        })!.id
      );
      seen.add(nodeId);
      for (const connection of connections!) {
        const connectedNodePin = this.#store.nodePins.get(connection.to)!;
        const connectedNodeId = connectedNodePin.nodeId;
        if (!finished.has(connectedNodePin.nodeId)) {
          if (seen.has(connectedNodeId)) return true;
          if (dfs(connectedNodeId)) return true;
        }
      }
      finished.add(nodeId);
      return false;
    };
    return dfs(nodes[0]!.id);
  }

  /**
   * Evaluate component
   * @param componentId id of component
   * @param input map of input pins and their values
   * @param timeStep time step
   * @param _nodeId id of node
   * @returns result of evaluation
   */
  evaluateNode(
    nodeId: CCNodeId,
    input: Map<CCNodePinId, SimulationValue>,
    timeStep: number
  ): Map<CCNodePinId, SimulationValue> | null {
    const node = this.#store.nodes.get(nodeId)!;
    const component = this.#store.components.get(node.componentId);
    if (!component) throw new Error(`Component ${component} is not defined.`);
    if (component.isIntrinsic) {
      const output = this.evaluateIntrinsic(nodeId, input, timeStep);
      if (!output) {
        return null;
      }
      return output;
    }
    if (this.isCyclic(component.id)) {
      return null;
    }
    const nodePins = this.#store.nodePins.getManyByNodeId(nodeId);
    const children = this.#store.nodes.getManyByParentComponentId(component.id);
    const foundInputNumber = new Map<CCNodeId, number>();
    const inputNumber = new Map<CCNodeId, number>();
    const inputValues = new Map<CCNodePinId, SimulationValue>();
    for (const child of children) {
      foundInputNumber.set(child.id, 0);
      const innerPins = this.#store.nodePins.getManyByNodeId(child.id);
      let inputPinNumber = 0;
      for (const innerPin of innerPins) {
        const componentPin = this.#store.componentPins.get(
          innerPin.componentPinId
        )!;
        if (componentPin.type === "input") {
          inputPinNumber += 1;
        }
      }
      inputNumber.set(child.id, inputPinNumber);
    }
    for (const nodePin of nodePins) {
      const componentPin = this.#store.componentPins.get(
        nodePin.componentPinId
      )!;
      if (componentPin.type === "input" && componentPin.implementation) {
        const connectedNodePin = this.#store.nodePins.get(
          componentPin.implementation
        )!;
        inputValues.set(connectedNodePin.id, input.get(nodePin.id)!);
        foundInputNumber.set(
          connectedNodePin.nodeId,
          foundInputNumber.get(connectedNodePin.nodeId)! + 1
        );
      }
    }
    const unevaluatedNodes = new Set<CCNodeId>();
    for (const child of children) {
      unevaluatedNodes.add(child.id);
    }

    const output = new Map<CCNodePinId, SimulationValue>();
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
        const result = evaluator.evaluateNode(
          currentNodeId,
          inputValues,
          timeStep
        );
        if (!result) {
          return null;
        }
        for (const [outputPinId, outputValue] of result) {
          if (!visitedFlipFlops.has(currentNodeId)) {
            const connections =
              this.#store.connections.getConnectionsByNodePinId(outputPinId)!;
            if (connections.length !== 0) {
              for (const connection of connections) {
                const connectedNodePin = this.#store.nodePins.get(
                  connection.to
                )!;
                inputValues.set(connectedNodePin.id, outputValue);
                foundInputNumber.set(
                  connectedNodePin.nodeId,
                  foundInputNumber.get(connectedNodePin.nodeId)! + 1
                );
              }
            } else {
              const parentNodePin = nodePins.find((nodePin) => {
                const componentPin = this.#store.componentPins.get(
                  nodePin.componentPinId
                )!;
                return (
                  componentPin.type === "output" &&
                  componentPin.implementation === outputPinId
                );
              })!;
              output.set(parentNodePin.id, outputValue);
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
        const result = evaluator.evaluateNode(
          currentNodeId,
          inputValues,
          timeStep
        );
        if (!result) {
          return null;
        }
        for (const [outputPinId, outputValue] of result) {
          if (!visitedFlipFlops.has(currentNodeId)) {
            const connections =
              this.#store.connections.getConnectionsByNodePinId(outputPinId)!;
            if (connections.length !== 0) {
              for (const connection of connections) {
                const connectedNodePin = this.#store.nodePins.get(
                  connection.to
                )!;
                inputValues.set(connectedNodePin.id, outputValue);
                foundInputNumber.set(
                  connectedNodePin.nodeId,
                  foundInputNumber.get(connectedNodePin.nodeId)! + 1
                );
              }
            } else {
              const parentNodePin = nodePins.find((nodePin) => {
                const componentPin = this.#store.componentPins.get(
                  nodePin.componentPinId
                )!;
                return (
                  componentPin.type === "output" &&
                  componentPin.implementation === outputPinId
                );
              })!;
              output.set(parentNodePin.id, outputValue);
            }
            if (
              currentComponentId === intrinsics.flipFlopIntrinsicComponent.id
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
    return output;
  }

  evaluateComponent(
    componentId: CCComponentId,
    input: Map<CCComponentPinId, SimulationValue>,
    timeStep: number
  ): ComponentEvaluationResult | null {
    const component = this.#store.components.get(componentId);
    if (!component) throw new Error(`Component ${component} is not defined.`);
    if (this.isCyclic(component.id)) {
      return null;
    }
    const componentPins =
      this.#store.componentPins.getManyByComponentId(componentId);
    const children = this.#store.nodes.getManyByParentComponentId(component.id);
    const foundInputNumber = new Map<CCNodeId, number>();
    const inputNumber = new Map<CCNodeId, number>();
    const inputValues = new Map<CCNodePinId, SimulationValue>();
    for (const child of children) {
      foundInputNumber.set(child.id, 0);
      const innerPins = this.#store.nodePins.getManyByNodeId(child.id);
      let inputPinNumber = 0;
      for (const innerPin of innerPins) {
        const componentPin = this.#store.componentPins.get(
          innerPin.componentPinId
        )!;
        if (componentPin.type === "input") {
          inputPinNumber += 1;
        }
      }
      inputNumber.set(child.id, inputPinNumber);
    }
    for (const componentPin of componentPins) {
      if (componentPin.type === "input" && componentPin.implementation) {
        const connectedNodePin = this.#store.nodePins.get(
          componentPin.implementation
        )!;
        inputValues.set(connectedNodePin.id, input.get(componentPin.id)!);
        foundInputNumber.set(
          connectedNodePin.nodeId,
          foundInputNumber.get(connectedNodePin.nodeId)! + 1
        );
      }
    }
    const unevaluatedNodes = new Set<CCNodeId>();
    for (const child of children) {
      unevaluatedNodes.add(child.id);
    }

    const output = new Map<CCComponentPinId, SimulationValue>();
    const outputNodePinValues = new Map<CCNodePinId, SimulationValue>();
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
        const result = evaluator.evaluateNode(
          currentNodeId,
          inputValues,
          timeStep
        );
        if (!result) {
          return null;
        }
        for (const [outputPinId, outputValue] of result) {
          outputNodePinValues.set(outputPinId, outputValue);
          if (!visitedFlipFlops.has(currentNodeId)) {
            const connections =
              this.#store.connections.getConnectionsByNodePinId(outputPinId)!;
            if (connections.length !== 0) {
              for (const connection of connections) {
                const connectedNodePin = this.#store.nodePins.get(
                  connection.to
                )!;
                inputValues.set(connectedNodePin.id, outputValue);
                foundInputNumber.set(
                  connectedNodePin.nodeId,
                  foundInputNumber.get(connectedNodePin.nodeId)! + 1
                );
              }
            } else {
              const parentComponentPin = componentPins.find((componentPin) => {
                return (
                  componentPin.type === "output" &&
                  componentPin.implementation === outputPinId
                );
              })!;
              output.set(parentComponentPin.id, outputValue);
            }
            if (
              currentComponentId === intrinsics.flipFlopIntrinsicComponent.id
            ) {
              visitedFlipFlops.add(currentNodeId);
            }
          }
        }
      } else {
        unevaluatedNodes.add(currentNodeId);
      }
    }
    return { output, outputNodePinValues };
  }
}

function simulateIntrinsic(
  store: CCStore,
  nodeId: CCNodeId,
  inputValues: Map<CCNodePinId, SimulationValue>,
  parentPreviousFrame: SimulationFrame | null
): Map<CCNodePinId, SimulationValue> | null {
  const node = store.nodes.get(nodeId)!;
  const { componentId } = node;
  const pinIds = store.componentPins.getPinIdsByComponentId(componentId);
  const nodePins = store.nodePins.getManyByNodeId(nodeId);
  const inputNodePins = nodePins.filter((nodePin: CCNodePin) => {
    const componentPin = store.componentPins.get(nodePin.componentPinId)!;
    return componentPin.type === "input";
  });
  const outputNodePins = nodePins.filter((nodePin: CCNodePin) => {
    const componentPin = store.componentPins.get(nodePin.componentPinId)!;
    return componentPin.type === "output";
  });
  switch (componentId) {
    case intrinsics.notIntrinsicComponent.id: {
      invariant(pinIds.length === 2);
      const inputPinId = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId === intrinsics.notIntrinsicComponentInputPin.id
      )!.id;
      const inputValue = inputValues.get(inputPinId);
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.notIntrinsicComponentOutputPin.id
      )!.id;
      const outputValue = [];
      for (const value of inputValue!) {
        outputValue.push(!value);
      }
      const outputValues = new Map<CCNodePinId, SimulationValue>();
      outputValues.set(outputPinId, outputValue);
      return outputValues;
    }
    case intrinsics.andIntrinsicComponent.id: {
      invariant(pinIds.length === 3);
      const inputPinId0 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.andIntrinsicComponentInputPinA.id
      )!.id;
      const inputPinId1 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.andIntrinsicComponentInputPinB.id
      )!.id;
      const inputValue0 = inputValues.get(inputPinId0);
      const inputValue1 = inputValues.get(inputPinId1);
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.andIntrinsicComponentOutputPin.id
      )!.id;
      const outputValue = [];
      if (inputValue0!.length !== inputValue1!.length) {
        return null;
      }
      for (let i = 0; i < inputValue0!.length; i += 1) {
        outputValue.push(inputValue0![i]! && inputValue1![i]!);
      }
      const outputValues = new Map<CCNodePinId, SimulationValue>();
      outputValues.set(outputPinId, outputValue);
      return outputValues;
    }
    case intrinsics.orIntrinsicComponent.id: {
      invariant(pinIds.length === 3);
      const inputPinId0 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId === intrinsics.orIntrinsicComponentInputPinA.id
      )!.id;
      const inputPinId1 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId === intrinsics.orIntrinsicComponentInputPinB.id
      )!.id;
      const inputValue0 = inputValues.get(inputPinId0);
      const inputValue1 = inputValues.get(inputPinId1);
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId === intrinsics.orIntrinsicComponentOutputPin.id
      )!.id;
      const outputValue = [];
      if (inputValue0!.length !== inputValue1!.length) {
        return null;
      }
      for (let i = 0; i < inputValue0!.length; i += 1) {
        outputValue.push(inputValue0![i]! || inputValue1![i]!);
      }
      const outputValues = new Map<CCNodePinId, SimulationValue>();
      outputValues.set(outputPinId, outputValue);
      return outputValues;
    }
    case intrinsics.xorIntrinsicComponent.id: {
      invariant(pinIds.length === 3);
      const inputPinId0 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.xorIntrinsicComponentInputPinA.id
      )!.id;
      const inputPinId1 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.xorIntrinsicComponentInputPinB.id
      )!.id;
      const inputValue0 = inputValues.get(inputPinId0);
      const inputValue1 = inputValues.get(inputPinId1);
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.xorIntrinsicComponentOutputPin.id
      )!.id;
      const outputValue = [];
      if (inputValue0!.length !== inputValue1!.length) {
        return null;
      }
      for (let i = 0; i < inputValue0!.length; i += 1) {
        outputValue.push(inputValue0![i]! !== inputValue1![i]!);
      }
      const outputValues = new Map<CCNodePinId, SimulationValue>();
      outputValues.set(outputPinId, outputValue);
      return outputValues;
    }
    case intrinsics.inputIntrinsicComponent.id: {
      invariant(pinIds.length === 2);
      const inputPinId = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.inputIntrinsicComponentInputPin.id
      )!.id;
      const inputValue = inputValues.get(inputPinId);
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.inputIntrinsicComponentOutputPin.id
      )!.id;
      const outputValue = [];
      for (const value of inputValue!) {
        outputValue.push(!value);
      }
      const outputValues = new Map<CCNodePinId, SimulationValue>();
      outputValues.set(outputPinId, outputValue);
      return outputValues;
    }
    case intrinsics.fourBitsIntrinsicComponent.id: {
      invariant(pinIds.length === 5);
      const inputPinId0 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.fourBitsIntrinsicComponentInputPin0.id
      )!.id;
      const inputPinId1 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.fourBitsIntrinsicComponentInputPin1.id
      )!.id;
      const inputPinId2 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.fourBitsIntrinsicComponentInputPin2.id
      )!.id;
      const inputPinId3 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.fourBitsIntrinsicComponentInputPin3.id
      )!.id;
      const inputValue0 = inputValues.get(inputPinId0);
      const inputValue1 = inputValues.get(inputPinId1);
      const inputValue2 = inputValues.get(inputPinId2);
      const inputValue3 = inputValues.get(inputPinId3);
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.fourBitsIntrinsicComponentOutputPin.id
      )!.id;
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
        const outputValues = new Map<CCNodePinId, SimulationValue>();
        outputValues.set(outputPinId, outputValue);
        return outputValues;
      }
      return null;
    }
    case intrinsics.distributeFourBitsIntrinsicComponent.id: {
      invariant(pinIds.length === 5);
      const inputPinId = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.distributeFourBitsIntrinsicComponentInputPin.id
      )!.id;
      const inputValue = inputValues.get(inputPinId);
      const outputPinId0 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.distributeFourBitsIntrinsicComponentOutputPin0.id
      )!.id;
      const outputPinId1 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.distributeFourBitsIntrinsicComponentOutputPin1.id
      )!.id;
      const outputPinId2 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.distributeFourBitsIntrinsicComponentOutputPin2.id
      )!.id;
      const outputPinId3 = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.distributeFourBitsIntrinsicComponentOutputPin3.id
      )!.id;
      if (inputValue!.length === 4) {
        const outputValues = new Map<CCNodePinId, SimulationValue>();
        outputValues.set(outputPinId0, [inputValue![3]!]);
        outputValues.set(outputPinId1, [inputValue![2]!]);
        outputValues.set(outputPinId2, [inputValue![1]!]);
        outputValues.set(outputPinId3, [inputValue![0]!]);
        return outputValues;
      }
      return null;
    }
    case intrinsics.flipFlopIntrinsicComponent.id: {
      invariant(pinIds.length === 2);
      const inputPinId = inputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.flipFlopIntrinsicComponentInputPin.id
      )!.id;
      const outputPinId = outputNodePins.find(
        (nodePin: CCNodePin) =>
          nodePin.componentPinId ===
          intrinsics.flipFlopIntrinsicComponentOutputPin.id
      )!.id;
      const outputValues = new Map<CCNodePinId, SimulationValue>();

      if (!parentPreviousFrame) {
        const multiplicity =
          store.nodePins.getNodePinMultiplexability(inputPinId);
        if (multiplicity.isMultiplexable) {
          outputValues.set(outputPinId, [false]);
        } else {
          outputValues.set(
            outputPinId,
            Array.from({ length: multiplicity.multiplicity }, () => false)
          );
        }
      } else {
        const previousValue = parentPreviousFrame.nodes.get(nodeId)!.pins;
        const previousInputValue = previousValue.get(inputPinId)!;
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
  previousFrame: SimulationFrame | null
): {
  outputValues: Map<CCNodePinId, SimulationValue>;
  pins: Map<CCNodePinId, SimulationValue>;
  child: SimulationFrame | null;
} | null {
  const node = store.nodes.get(nodeId)!;
  const component = store.components.get(node.componentId);
  if (!component) throw new Error(`Component ${component} is not defined.`);
  if (component.isIntrinsic) {
    const outputValues = simulateIntrinsic(
      store,
      nodeId,
      inputValues,
      previousFrame
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
      const componentPin = store.componentPins.get(innerPin.componentPinId)!;
      if (componentPin.type === "input") {
        inputPinNumber += 1;
      }
    }
    nodePinInputNumber.set(child.id, inputPinNumber);
  }
  for (const nodePin of nodePins) {
    const componentPin = store.componentPins.get(nodePin.componentPinId)!;
    if (componentPin.type === "input" && componentPin.implementation) {
      const connectedNodePin = store.nodePins.get(componentPin.implementation)!;
      nodePinInputValues.set(connectedNodePin.id, inputValues.get(nodePin.id)!);
      foundInputNumber.set(
        connectedNodePin.nodeId,
        foundInputNumber.get(connectedNodePin.nodeId)! + 1
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
    const currentNodeId = [...unevaluatedNodes][0]!;
    unevaluatedNodes.delete(currentNodeId);
    const currentNode = store.nodes.get(currentNodeId)!;
    const currentComponentId = currentNode.componentId;

    if (
      nodePinInputNumber.get(currentNodeId)! ===
      foundInputNumber.get(currentNodeId)!
    ) {
      const result = simulateNode(
        store,
        currentNodeId,
        nodePinInputValues,
        previousFrame!.nodes.get(currentNodeId)!.child
      );
      if (!result) {
        return null;
      }
      childMap.set(currentNodeId, result);
      for (const [outputPinId, outputValue] of result.outputValues) {
        if (!visitedFlipFlops.has(currentNodeId)) {
          const connections =
            store.connections.getConnectionsByNodePinId(outputPinId)!;
          if (connections.length !== 0) {
            for (const connection of connections) {
              const connectedNodePin = store.nodePins.get(connection.to)!;
              nodePinInputValues.set(connectedNodePin.id, outputValue);
              foundInputNumber.set(
                connectedNodePin.nodeId,
                foundInputNumber.get(connectedNodePin.nodeId)! + 1
              );
            }
          } else {
            const parentNodePin = nodePins.find((nodePin) => {
              const componentPin = store.componentPins.get(
                nodePin.componentPinId
              )!;
              return (
                componentPin.type === "output" &&
                componentPin.implementation === outputPinId
              );
            })!;
            outputValues.set(parentNodePin.id, outputValue);
          }
          if (currentComponentId === intrinsics.flipFlopIntrinsicComponent.id) {
            visitedFlipFlops.add(currentNodeId);
          }
        }
      }
    } else if (
      currentComponentId === intrinsics.flipFlopIntrinsicComponent.id &&
      !visitedFlipFlops.has(currentNodeId)
    ) {
      const result = simulateNode(
        store,
        currentNodeId,
        nodePinInputValues,
        previousFrame!.nodes.get(currentNodeId)!.child
      );
      if (!result) {
        return null;
      }
      childMap.set(currentNodeId, result);
      for (const [outputPinId, outputValue] of result.outputValues) {
        if (!visitedFlipFlops.has(currentNodeId)) {
          const connections =
            store.connections.getConnectionsByNodePinId(outputPinId)!;
          if (connections.length !== 0) {
            for (const connection of connections) {
              const connectedNodePin = store.nodePins.get(connection.to)!;
              nodePinInputValues.set(connectedNodePin.id, outputValue);
              foundInputNumber.set(
                connectedNodePin.nodeId,
                foundInputNumber.get(connectedNodePin.nodeId)! + 1
              );
            }
          } else {
            const parentNodePin = nodePins.find((nodePin) => {
              const componentPin = store.componentPins.get(
                nodePin.componentPinId
              )!;
              return (
                componentPin.type === "output" &&
                componentPin.implementation === outputPinId
              );
            })!;
            outputValues.set(parentNodePin.id, outputValue);
          }
          if (currentComponentId === intrinsics.flipFlopIntrinsicComponent.id) {
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

export function simulateComponent(
  store: CCStore,
  componentId: CCComponentId,
  inputValues: Map<CCComponentPinId, SimulationValue>,
  previousFrame: SimulationFrame | null
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
      const componentPin = store.componentPins.get(innerPin.componentPinId)!;
      if (componentPin.type === "input") {
        inputPinNumber += 1;
      }
    }
    nodePinInputNumber.set(child.id, inputPinNumber);
  }
  for (const componentPin of componentPins) {
    if (componentPin.type === "input" && componentPin.implementation) {
      const connectedNodePin = store.nodePins.get(componentPin.implementation)!;
      nodePinInputValues.set(
        connectedNodePin.id,
        inputValues.get(componentPin.id)!
      );
      foundInputNumber.set(
        connectedNodePin.nodeId,
        foundInputNumber.get(connectedNodePin.nodeId)! + 1
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
    const currentNodeId = [...unevaluatedNodes][0]!;
    unevaluatedNodes.delete(currentNodeId);
    const currentNode = store.nodes.get(currentNodeId)!;
    const currentComponentId = currentNode.componentId;

    if (
      nodePinInputNumber.get(currentNodeId)! ===
      foundInputNumber.get(currentNodeId)!
    ) {
      const result = simulateNode(
        store,
        currentNodeId,
        nodePinInputValues,
        previousFrame!.nodes.get(currentNodeId)!.child
      );
      if (!result) {
        return null;
      }
      childMap.set(currentNodeId, result);
      for (const [outputPinId, outputValue] of result.outputValues) {
        outputNodePinValues.set(outputPinId, outputValue);
        if (!visitedFlipFlops.has(currentNodeId)) {
          const connections =
            store.connections.getConnectionsByNodePinId(outputPinId)!;
          if (connections.length !== 0) {
            for (const connection of connections) {
              const connectedNodePin = store.nodePins.get(connection.to)!;
              nodePinInputValues.set(connectedNodePin.id, outputValue);
              foundInputNumber.set(
                connectedNodePin.nodeId,
                foundInputNumber.get(connectedNodePin.nodeId)! + 1
              );
            }
          } else {
            const parentComponentPin = componentPins.find((componentPin) => {
              return (
                componentPin.type === "output" &&
                componentPin.implementation === outputPinId
              );
            })!;
            outputValues.set(parentComponentPin.id, outputValue);
          }
          if (currentComponentId === intrinsics.flipFlopIntrinsicComponent.id) {
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
