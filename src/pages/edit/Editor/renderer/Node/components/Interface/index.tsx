import nullthrows from "nullthrows";
import { ccIntrinsicComponentTypes } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { wrappingIncrementSimulationValue } from "../../../../../../../store/simulation";
import { useComponentEditorStore } from "../../../../store";
import { stringifySimulationValue } from "../../../../store/slices/core";
import styles from "../../style.module.css";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
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

	const { bodyWidth, arrowDepth, width, height } = constants;
	const isPinOnRight =
		props.component.intrinsicType === ccIntrinsicComponentTypes.INPUT;
	const bodyX = isPinOnRight ? 0 : arrowDepth;
	const points = isPinOnRight
		? `0,0  ${bodyWidth},0  ${width},${height / 2}  ${bodyWidth},${height}  0,${height}`
		: `${arrowDepth},0  ${width},0  ${width},${height}  ${arrowDepth},${height}  0,${height / 2}`;

	return (
		<>
			<polygon
				points={points}
				strokeLinejoin="round"
				className={styles.shape}
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
				x={bodyX + bodyWidth / 2}
				y={height / 2}
				className={styles.text}
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
