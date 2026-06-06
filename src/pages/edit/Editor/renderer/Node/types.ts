import type { Rect } from "../../../../../common/rect";
import type { Vector2 } from "../../../../../common/vector2";
import type { CCComponent } from "../../../../../store/component";
import type { CCNode } from "../../../../../store/node";
import type { CCNodePinId } from "../../../../../store/nodePin";

export type CCComponentEditorRendererNodeRendererProps = {
	node: CCNode;
	nodeState: CCComponentEditorRendererNodeRendererNodeState;
	component: CCComponent;
	layout: CCComponentEditorRendererNodeLayout;
	geometry: CCComponentEditorRendererNodeGeometry;
};

export type CCComponentEditorRendererNodeLayout = {
	size: Vector2;
	nodePinOffsetById: Map<CCNodePinId, Vector2>;
};

export type CCComponentEditorRendererNodeLayoutSource = {
	config: CCNode["config"];
	inputNodePinIds: CCNodePinId[];
	outputNodePinIds: CCNodePinId[];
};

export type CCComponentEditorRendererNodeGeometry = {
	rect: Rect;
	nodePinPositionById: Map<CCNodePinId, Vector2>;
};

export type CCComponentEditorRendererNodeRendererNodeState = {
	isSelected: boolean;
};
