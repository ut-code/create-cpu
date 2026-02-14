import { type Vector2, vector2 } from "../../../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeGeometryCalculator,
	CCComponentEditorRendererNodeGeometrySource,
} from "../../types";

const width = 100;
const gapY = 20;
const paddingY = 15;

export const ccComponentRendererNodeDefaultGeometryCalculator: CCComponentEditorRendererNodeGeometryCalculator =
	(source: CCComponentEditorRendererNodeGeometrySource) => {
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

		const nodePinPositionById = new Map<CCNodePinId, Vector2>();
		for (const [index, nodePinId] of source.inputNodePinIds.entries()) {
			nodePinPositionById.set(nodePinId, {
				x: source.position.x - size.x / 2,
				y:
					source.position.y +
					gapY * (index - source.inputNodePinIds.length / 2 + 0.5),
			});
		}
		for (const [index, nodePinId] of source.outputNodePinIds.entries()) {
			nodePinPositionById.set(nodePinId, {
				x: source.position.x + size.x / 2,
				y:
					source.position.y +
					gapY * (index - source.outputNodePinIds.length / 2 + 0.5),
			});
		}

		return {
			rect: {
				position: vector2.sub(source.position, vector2.div(size, 2)),
				size,
			},
			nodePinPositionById,
		};
	};
