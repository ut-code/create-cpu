import { type Vector2, vector2 } from "../../../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeLayout,
	CCComponentEditorRendererNodeLayoutSource,
} from "../../types";

export const ccComponentEditorRendererNodeInterfaceLayoutConstants = {
	width: 70,
	height: 30,
	labelWidth: 54,
	labelHeight: 16,
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
