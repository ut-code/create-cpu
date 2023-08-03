import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import PIXI from "pixi.js";
import type { CCPinId } from "../../../store/pin";
import type { CCNodeId } from "../../../store/node";

type EditorMode = "edit" | "play";

export type RangeSelect = { start: PIXI.Point; end: PIXI.Point } | null;

export type InputValueKey = `${CCNodeId},${CCPinId}`;

type State = {
  editorMode: EditorMode;
  selectedNodeIds: Set<string>;
  rangeSelect: RangeSelect;
  setRangeSelect(rangeSelect: RangeSelect): void;
  inputValues: Map<InputValueKey, boolean>;
  setEditorMode(mode: EditorMode): void;
  selectNode(ids: string[], exclusive: boolean): void;
};

const createStore = () =>
  create<State>((set) => ({
    editorMode: "edit",
    selectedNodeIds: new Set(),
    rangeSelect: null,
    inputValues: new Map(),
    getInputValue(nodeId: CCNodeId, pinId: CCPinId) {
      return this.inputValues.get(`${nodeId},${pinId}`) ?? false;
    },
    setInputValue(nodeId: CCNodeId, pinId: CCPinId, value: boolean) {
      set((state) => {
        return {
          ...state,
          inputValues: state.inputValues.set(`${nodeId},${pinId}`, value),
        };
      });
    },
    setRangeSelect(rangeSelect: RangeSelect) {
      set((state) => ({ ...state, rangeSelect }));
    },
    setEditorMode(mode: EditorMode) {
      set((state) => ({ ...state, editorMode: mode }));
    },
    selectNode(ids: string[], exclusive: boolean) {
      set((state) => ({
        ...state,
        selectedNodeIds: new Set(
          exclusive ? ids : [...state.selectedNodeIds, ...ids]
        ),
      }));
    },
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
