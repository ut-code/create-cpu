import type { Rect } from "../../../../../common/rect";
import type { Vector2 } from "../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../store/nodePin";

export type CCComponentEditorRendererNodeGeometrySource = {
	position: Vector2;
	inputNodePinIds: CCNodePinId[];
	outputNodePinIds: CCNodePinId[];
};

export type CCComponentEditorRendererNodeGeometry = {
	rect: Rect;
	nodePinPositionById: Map<CCNodePinId, Vector2>;
};

export type CCComponentEditorRendererNodeGeometryCalculator = (
	source: CCComponentEditorRendererNodeGeometrySource
) => CCComponentEditorRendererNodeGeometry;
