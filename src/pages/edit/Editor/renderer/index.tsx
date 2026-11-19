import { parseDataTransferAsComponent } from "../../../../common/serialization";
import { vector2 } from "../../../../common/vector2";
import { CCNodeStore } from "../../../../store/node";
import { useStore } from "../../../../store/react";
import {
	useConnectionIds,
	useNodeIds,
} from "../../../../store/react/selectors";
import { canPlaceComponent } from "../../placement";
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
			onWheel={(wheelEvent) => {
				// A popover opened from a node bubbles here through React, and the HTML
				// inside a node, such as the value of a Const node, may scroll by itself
				const { target, currentTarget } = wheelEvent;
				if (
					!(target instanceof Element) ||
					!currentTarget.contains(target) ||
					target.closest("foreignObject")
				)
					return;
				const scaleDelta = Math.exp(wheelEvent.deltaY / 256);
				const scaleCenter = componentEditorState.fromCanvasToStage(
					vector2.fromDomEvent(wheelEvent.nativeEvent),
				);
				componentEditorState.setPerspective({
					scale: componentEditorState.perspective.scale * scaleDelta,
					center: vector2.add(
						scaleCenter,
						vector2.mul(
							vector2.sub(componentEditorState.perspective.center, scaleCenter),
							scaleDelta,
						),
					),
				});
			}}
			onDragOver={(e) => {
				e.preventDefault();
			}}
			onDrop={(e) => {
				const droppedComponentId = parseDataTransferAsComponent(e.dataTransfer);
				if (
					!droppedComponentId ||
					componentEditorState.editorMode === "play" ||
					!canPlaceComponent(
						store,
						componentEditorState.componentId,
						droppedComponentId,
						componentEditorState.isOffered,
					)
				)
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
