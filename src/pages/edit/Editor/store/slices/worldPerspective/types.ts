import * as PIXI from "pixi.js";

/** @deprecated */
type Perspective = Readonly<{
  scale: number;
  center: PIXI.Point;
}>;

/** @deprecated */
export type WorldPerspectiveStoreSlice = {
  canvasSize: PIXI.Point;
  worldPerspective: Perspective;
  setCanvasSize(size: PIXI.Point): void;
  setWorldPerspective(perspective: Perspective): void;
  toWorldPosition(canvasPosition: PIXI.Point): PIXI.Point;
  toCanvasPosition(worldPosition: PIXI.Point): PIXI.Point;
  zoom(zoomCenter: PIXI.Point, factor: number): void;
};
