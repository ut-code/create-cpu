import nullthrows from "nullthrows";
import { ccIntrinsicComponentTypes } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { useComponentPin } from "../../../../../../../store/react/selectors";
import type { SimulationValue } from "../../../../../../../store/simulation";
import { useComponentEditorStore } from "../../../../store";
import nodeStyles from "../../style.module.css";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { ccComponentEditorRendererNodeInterfaceLayoutConstants as constants } from "./geometry";
import { CCComponentEditorRendererNodeInterfaceRendererRenameButton } from "./RenameButton";
import styles from "./style.module.css";
import { CCComponentEditorRendererNodeInterfaceRendererValue } from "./Value";

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

	const simulation = isEditMode
		? null
		: componentPin.type === "input"
			? (() => {
					const inputValueKey = {
						componentPinId: componentPin.id,
						timeStep: editorState.timeStep,
					};
					return {
						value: nullthrows(editorState.getInputValue(inputValueKey)),
						onChange: (value: SimulationValue) =>
							editorState.setInputValue(inputValueKey, value),
					};
				})()
			: {
					value: nullthrows(editorState.getNodePinValue(nodePin.id)),
					onChange: null,
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
				className={nodeStyles.shape}
			/>
			<foreignObject
				x={bodyX}
				y={0}
				width={bodyWidth}
				height={height}
				className={styles.contentContainer}
			>
				{simulation === null ? (
					<div className={styles.edit}>
						<span className={styles.name}>{componentPin.name}</span>
						<CCComponentEditorRendererNodeInterfaceRendererRenameButton
							name={componentPin.name}
							onNameChange={(name) =>
								store.componentPins.update(componentPin.id, { name })
							}
						/>
					</div>
				) : (
					<div className={styles.simulation}>
						<span className={styles.name}>{componentPin.name}</span>
						<CCComponentEditorRendererNodeInterfaceRendererValue
							value={simulation.value}
							onChange={simulation.onChange}
						/>
					</div>
				)}
			</foreignObject>
		</>
	);
}
