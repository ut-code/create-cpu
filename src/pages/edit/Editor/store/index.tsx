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
import CCEvaluation from "../../../../store/evaluation";

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
  inputValues: Map<InputValueKey, boolean[]>;
  getInputValue(nodePinId: CCComponentPinId): boolean[] | undefined;
  setInputValue(nodePinId: CCComponentPinId, value: boolean[]): void;
  setEditorMode(mode: EditorMode): void;
  resetTimeStep(): void;
  incrementTimeStep(): void;
  selectNode(ids: CCNodeId[], exclusive: boolean): void;
  unselectNode(ids: CCNodeId[]): void;
  selectConnection(ids: CCConnectionId[], exclusive: boolean): void;
} & WorldPerspectiveStoreMixin;

type SimulationValue = boolean[];
type SimulationFrame = {
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
  let simulationCacheKey: string = "";
  /** index = timeStep */
  let simulationCachedFrames: SimulationFrame[] = [];

  const editorStore = create<State>((set, get) => ({
    editorMode: "edit",
    timeStep: 0,
    selectedNodeIds: new Set(),
    rangeSelect: null,
    selectedConnectionIds: new Set(),
    inputValues: new Map(),
    /** @deprecated */
    getInputValue(componentPinId: CCComponentPinId) {
      return this.inputValues.get(componentPinId);
    },
    setInputValue(componentPinId: CCComponentPinId, value: boolean[]) {
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
    getNodePinValue(nodePinId: CCNodePinId): boolean[] {
      return [];
    },
    getComponentPinValue(componentPinId: CCComponentPinId): boolean[] {
      return [];
    },
  }));

  const simulationHandler = () => {
    const newSimulationCacheKey =
      store.nodes
        .toArray()
        .map((node) => node.id)
        .join() +
      store.connections
        .toArray()
        .map((connection) => connection.id)
        .join();
    const editorState = editorStore.getState();
    if (newSimulationCacheKey !== simulationCacheKey) {
      simulationCacheKey = newSimulationCacheKey;
      simulationCachedFrames = [];
    }
    for (
      let timeStep = simulationCachedFrames.length;
      timeStep <= editorState.timeStep;
      timeStep += 1
    ) {
      const previousFrame = simulationCachedFrames[timeStep - 1] ?? null;

      function simulateComponent(
        componentId: CCComponentId,
        inputValues: Map<CCComponentPinId, SimulationValue>,
        previousFrame: SimulationFrame | null
      ) {
        const evaluation = new CCEvaluation(store);
        evaluation.evaluate(componentId, inputValues)
      }

      simulationCachedFrames.push(
        simulateComponent(componentId, editorState.inputValues, previousFrame)
      );
    }
  };
  store.nodes.on("didRegister", simulationHandler);
  store.nodes.on("didUpdate", simulationHandler);
  store.nodes.on("didUnregister", simulationHandler);
  store.connections.on("didRegister", simulationHandler);
  store.connections.on("didUnregister", simulationHandler);
  editorStore.subscribe(simulationHandler);

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
  const store = useStore();
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
