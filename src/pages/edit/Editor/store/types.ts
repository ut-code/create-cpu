import type { StoreApi } from "zustand";
import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import type { EditorStoreCoreSlice } from "./slices/core/types";
import type { ContextMenuStoreSlice } from "./slices/contextMenu/types";
import type { PerspectiveStoreSlice } from "./slices/perspective/types";

export type ComponentEditorStoreValue = {
  readonly componentId: CCComponentId;
} & EditorStoreCoreSlice &
  PerspectiveStoreSlice &
  ContextMenuStoreSlice;

export type ComponentEditorSliceCreator<T> = (props: {
  store: CCStore;
  componentId: CCComponentId;
}) => {
  define: (
    set: (reducer: (state: T) => T) => void,
    get: () => ComponentEditorStoreValue
  ) => T;
  postCreate?: (editorStore: StoreApi<ComponentEditorStoreValue>) => void;
};
