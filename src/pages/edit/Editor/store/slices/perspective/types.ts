import type { Perspective } from "../../../../../../common/types";
import type { Vector2 } from "../../../../../../common/vector2";

export type PerspectiveStoreSlice = {
  perspective: Perspective;
  rendererSize: Vector2;
  setPerspective: (perspective: Perspective) => void;
  registerRendererElement: (element: SVGSVGElement | null) => void;
  fromCanvasToStage: (point: Vector2) => Vector2;
  fromStageToCanvas: (point: Vector2) => Vector2;
  getViewBox: () => { x: number; y: number; width: number; height: number };
};
