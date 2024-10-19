import * as matrix from "transformation-matrix";
import { type ComponentEditorSliceCreator } from "../../types";
import type { ContextMenuStoreSlice } from "./types";
import type { Point } from "../../../../../../common/types";

const createComponentEditorStoreContextMenuSlice: ComponentEditorSliceCreator<
  ContextMenuStoreSlice
> = () => ({
  define: (set, get) => ({
    contextMenuState: null,
    openContextMenu: (e, contextMenuState) => {
      const position: Point = matrix.applyToPoint(
        get().getInverseViewTransformation(),
        {
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY,
        }
      );
      set((state) => ({
        ...state,
        contextMenuState: { ...contextMenuState, position },
      }));
    },
    closeContextMenu: () =>
      set((state) => ({ ...state, contextMenuState: null })),
  }),
});

export default createComponentEditorStoreContextMenuSlice;
