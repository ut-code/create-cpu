import * as PIXI from "pixi.js";
import type { Perspective } from "../../../common/perspective";

export type WorldPerspectiveStoreMixin = {
  canvasSize: PIXI.Point;
  worldPerspective: Perspective;
  setCanvasSize(size: PIXI.Point): void;
  setWorldPerspective(perspective: Perspective): void;
  toWorldPosition(canvasPosition: PIXI.Point): PIXI.Point;
  toCanvasPosition(worldPosition: PIXI.Point): PIXI.Point;
  zoom(zoomCenter: PIXI.Point, factor: number): void;
};

export function worldPerspectiveStoreMixin(
  set: (
    reducer: (state: WorldPerspectiveStoreMixin) => WorldPerspectiveStoreMixin
  ) => void,
  get: () => WorldPerspectiveStoreMixin
): WorldPerspectiveStoreMixin {
  return {
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
  };
}
