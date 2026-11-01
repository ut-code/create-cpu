import { type Vector2, vector2 } from "../../../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeLayout,
	CCComponentEditorRendererNodeLayoutSource,
} from "../../types";

const bodyWidth = 90;
const arrowDepth = 10;

export const ccComponentEditorRendererNodeInterfaceLayoutConstants = {
	bodyWidth,
	arrowDepth,
	width: bodyWidth + arrowDepth,
	height: 30,
};

export function ccComponentRendererNodeInterfaceLayoutCalculator(
	source: CCComponentEditorRendererNodeLayoutSource,
): CCComponentEditorRendererNodeLayout {
	const { width, height } =
		ccComponentEditorRendererNodeInterfaceLayoutConstants;
	return {
		size: vector2.create(width, height),
		nodePinOffsetById: new Map<CCNodePinId, Vector2>([
			...source.inputNodePinIds.map(
				(id) => [id, vector2.create(0, height / 2)] as const,
			),
			...source.outputNodePinIds.map(
				(id) => [id, vector2.create(width, height / 2)] as const,
			),
		]),
	};
}
