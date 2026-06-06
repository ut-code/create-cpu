import type { Vector2 } from "../../../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeLayout,
	CCComponentEditorRendererNodeLayoutSource,
} from "../../types";

const width = 100;
const gapY = 20;
const paddingY = 15;

export function ccComponentRendererNodeDefaultLayoutCalculator(
	source: CCComponentEditorRendererNodeLayoutSource,
): CCComponentEditorRendererNodeLayout {
	const size: Vector2 = {
		x: width,
		y:
			gapY *
				Math.max(
					source.inputNodePinIds.length,
					source.outputNodePinIds.length,
				) +
			paddingY * 2,
	};

	const nodePinOffsetById = new Map<CCNodePinId, Vector2>();

	const startYIn =
		size.y / 2 - (gapY * (source.inputNodePinIds.length - 1)) / 2;
	for (const [index, pinId] of source.inputNodePinIds.entries()) {
		nodePinOffsetById.set(pinId, { x: 0, y: startYIn + gapY * index });
	}

	const startYOut =
		size.y / 2 - (gapY * (source.outputNodePinIds.length - 1)) / 2;
	for (const [index, pinId] of source.outputNodePinIds.entries()) {
		nodePinOffsetById.set(pinId, { x: size.x, y: startYOut + gapY * index });
	}

	return { size, nodePinOffsetById };
}
