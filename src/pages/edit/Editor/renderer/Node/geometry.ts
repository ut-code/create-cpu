import nullthrows from "nullthrows";
import type CCStore from "../../../../../store";
import {
	type CCIntrinsicComponentType,
	ccIntrinsicComponentTypes,
} from "../../../../../store/intrinsics/types";
import type { CCNodeId } from "../../../../../store/node";
import { ccComponentRendererNodeDefaultGeometryCalculator } from "./components/Default/geometry";
import { ccComponentRendererNodeDisplayGeometryCalculator } from "./components/Display/geometry";
import type {
	CCComponentEditorRendererNodeGeometryCalculator,
	CCComponentEditorRendererNodeGeometrySource,
} from "./types";

const specialGeometryCalculators: Partial<
	Record<
		CCIntrinsicComponentType,
		CCComponentEditorRendererNodeGeometryCalculator
	>
> = {
	[ccIntrinsicComponentTypes.DISPLAY]:
		ccComponentRendererNodeDisplayGeometryCalculator,
};

export default function getCCComponentEditorRendererNodeGeometry(
	store: CCStore,
	nodeId: CCNodeId,
) {
	const node = nullthrows(store.nodes.get(nodeId));
	const component = nullthrows(store.components.get(node.componentId));
	const nodePins = store.nodePins.getManyByNodeId(nodeId);

	const source: CCComponentEditorRendererNodeGeometrySource = {
		position: node.position,
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
	};

	const calculator =
		(component.intrinsicType &&
			specialGeometryCalculators[component.intrinsicType]) ??
		ccComponentRendererNodeDefaultGeometryCalculator;
	return calculator(source);
}
