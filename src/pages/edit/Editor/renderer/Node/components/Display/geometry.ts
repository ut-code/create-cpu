import nullthrows from "nullthrows";
import { type Vector2, vector2 } from "../../../../../../../common/vector2";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeLayout,
	CCComponentEditorRendererNodeLayoutSource,
} from "../../types";

const size = { x: 320, y: 200 };

export const ccComponentEditorRendererNodeDisplayLayoutConstants = {
	padding: 8,
	gridSize: 12,
	gridSizeDisplayWidth: 60,
};

export function ccComponentRendererNodeDisplayLayoutCalculator(
	source: CCComponentEditorRendererNodeLayoutSource,
): CCComponentEditorRendererNodeLayout {
	const { padding, gridSize, gridSizeDisplayWidth } =
		ccComponentEditorRendererNodeDisplayLayoutConstants;
	const config = source.config as CCIntrinsicComponentDisplaySpec["config"];

	return {
		size: {
			x: gridSizeDisplayWidth + gridSize * config.resolution.x + padding * 2,
			y: gridSize * config.resolution.y + padding * 2,
		},
		nodePinOffsetById: new Map<CCNodePinId, Vector2>([
			[nullthrows(source.inputNodePinIds[0]), vector2.create(0, size.y / 2)],
		]),
	};
}
