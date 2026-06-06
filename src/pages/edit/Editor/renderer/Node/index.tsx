import { useState } from "react";
import { vector2 } from "../../../../../common/vector2";
import {
	type CCIntrinsicComponentType,
	ccIntrinsicComponentTypes,
} from "../../../../../store/intrinsics/types";
import type { CCNodeId } from "../../../../../store/node";
import { useStore } from "../../../../../store/react";
import ensureStoreItem from "../../../../../store/react/error";
import { useComponent, useNode } from "../../../../../store/react/selectors";
import { useComponentEditorStore } from "../../store";
import CCComponentEditorRendererNodePin from "../NodePin";
import { CCComponentEditorRendererNodeDefaultRenderer } from "./components/Default";
import { CCComponentEditorRendererNodeDisplayRenderer } from "./components/Display";
import {
	ccComponentEditorRendererLayoutToGeometry,
	getCCComponentEditorRendererNodeLayout,
} from "./geometry";
import type {
	CCComponentEditorRendererNodeRendererNodeState,
	CCComponentEditorRendererNodeRendererProps,
} from "./types";

const specialRenderers: Partial<
	Record<
		CCIntrinsicComponentType,
		React.ComponentType<CCComponentEditorRendererNodeRendererProps>
	>
> = {
	[ccIntrinsicComponentTypes.DISPLAY]:
		CCComponentEditorRendererNodeDisplayRenderer,
};

export type CCComponentEditorRendererNodeProps = {
	nodeId: CCNodeId;
};
const CCComponentEditorRendererNode = ensureStoreItem(
	(props, store) => store.nodes.get(props.nodeId),
	({ nodeId }: CCComponentEditorRendererNodeProps) => {
		const { store } = useStore();
		const node = useNode(nodeId);
		const component = useComponent(node.componentId);
		const componentEditorState = useComponentEditorStore()();
		const [dragging, setDragging] = useState(false);
		const [dragStartPosition, setDragStartPosition] = useState(vector2.zero);
		const [previousNodePosition, setPreviousNodePosition] = useState(
			vector2.zero,
		);

		const layout = getCCComponentEditorRendererNodeLayout(store, nodeId);
		const geometry = ccComponentEditorRendererLayoutToGeometry(
			layout,
			node.position,
		);
		const Renderer =
			(component.intrinsicType && specialRenderers[component.intrinsicType]) ||
			CCComponentEditorRendererNodeDefaultRenderer;
		const nodeState: CCComponentEditorRendererNodeRendererNodeState = {
			isSelected: componentEditorState.selectedNodeIds.has(nodeId),
		};

		const handlePointerDown = (e: React.PointerEvent) => {
			if (e.button === 0) {
				componentEditorState.selectNode([nodeId], !e.shiftKey);
			}
			setDragStartPosition(vector2.fromDomEvent(e.nativeEvent));
			setPreviousNodePosition(node.position);
			setDragging(true);
			e.currentTarget.setPointerCapture(e.pointerId);
		};

		const handlePointerMove = (e: React.PointerEvent) => {
			if (dragging) {
				store.nodes.update(nodeId, {
					position: vector2.add(
						previousNodePosition,
						vector2.mul(
							vector2.sub(
								vector2.fromDomEvent(e.nativeEvent),
								dragStartPosition,
							),
							componentEditorState.perspective.scale,
						),
					),
				});
			}
		};

		const handlePointerUp = (e: React.PointerEvent) => {
			setDragging(false);
			e.currentTarget.releasePointerCapture(e.pointerId);
		};

		return (
			<>
				{/** biome-ignore lint/a11y/noSvgWithoutTitle: SVG */}
				<svg
					x={geometry.rect.position.x}
					y={geometry.rect.position.y}
					width={geometry.rect.size.x}
					height={geometry.rect.size.y}
					overflow="visible"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onContextMenu={(e) => {
						e.preventDefault();
						const selectedNodeIds = componentEditorState.selectedNodeIds;
						if (!selectedNodeIds.has(nodeId)) {
							componentEditorState.selectNode([nodeId], true);
						}
						componentEditorState.openContextMenu(e);
					}}
				>
					<Renderer
						node={node}
						nodeState={nodeState}
						component={component}
						layout={layout}
						geometry={geometry}
					/>
				</svg>
				{store.nodePins.getManyByNodeId(nodeId).map((nodePin) => (
					<CCComponentEditorRendererNodePin
						key={nodePin.id}
						nodePinId={nodePin.id}
					/>
				))}
			</>
		);
	},
);
export default CCComponentEditorRendererNode;
