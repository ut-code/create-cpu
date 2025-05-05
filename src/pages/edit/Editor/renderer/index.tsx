import { parseDataTransferAsComponent } from "../../../../common/serialization";
import { vector2 } from "../../../../common/vector2";
import { CCNodeStore } from "../../../../store/node";
import { useStore } from "../../../../store/react";
import {
	useConnectionIds,
	useNodeIds,
} from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";
import CCComponentEditorRendererBackground from "./Background";
import CCComponentEditorRendererConnection from "./Connection";
import CCComponentEditorRendererNode from "./Node";

export default function CCComponentEditorRenderer() {
	const componentEditorState = useComponentEditorStore()();
	const { store } = useStore();
	const viewBox = componentEditorState.getViewBox();
	const nodeIds = useNodeIds(componentEditorState.componentId);
	const connectionIds = useConnectionIds(componentEditorState.componentId);

	return (
		// biome-ignore lint/a11y/noSvgWithoutTitle: This svg is not a graphic
		<svg
			ref={componentEditorState.registerRendererElement}
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				userSelect: "none",
			}}
			viewBox={[viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(" ")}
			onDragOver={(e) => {
				e.preventDefault();
			}}
			onDrop={(e) => {
				const droppedComponentId = parseDataTransferAsComponent(e.dataTransfer);
				if (!droppedComponentId || componentEditorState.editorMode === "play")
					return;
				store.nodes.register(
					CCNodeStore.create({
						componentId: droppedComponentId,
						parentComponentId: componentEditorState.componentId,
						position: componentEditorState.fromCanvasToStage(
							vector2.fromDomEvent(e.nativeEvent),
						),
					}),
				);
			}}
		>
			<CCComponentEditorRendererBackground />
			{connectionIds.map((connectionId) => (
				<CCComponentEditorRendererConnection
					key={connectionId}
					connectionId={connectionId}
				/>
			))}
			{nodeIds.map((nodeId) => (
				<CCComponentEditorRendererNode key={nodeId} nodeId={nodeId} />
			))}
		</svg>
	);
}
