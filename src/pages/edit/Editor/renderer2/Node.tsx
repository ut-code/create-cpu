import nullthrows from "nullthrows";
import { useState } from "react";
import type CCStore from "../../../../store";
import type { CCNodeId } from "../../../../store/node";
import { useNode } from "../../../../store/react/selectors";
import type { CCNodePinId } from "../../../../store/nodePin";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";
import CCComponentEditorRendererNodePin from "./NodePin";

export function getCCComponentEditorRendererNodeGeometry(
  store: CCStore,
  nodeId: CCNodeId
) {
  const width = 100;
  const gapY = 20;
  const paddingY = 20;

  const node = nullthrows(store.nodes.get(nodeId));
  const nodePins = store.nodePins.getManyByNodeId(nodeId);

  const x = node.position.x - width / 2;

  let inputPinCount = 0;
  let outputPinCount = 0;
  const nodePinPositionById = new Map<CCNodePinId, { x: number; y: number }>();
  for (const nodePin of nodePins) {
    const position = { x: 0, y: 0 };
    const componentPin = nullthrows(
      store.componentPins.get(nodePin.componentPinId)
    );
    if (componentPin.type === "input") {
      position.x = node.position.x - width / 2;
      position.y = node.position.y + inputPinCount * gapY;
      inputPinCount += 1;
    } else {
      position.x = node.position.x + width / 2;
      position.y = node.position.y + outputPinCount * gapY;
      outputPinCount += 1;
    }
    nodePinPositionById.set(nodePin.id, position);
  }

  const height =
    (Math.max(inputPinCount, outputPinCount) - 1) * gapY + paddingY * 2;
  const y = node.position.y - height / 2;

  for (const nodePin of nodePins) {
    const componentPin = nullthrows(
      store.componentPins.get(nodePin.componentPinId)
    );
    const position = nullthrows(nodePinPositionById.get(nodePin.id));
    if (componentPin.type === "input") {
      position.y -= ((inputPinCount - 1) * gapY) / 2;
    } else {
      position.y -= ((outputPinCount - 1) * gapY) / 2;
    }
  }

  return {
    x,
    y,
    width,
    height,
    nodePinPositionById,
  };
}

// type Point = {
//   x: number;
//   y: number;
// };

export type CCComponentEditorRendererNodeProps = {
  nodeId: CCNodeId;
};
export default function CCComponentEditorRendererNode({
  nodeId,
}: CCComponentEditorRendererNodeProps) {
  const { store } = useStore();
  const setIsCreatingConnectionFrom = useComponentEditorStore()(
    (s) => s.setIsCreatingConnectionFrom
  );
  const node = useNode(nodeId);
  const component = nullthrows(store.components.get(node.componentId));
  const geometry = getCCComponentEditorRendererNodeGeometry(store, nodeId);
  const [dragging, setDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [previousNodePosition, setPreviousNodePosition] = useState({
    x: 0,
    y: 0,
  });

  // const handleClick = (e: React.MouseEvent) => {
  //   setDragStartPosition({
  //     x: e.clientX,
  //     y: e.clientY,
  //   });
  //   setPreviousNodePosition({
  //     x: node.position.x,
  //     y: node.position.y,
  //   });
  //   setSelected(true);
  // };

  const handleDragStart = (e: React.MouseEvent) => {
    setDragStartPosition({
      x: e.clientX,
      y: e.clientY,
    });
    setPreviousNodePosition({
      x: node.position.x,
      y: node.position.y,
    });
    setDragging(true);
  };

  const handleDragging = (e: React.MouseEvent) => {
    if (dragging) {
      store.nodes.update(nodeId, {
        position: {
          x: previousNodePosition.x + e.clientX - dragStartPosition.x,
          y: previousNodePosition.y + e.clientY - dragStartPosition.y,
        },
        variablePins: node.variablePins,
      });
    }
  };

  const handleDragEnd = () => {
    setDragging(false);
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
        fill="white"
        stroke="black"
        strokeWidth={2}
        onDragStart={handleDragStart}
        // onClick={handleClick}
        onDrag={handleDragging}
        onDragEnd={handleDragEnd}
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
