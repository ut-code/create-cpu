import nullthrows from "nullthrows";
import { type Vector2, vector2 } from "../../../../../common/vector2";
import type CCStore from "../../../../../store";
import {
	type CCIntrinsicComponentType,
	ccIntrinsicComponentTypes,
} from "../../../../../store/intrinsics/types";
import type { CCNodeId } from "../../../../../store/node";
import { ccComponentRendererNodeConstLayoutCalculator } from "./components/Const/geometry";
import { ccComponentRendererNodeDefaultLayoutCalculator } from "./components/Default/geometry";
import { ccComponentRendererNodeDisplayLayoutCalculator } from "./components/Display/geometry";
import type {
	CCComponentEditorRendererNodeGeometry,
	CCComponentEditorRendererNodeLayout,
	CCComponentEditorRendererNodeLayoutSource,
} from "./types";

const specialLayoutCalculators: {
	[key in CCIntrinsicComponentType]?: (
		source: CCComponentEditorRendererNodeLayoutSource,
	) => CCComponentEditorRendererNodeLayout;
} = {
	[ccIntrinsicComponentTypes.DISPLAY]:
		ccComponentRendererNodeDisplayLayoutCalculator,
	[ccIntrinsicComponentTypes.CONST]:
		ccComponentRendererNodeConstLayoutCalculator,
};

export function getCCComponentEditorRendererNodeLayout(
	store: CCStore,
	nodeId: CCNodeId,
): CCComponentEditorRendererNodeLayout {
	const node = nullthrows(store.nodes.get(nodeId));
	const component = nullthrows(store.components.get(node.componentId));
	const nodePins = store.nodePins.getManyByNodeId(nodeId);

	const layoutCalculator =
		(component.intrinsicType &&
			specialLayoutCalculators[component.intrinsicType]) ??
		ccComponentRendererNodeDefaultLayoutCalculator;

	return layoutCalculator({
		config: node.config,
		inputNodePinIds: nodePins
			.filter((np) => {
				const cp = nullthrows(store.componentPins.get(np.componentPinId));
				return cp.type === "input";
			})
			.map((np) => np.id),
		outputNodePinIds: nodePins
			.filter((np) => {
				const cp = nullthrows(store.componentPins.get(np.componentPinId));
				return cp.type === "output";
			})
			.map((np) => np.id),
	});
}

export function ccComponentEditorRendererLayoutToGeometry(
	layout: CCComponentEditorRendererNodeLayout,
	nodePosition: Vector2,
): CCComponentEditorRendererNodeGeometry {
	const position = vector2.sub(nodePosition, vector2.div(layout.size, 2));
	return {
		rect: { position: position, size: layout.size },
		nodePinPositionById: new Map(
			layout.nodePinOffsetById
				.entries()
				.map(([nodePinId, offset]) => [
					nodePinId,
					vector2.add(position, offset),
				]),
		),
	};
}

export function getCCComponentEditorRendererNodeGeometry(
	store: CCStore,
	nodeId: CCNodeId,
): CCComponentEditorRendererNodeGeometry {
	const node = nullthrows(store.nodes.get(nodeId));
	const layout = getCCComponentEditorRendererNodeLayout(store, nodeId);
	return ccComponentEditorRendererLayoutToGeometry(layout, node.position);
}
