import nullthrows from "nullthrows";
import { theme } from "../../../../../../../common/theme";
import { useStore } from "../../../../../../../store/react";
import { wrappingIncrementSimulationValue } from "../../../../../../../store/simulation";
import { useComponentEditorStore } from "../../../../store";
import { stringifySimulationValue } from "../../../../store/slices/core";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { CCComponentEditorRendererNodeDefaultRenderer } from "../Default";
import { ccComponentEditorRendererNodeInterfaceLayoutConstants as constants } from "./geometry";

export function CCComponentEditorRendererNodeInterfaceRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();
	const editorState = useComponentEditorStore()();

	const nodePin = nullthrows(
		store.nodePins.getManyByNodeId(props.node.id)[0],
		`Interface node ${props.node.id} is missing its pin`,
	);
	const componentPin = nullthrows(
		store.componentPins.getByImplementation(nodePin.id),
	);

	const { label, onClick } =
		editorState.editorMode === "edit"
			? { label: componentPin.name, onClick: null }
			: componentPin.type === "input"
				? (() => {
						const inputValueKey = {
							componentPinId: componentPin.id,
							timeStep: editorState.timeStep,
						};
						const value = nullthrows(editorState.getInputValue(inputValueKey));
						return {
							label: stringifySimulationValue(value),
							onClick: () =>
								editorState.setInputValue(
									inputValueKey,
									wrappingIncrementSimulationValue(value),
								),
						};
					})()
				: {
						label: stringifySimulationValue(
							nullthrows(editorState.getNodePinValue(nodePin.id)),
						),
						onClick: null,
					};

	const { width, height, labelWidth, labelHeight } = constants;

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer {...props} />
			<rect
				x={(width - labelWidth) / 2}
				y={(height - labelHeight) / 2}
				width={labelWidth}
				height={labelHeight}
				rx={labelHeight / 2}
				ry={labelHeight / 2}
				stroke={theme.palette.textPrimary}
				fill={theme.palette.white}
				strokeWidth={1}
				{...(onClick
					? {
							onPointerDown: (e: React.PointerEvent) => {
								// Prevent the node from being selected or dragged
								e.stopPropagation();
								onClick();
							},
							style: { cursor: "pointer" },
						}
					: {})}
			/>
			<text
				x={width / 2}
				y={height / 2}
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
