import nullthrows from "nullthrows";
import { theme } from "../../../../../common/theme";
import type { CCNodePinId } from "../../../../../store/nodePin";
import { useStore } from "../../../../../store/react";
import { wrappingIncrementSimulationValue } from "../../../../../store/simulation";
import { useComponentEditorStore } from "../../store";
import { stringifySimulationValue } from "../../store/slices/core";
import { getCCComponentEditorRendererNodeGeometry } from "./../Node/geometry";
export type CCComponentEditorRendererComponentPinProps = {
	nodePinId: CCNodePinId;
};
export default function CCComponentEditorRendererComponentPin({
	nodePinId,
}: CCComponentEditorRendererComponentPinProps) {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();
	const nodePin = nullthrows(store.nodePins.get(nodePinId));
	const interfaceComponentPin = nullthrows(
		store.componentPins.getByImplementation(nodePinId),
	);
	const type = interfaceComponentPin.type;

	const { label, onClick } =
		componentEditorState.editorMode === "edit"
			? {
					label: interfaceComponentPin.name,
					onClick: null,
				}
			: {
					label: stringifySimulationValue(
						type === "input"
							? nullthrows(
									componentEditorState.getInputValue([
										interfaceComponentPin.id,
										componentEditorState.timeStep,
									]),
								)
							: nullthrows(componentEditorState.getNodePinValue(nodePinId)),
					),
					onClick:
						type === "input"
							? () => {
									const nodePinValue = nullthrows(
										componentEditorState.getInputValue([
											interfaceComponentPin.id,
											componentEditorState.timeStep,
										]),
									);
									componentEditorState.setInputValue(
										[interfaceComponentPin.id, componentEditorState.timeStep],
										wrappingIncrementSimulationValue(nodePinValue),
									);
								}
							: null,
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
				{...(onClick
					? {
							onPointerDown: onClick,
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
				{label}
			</text>
		</>
	);
}
