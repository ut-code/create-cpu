import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import PIXI from "pixi.js";

type State = {
  selectedNodeIds: Set<string>;
  selectNode(ids: string[], exclusive: boolean): void;
  rangeSelect: { start: PIXI.Point; end: PIXI.Point } | undefined;
};

const createStore = () =>
  create<State>((set) => ({
    selectedNodeIds: new Set(),
    selectNode(ids: string[], exclusive: boolean) {
      set((state) => ({
        ...state,
        selectedNodeIds: new Set(
          exclusive ? ids : [...state.selectedNodeIds, ...ids]
        ),
      }));
    },
    rangeSelect: undefined,
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
