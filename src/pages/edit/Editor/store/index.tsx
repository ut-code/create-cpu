import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import { useStore } from "../../../../store/react";
import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import { createComponentEditorStoreCoreSlice } from "./slices/core";
import type { ComponentEditorStoreValue } from "./types";
import createComponentEditorStoreWorldPerspectiveSlice from "./slices/worldPerspective";
import createComponentEditorStorePerspectiveSlice from "./slices/perspective";

function createEditorStore(componentId: CCComponentId, store: CCStore) {
  const props = { store, componentId };
  const coreSlice = createComponentEditorStoreCoreSlice(props);
  const worldPerspectiveSlice =
    createComponentEditorStoreWorldPerspectiveSlice(props);
  const perspectiveSlice = createComponentEditorStorePerspectiveSlice(props);
  const editorStore = create<ComponentEditorStoreValue>((set, get) => ({
    componentId,
    ...coreSlice.define(set, get),
    ...worldPerspectiveSlice.define(set, get),
    ...perspectiveSlice.define(set, get),
  }));
  coreSlice.postCreate?.(editorStore);
  worldPerspectiveSlice.postCreate?.(editorStore);
  perspectiveSlice.postCreate?.(editorStore);
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
