import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import PIXI from "pixi.js";

type EditorMode = "edit" | "play";

type State = {
  editorMode: EditorMode;
  selectedNodeIds: Set<string>;
  rangeSelect: { start: PIXI.Point; end: PIXI.Point } | undefined;
  setEditorMode(mode: EditorMode): void;
  selectNode(ids: string[], exclusive: boolean): void;
};

const createStore = () =>
  create<State>((set) => ({
    editorMode: "edit",
    selectedNodeIds: new Set(),
    rangeSelect: undefined,
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
