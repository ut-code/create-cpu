import { type Vector2, vector2 } from "../../../../../../../common/vector2";
import type { CCNodePinId } from "../../../../../../../store/nodePin";
import type {
	CCComponentEditorRendererNodeGeometryCalculator,
	CCComponentEditorRendererNodeGeometrySource,
} from "../../types";

const width = 320;
const height = 200;

export const ccComponentRendererNodeDisplayGeometryCalculator: CCComponentEditorRendererNodeGeometryCalculator =
	(source: CCComponentEditorRendererNodeGeometrySource) => {
		const size: Vector2 = {
			x: width,
			y: height,
		};

		return {
			rect: {
				position: vector2.sub(source.position, vector2.div(size, 2)),
				size,
			},
			nodePinPositionById: new Map<CCNodePinId, Vector2>(
				source.inputNodePinIds.map(
					(id) =>
						[
							id,
							vector2.create(source.position.x - size.x / 2, source.position.y),
						] as const,
				),
			),
		};
	};
