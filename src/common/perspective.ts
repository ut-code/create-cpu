import type * as PIXI from "pixi.js";

export type Perspective = Readonly<{
  scale: number;
  center: PIXI.Point;
}>;
