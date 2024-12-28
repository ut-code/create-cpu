import nullthrows from "nullthrows";
import { useState } from "react";
import type { CCNodeId } from "../../../../store/node";
import { useNode } from "../../../../store/react/selectors";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";
import CCComponentEditorRendererNodePin from "./NodePin";
import getCCComponentEditorRendererNodeGeometry from "./Node.geometry";
import ensureStoreItem from "../../../../store/react/error";
import { blackColor, primaryColor, whiteColor } from "../../../../common/theme";
import { vector2 } from "../../../../common/vector2";

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
      vector2.zero
    );

    const handleDragStart = (e: React.PointerEvent) => {
      setDragStartPosition(vector2.fromDomEvent(e.nativeEvent));
      setPreviousNodePosition(node.position);
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleDragging = (e: React.PointerEvent) => {
      if (dragging) {
        store.nodes.update(nodeId, {
          position: vector2.add(
            previousNodePosition,
            vector2.mul(
              vector2.sub(
                vector2.fromDomEvent(e.nativeEvent),
                dragStartPosition
              ),
              componentEditorState.perspective.scale
            )
          ),
        });
      }
    };

    const handleDragEnd = (e: React.PointerEvent) => {
      setDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
      <>
        <text x={geometry.x} y={geometry.y - 5} textAnchor="bottom">
          {component.name}
        </text>
        <rect
          x={geometry.x}
          y={geometry.y}
          width={geometry.width}
          height={geometry.height}
          fill={whiteColor}
          stroke={
            componentEditorState.selectedNodeIds.has(nodeId)
              ? primaryColor
              : blackColor
          }
          strokeWidth={2}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragging}
          onPointerUp={handleDragEnd}
          onClick={() => {
            componentEditorState.selectNode([nodeId], true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            componentEditorState.selectNode([nodeId], true);
            componentEditorState.openContextMenu(e);
          }}
        />
        {store.nodePins.getManyByNodeId(nodeId).map((nodePin) => {
          const position = nullthrows(
            geometry.nodePinPositionById.get(nodePin.id)
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
  }
);
export default CCComponentEditorRendererNode;
