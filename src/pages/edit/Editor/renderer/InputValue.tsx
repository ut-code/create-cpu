import nullthrows from "nullthrows";
import { theme } from "../../../../common/theme";
import type { CCNodePinId } from "../../../../store/nodePin";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";
import {
	stringifySimulationValue,
	wrappingIncrementSimulationValue,
} from "../store/slices/core";
import getCCComponentEditorRendererNodeGeometry from "./Node.geometry";
export type CCComponentEditorRendererInputValueProps = {
	nodePinId: CCNodePinId;
};
export default function CCComponentEditorRendererInputValue({
	nodePinId,
}: CCComponentEditorRendererInputValueProps) {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();
	const nodePin = nullthrows(store.nodePins.get(nodePinId));
	const interfaceComponentPin = nullthrows(
		store.componentPins.getByImplementation(nodePinId),
	);
	const type = interfaceComponentPin.type;

	const nodePinValue =
		type === "input"
			? nullthrows(componentEditorState.getInputValue(interfaceComponentPin.id))
			: nullthrows(componentEditorState.getNodePinValue(nodePinId));
	const updateInputValue = () => {
		componentEditorState.setInputValue(
			interfaceComponentPin.id,
			wrappingIncrementSimulationValue(nodePinValue),
		);
	};

	const nodePinPosition = nullthrows(
		getCCComponentEditorRendererNodeGeometry(
			store,
			nodePin.nodeId,
		).nodePinPositionById.get(nodePinId),
	);
	const direction = type === "input" ? -1 : 1;

	return (
		<>
			<rect
				x={nodePinPosition.x - 15 + direction * (15 + 10)}
				y={nodePinPosition.y - 6}
				width={30}
				height={12}
				rx={6}
				ry={6}
				stroke={theme.palette.textPrimary}
				fill={theme.palette.white}
				strokeWidth={1}
				{...(type === "input"
					? {
							onPointerDown: updateInputValue,
							style: { cursor: "pointer" },
						}
					: {})}
			/>
			<text
				x={nodePinPosition.x + direction * (15 + 10)}
				y={nodePinPosition.y}
				fill={theme.palette.textPrimary}
				textAnchor="middle"
				dominantBaseline="middle"
				fontSize={10}
				dy={1}
				style={{ pointerEvents: "none" }}
			>
				{stringifySimulationValue(nodePinValue)}
			</text>
		</>
	);
}
