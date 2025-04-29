import nullthrows from "nullthrows";
import { useState } from "react";
import { theme } from "../../../../common/theme";
import { vector2 } from "../../../../common/vector2";
import type { CCNodeId } from "../../../../store/node";
import { useStore } from "../../../../store/react";
import ensureStoreItem from "../../../../store/react/error";
import { useNode } from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";
import getCCComponentEditorRendererNodeGeometry from "./Node.geometry";
import CCComponentEditorRendererNodePin from "./NodePin";

export type CCComponentEditorRendererNodeProps = {
	nodeId: CCNodeId;
};
const CCComponentEditorRendererNode = ensureStoreItem(
	(props, store) => store.nodes.get(props.nodeId),
	({ nodeId }: CCComponentEditorRendererNodeProps) => {
		const { store } = useStore();
		const node = useNode(nodeId);
		const component = nullthrows(store.components.get(node.componentId));
		const geometry = getCCComponentEditorRendererNodeGeometry(store, nodeId);
		const componentEditorState = useComponentEditorStore()();
		const [dragging, setDragging] = useState(false);
		const [dragStartPosition, setDragStartPosition] = useState(vector2.zero);
		const [previousNodePosition, setPreviousNodePosition] = useState(
			vector2.zero,
		);

		const handlePointerDown = (e: React.PointerEvent) => {
			componentEditorState.selectNode([nodeId], true);
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
				<g
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onContextMenu={(e) => {
						e.preventDefault();
						componentEditorState.selectNode([nodeId], true);
						componentEditorState.openContextMenu(e);
					}}
				>
					<text
						fill={theme.palette.textPrimary}
						x={geometry.x}
						y={geometry.y - 5}
						textAnchor="bottom"
						fontSize={12}
					>
						{component.name}
					</text>
					<rect
						x={geometry.x}
						y={geometry.y}
						width={geometry.width}
						height={geometry.height}
						fill={theme.palette.white}
						stroke={
							componentEditorState.selectedNodeIds.has(nodeId)
								? theme.palette.primary
								: theme.palette.textPrimary
						}
						strokeWidth={2}
					/>
				</g>
				{store.nodePins.getManyByNodeId(nodeId).map((nodePin) => {
					const position = nullthrows(
						geometry.nodePinPositionById.get(nodePin.id),
					);
					return (
						<CCComponentEditorRendererNodePin
							key={nodePin.id}
							nodePinId={nodePin.id}
							position={position}
						/>
					);
				})}
			</>
		);
	},
);
export default CCComponentEditorRendererNode;
