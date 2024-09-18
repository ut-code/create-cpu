import invariant from "tiny-invariant";
import type { CCComponentId } from "../../../../../../store/component";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCNodeId } from "../../../../../../store/node";
import type { CCNodePinId } from "../../../../../../store/nodePin";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { ComponentEditorSliceCreator } from "../../types";
import type { EditorStoreCoreSlice } from "./types";
import simulateComponent from "../../../../../../store/componentEvaluator";

export type SimulationValue = boolean[];
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

export const createComponentEditorStoreCoreSlice: ComponentEditorSliceCreator<
  EditorStoreCoreSlice
> = ({ store, componentId }) => {
  let simulationCacheKey = "";
  /** index = timeStep */
  let simulationCachedFrames: SimulationFrame[] = [];

  return {
    define: (set, get) => {
      return {
        editorMode: "edit",
        timeStep: 0,
        selectedNodeIds: new Set(),
        rangeSelect: null,
        selectedConnectionIds: new Set(),
        isCreatingConnectionFrom: null,
        /** @private */
        inputValues: new Map(),
        getInputValue(componentPinId: CCComponentPinId) {
          const value = this.inputValues.get(componentPinId);
          if (!value) {
            const multiplexability =
              store.componentPins.getComponentPinMultiplexability(
                componentPinId
              );
            if (multiplexability.isMultiplexable) {
              const newValue = [false];
              return newValue;
            }
            const newValue = new Array(multiplexability.multiplicity).fill(
              false
            );
            return newValue;
          }
          return value;
        },
        setInputValue(
          componentPinId: CCComponentPinId,
          value: SimulationValue
        ) {
          set((state) => {
            return {
              ...state,
              inputValues: new Map(state.inputValues).set(
                componentPinId,
                value
              ),
            };
          });
        },
        setRangeSelect(rangeSelect) {
          set((state) => ({ ...state, rangeSelect }));
        },
        setIsCreatingConnectionFrom(nodePinId) {
          set((state) => ({ ...state, isCreatingConnectionFrom: nodePinId }));
        },
        setEditorMode(mode) {
          set((state) => ({ ...state, editorMode: mode }));
        },
        resetTimeStep() {
          set((state) => ({ ...state, timeStep: 0 }));
        },
        incrementTimeStep() {
          set((state) => ({ ...state, timeStep: state.timeStep + 1 }));
        },
        selectNode(ids: CCNodeId[], exclusive: boolean) {
          set((state) => ({
            ...state,
            selectedNodeIds: new Set(
              exclusive ? ids : [...state.selectedNodeIds, ...ids]
            ),
            selectedConnectionIds: new Set(),
          }));
        },
        unselectNode(ids: CCNodeId[]) {
          set((state) => ({
            ...state,
            selectedNodeIds: new Set(
              [...state.selectedNodeIds].filter(
                (nodeId) => !ids.includes(nodeId)
              )
            ),
            selectedConnectionIds: new Set(),
          }));
        },
        selectConnection(ids: CCConnectionId[], exclusive: boolean) {
          set((state) => ({
            ...state,
            selectedConnectionIds: new Set(
              exclusive ? ids : [...state.selectedConnectionIds, ...ids]
            ),
            selectedNodeIds: new Set(),
          }));
        },
        getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined {
          const { nodeId } = store.nodePins.get(nodePinId)!;
          return simulationCachedFrames[get().timeStep]!.nodes.get(
            nodeId
          )!.pins.get(nodePinId);
        },
        getComponentPinValue(
          componentPinId: CCComponentPinId
        ): SimulationValue | undefined {
          const componentPin = store.componentPins.get(componentPinId)!;
          invariant(componentPin.implementation);
          const nodePinId = componentPin.implementation;
          return this.getNodePinValue(nodePinId);
        },
      };
    },
    postCreate: (editorStore) => {
      const executeSimulation = () => {
        if (editorStore.getState().editorMode !== "play") return;

        const newSimulationCacheKey =
          store.nodes
            .getMany()
            .map((node) => node.id)
            .join() +
          store.connections
            .getMany()
            .map((connection) => connection.id)
            .join() +
          [...editorStore.getState().inputValues.entries()]
            .map(([key, value]) => key + value.join())
            .join();
        if (newSimulationCacheKey !== simulationCacheKey) {
          simulationCacheKey = newSimulationCacheKey;
          simulationCachedFrames = [];
        }

        const editorState = editorStore.getState();
        let isUpdated = false;
        for (
          let timeStep = simulationCachedFrames.length;
          timeStep <= editorState.timeStep;
          timeStep += 1
        ) {
          const previousFrame = simulationCachedFrames[timeStep - 1] ?? null;
          const inputValues = new Map();
          const pins = store.componentPins.getManyByComponentId(componentId);
          for (const pin of pins) {
            inputValues.set(pin.id, editorState.getInputValue(pin.id));
          }
          simulationCachedFrames.push(
            simulateComponent(store, componentId, inputValues, previousFrame)!
          );
          isUpdated = true;
        }
        if (isUpdated) editorStore.setState((s) => ({ ...s }));
      };
      store.nodes.on("didRegister", executeSimulation);
      store.nodes.on("didUpdate", executeSimulation);
      store.nodes.on("didUnregister", executeSimulation);
      store.connections.on("didRegister", executeSimulation);
      store.connections.on("didUnregister", executeSimulation);
      editorStore.subscribe(executeSimulation);
    },
  };
};
