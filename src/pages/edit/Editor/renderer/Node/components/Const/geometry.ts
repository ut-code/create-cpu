import nullthrows from "nullthrows";
import { type Vector2, vector2 } from "../../../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeLayout,
	CCComponentEditorRendererNodeLayoutSource,
} from "../../types";

export const ccComponentEditorRendererNodeConstLayoutConstants = {
	padding: 8,
	gridSize: 12,
	gridSizeDisplayWidth: 60,
};

export function ccComponentRendererNodeConstLayoutCalculator(
	source: CCComponentEditorRendererNodeLayoutSource,
): CCComponentEditorRendererNodeLayout {
	return {
		size: vector2.create(400, 100),
		nodePinOffsetById: new Map<CCNodePinId, Vector2>([
			[nullthrows(source.outputNodePinIds[0]), vector2.create(400, 50)],
		]),
	};
}
