import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import PIXI from "pixi.js";
import type { CCNodeId } from "../../../../store/node";
import type { CCConnectionId } from "../../../../store/connection";
import {
  type WorldPerspectiveStoreMixin,
  worldPerspectiveStoreMixin,
} from "./worldPerspective";
import type { CCComponentPinId } from "../../../../store/componentPin";
import { useStore } from "../../../../store/react";
import type CCStore from "../../../../store";
import type { CCNodePinId } from "../../../../store/nodePin";
import type { CCComponentId } from "../../../../store/component";
import { simulateComponent } from "../../../../store/componentEvaluator";

export type EditorMode = EditorModeEdit | EditorModePlay;
export type EditorModeEdit = "edit";
export type EditorModePlay = "play";

export type RangeSelect = { start: PIXI.Point; end: PIXI.Point } | null;

export type InputValueKey = CCComponentPinId;

type State = {
  editorMode: EditorMode;
  timeStep: number;
  selectedNodeIds: Set<CCNodeId>;
  rangeSelect: RangeSelect;
  setRangeSelect(rangeSelect: RangeSelect): void;
  selectedConnectionIds: Set<CCConnectionId>;
  inputValues: Map<InputValueKey, SimulationValue>;
  getInputValue(componentPinId: CCComponentPinId): SimulationValue;
  setInputValue(componentPinId: CCComponentPinId, value: SimulationValue): void;
  setEditorMode(mode: EditorMode): void;
  resetTimeStep(): void;
  incrementTimeStep(): void;
  selectNode(ids: CCNodeId[], exclusive: boolean): void;
  unselectNode(ids: CCNodeId[]): void;
  selectConnection(ids: CCConnectionId[], exclusive: boolean): void;
  getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined;
  getComponentPinValue(
    componentPinId: CCComponentPinId
  ): SimulationValue | undefined;
} & WorldPerspectiveStoreMixin;

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

function createEditorStore(componentId: CCComponentId, store: CCStore) {
  let simulationCacheKey = "";
  /** index = timeStep */
  let simulationCachedFrames: SimulationFrame[] = [];

  const editorStore = create<State>((set, get) => ({
    editorMode: "edit",
    timeStep: 0,
    selectedNodeIds: new Set(),
    rangeSelect: null,
    selectedConnectionIds: new Set(),
    /** @private */
    inputValues: new Map(),
    getInputValue(componentPinId: CCComponentPinId) {
      const value = this.inputValues.get(componentPinId);
      if (!value) {
        const multiplexability =
          store.componentPins.getComponentPinMultiplexability(componentPinId);
        if (multiplexability.isMultiplexable) {
          const newValue = [false];
          return newValue;
        }
        const newValue = new Array(multiplexability.multiplicity).fill(false);
        return newValue;
      }
      return value;
    },
    setInputValue(componentPinId: CCComponentPinId, value: SimulationValue) {
      set((state) => {
        return {
          ...state,
          inputValues: new Map(state.inputValues).set(componentPinId, value),
        };
      });
    },
    setRangeSelect(rangeSelect: RangeSelect) {
      set((state) => ({ ...state, rangeSelect }));
    },
    setEditorMode(mode: EditorMode) {
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
          [...state.selectedNodeIds].filter((nodeId) => !ids.includes(nodeId))
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
    ...worldPerspectiveStoreMixin(set, get),
    getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined {
      const { nodeId } = store.nodePins.get(nodePinId)!;
      const editorState = editorStore.getState();
      return simulationCachedFrames[editorState.timeStep]!.nodes.get(
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
  }));

  const executeSimulation = () => {
    if (editorStore.getState().editorMode !== "play") return;

    const newSimulationCacheKey =
      store.nodes
        .toArray()
        .map((node) => node.id)
        .join() +
      store.connections
        .toArray()
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

  return editorStore;
}

export type ComponentEditorStore = ReturnType<typeof createEditorStore>;

const context = createContext<ComponentEditorStore | null>(null);

export function ComponentEditorStoreProvider({
  componentId,
  children,
}: {
  componentId: CCComponentId;
  children: React.ReactNode;
}) {
  const { store } = useStore();
  const [editorStore] = useState(() => createEditorStore(componentId, store));
  return <context.Provider value={editorStore}>{children}</context.Provider>;
}

export function useComponentEditorStore() {
  const store = useContext(context);
  invariant(
    store,
    "useComponentEditorStore must be used within a ComponentEditorStoreProvider"
  );
  return store;
}
