import type { Perspective } from "../../../../../../common/types";
import type { Vector2 } from "../../../../../../common/vector2";
import type { CCNodeId } from "../../../../../../store/node";

export type PerspectiveStoreSlice = {
	perspective: Perspective;
	rendererSize: Vector2;
	getRendererPosition: () => Vector2;
	setPerspective: (perspective: Perspective) => void;
	/** Fits every node in view, if any of `nodeIds` in the edited component is out of it */
	showNodes: (nodeIds: ReadonlySet<CCNodeId>) => void;
	registerRendererElement: (element: SVGSVGElement | null) => void;
	fromCanvasToStage: (point: Vector2) => Vector2;
	fromStageToCanvas: (point: Vector2) => Vector2;
	getViewBox: () => { x: number; y: number; width: number; height: number };
};
