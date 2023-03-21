import type * as PIXI from "pixi.js";

export interface IDragManager {
  requestDragging(callback: (delta: PIXI.Point) => void): void;
}
