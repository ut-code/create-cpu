import * as PIXI from "pixi.js";
import type { ComponentEditorSliceCreator } from "../../types";
import type { WorldPerspectiveStoreSlice } from "./types";

/** @deprecated */
const createComponentEditorStoreWorldPerspectiveSlice: ComponentEditorSliceCreator<
  WorldPerspectiveStoreSlice
> = () => ({
  define: (set, get) => ({
    canvasSize: new PIXI.Point(0, 0),
    worldPerspective: {
      center: new PIXI.Point(0, 0),
      scale: 1,
    },
    setCanvasSize(canvasSize) {
      set((state) => ({ ...state, canvasSize }));
    },
    setWorldPerspective(worldPerspective) {
      set((state) => ({ ...state, worldPerspective }));
    },
    toWorldPosition(canvasPosition) {
      return canvasPosition
        .subtract(get().canvasSize.multiplyScalar(0.5))
        .multiplyScalar(1 / get().worldPerspective.scale)
        .add(get().worldPerspective.center);
    },
    toCanvasPosition(worldPosition) {
      return worldPosition
        .subtract(get().worldPerspective.center)
        .multiplyScalar(get().worldPerspective.scale)
        .add(get().canvasSize.multiplyScalar(0.5));
    },
    zoom(zoomCenter, factor) {
      set((state) => ({
        ...state,
        worldPerspective: {
          center: state.worldPerspective.center
            .subtract(zoomCenter)
            .multiplyScalar(1 / factor)
            .add(zoomCenter),
          scale: state.worldPerspective.scale * factor,
        },
      }));
    },
  }),
});

export default createComponentEditorStoreWorldPerspectiveSlice;
