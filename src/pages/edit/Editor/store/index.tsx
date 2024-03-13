import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import PIXI from "pixi.js";
import type { CCPinId } from "../../../../store/pin";
import type { CCNodeId } from "../../../../store/node";
import type { CCConnectionId } from "../../../../store/connection";
import {
  type WorldPerspectiveStoreMixin,
  worldPerspectiveStoreMixin,
} from "./worldPerspective";

export type EditorMode = EditorModeEdit | EditorModePlay;
export type EditorModeEdit = "edit";
export type EditorModePlay = "play";

export type RangeSelect = { start: PIXI.Point; end: PIXI.Point } | null;

export type InputValueKey = `${CCNodeId},${CCPinId}`;

type State = {
  editorMode: EditorMode;
  timeStep: number;
  selectedNodeIds: Set<CCNodeId>;
  rangeSelect: RangeSelect;
  setRangeSelect(rangeSelect: RangeSelect): void;
  selectedConnectionIds: Set<CCConnectionId>;
  inputValues: Map<InputValueKey, boolean[]>;
  getInputValue(nodeId: CCNodeId, pinId: CCPinId, bits: number): boolean[];
  setInputValue(nodeId: CCNodeId, pinId: CCPinId, value: boolean[]): void;
  setEditorMode(mode: EditorMode): void;
  resetTimeStep(): void;
  incrementTimeStep(): void;
  selectNode(ids: CCNodeId[], exclusive: boolean): void;
  unselectNode(ids: CCNodeId[]): void;
  selectConnection(ids: CCConnectionId[], exclusive: boolean): void;
} & WorldPerspectiveStoreMixin;

const createStore = () =>
  create<State>((set, get) => ({
    editorMode: "edit",
    timeStep: 0,
    selectedNodeIds: new Set(),
    rangeSelect: null,
    selectedConnectionIds: new Set(),
    inputValues: new Map(),
    getInputValue(nodeId: CCNodeId, pinId: CCPinId, bits: number) {
      return (
        this.inputValues.get(`${nodeId},${pinId}`) ??
        new Array(bits).fill(false)
      );
    },
    setInputValue(nodeId: CCNodeId, pinId: CCPinId, value: boolean[]) {
      set((state) => {
        return {
          ...state,
          inputValues: new Map(state.inputValues).set(
            `${nodeId},${pinId}`,
            value
          ),
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
  }));

export type ComponentEditorStore = ReturnType<typeof createStore>;

const context = createContext<ComponentEditorStore | null>(null);

export function ComponentEditorStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store] = useState(createStore);
  return <context.Provider value={store}>{children}</context.Provider>;
}

export function useComponentEditorStore() {
  const store = useContext(context);
  invariant(
    store,
    "useComponentEditorStore must be used within a ComponentEditorStoreProvider"
  );
  return store;
}
