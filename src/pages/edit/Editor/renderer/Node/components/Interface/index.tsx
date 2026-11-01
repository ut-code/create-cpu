import nullthrows from "nullthrows";
import { ccIntrinsicComponentTypes } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { useComponentPin } from "../../../../../../../store/react/selectors";
import { wrappingIncrementSimulationValue } from "../../../../../../../store/simulation";
import { useComponentEditorStore } from "../../../../store";
import { stringifySimulationValue } from "../../../../store/slices/core";
import styles from "../../style.module.css";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { ccComponentEditorRendererNodeInterfaceLayoutConstants as constants } from "./geometry";
import { CCComponentEditorRendererNodeInterfaceRendererRenameButton } from "./RenameButton";
import interfaceStyles from "./style.module.css";

export function CCComponentEditorRendererNodeInterfaceRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();
	const editorState = useComponentEditorStore()();

	const nodePin = nullthrows(
		store.nodePins.getManyByNodeId(props.node.id)[0],
		`Interface node ${props.node.id} is missing its pin`,
	);
	const componentPin = useComponentPin(
		nullthrows(store.componentPins.getByImplementation(nodePin.id)).id,
	);
	const isEditMode = editorState.editorMode === "edit";

	const { label, onClick } = isEditMode
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
			<foreignObject
				x={bodyX}
				y={0}
				width={bodyWidth}
				height={height}
				className={interfaceStyles.labelContainer}
			>
				<div className={interfaceStyles.label}>
					{label}
					{isEditMode && (
						<CCComponentEditorRendererNodeInterfaceRendererRenameButton
							name={componentPin.name}
							onNameChange={(name) =>
								store.componentPins.update(componentPin.id, { name })
							}
						/>
					)}
				</div>
			</foreignObject>
		</>
	);
}
