import { useState, type PointerEvent, JSX, type ReactNode } from "react";
import * as matrix from "transformation-matrix";
import { KDTree } from "mnemonist";
import nullthrows from "nullthrows";
import type { Point } from "../../../../common/types";
import type { CCNodePinId } from "../../../../store/nodePin";
import { CCComponentEditorRendererConnectionCore } from "./Connection";
import { useComponentEditorStore } from "../store";
import { useStore } from "../../../../store/react";
import { getCCComponentEditorRendererNodeGeometry as getNodeGeometry } from "./Node";

const NODE_PIN_POSITION_SENSITIVITY = 10;

export type CCComponentEditorRendererNodeProps = {
  nodePinId: CCNodePinId;
  position: Point;
};
export default function CCComponentEditorRendererNodePin({
  nodePinId,
  position,
}: CCComponentEditorRendererNodeProps) {
  const { store } = useStore();
  const inverseViewTransformation = useComponentEditorStore()((s) =>
    s.getInverseViewTransformation()
  );
  const [draggingState, setDraggingState] = useState<{
    cursorPosition: Point;
    nodePinPositionKDTree: KDTree<CCNodePinId>;
  } | null>(null);
  const onDrag = (e: PointerEvent) => {
    let nodePinPositionKDTree = draggingState?.nodePinPositionKDTree;
    if (!nodePinPositionKDTree) {
      const nodePin = nullthrows(store.nodePins.get(nodePinId));
      const node = nullthrows(store.nodes.get(nodePin.nodeId));
      const nodes = store.nodes.getManyByParentComponentId(
        node.parentComponentId
      );
      nodePinPositionKDTree = KDTree.from(
        nodes
          .filter((n) => n.id !== node.id)
          .flatMap((n) =>
            [...getNodeGeometry(store, n.id).nodePinPositionById].map(
              ([id, { x, y }]): [CCNodePinId, number[]] => [id, [x, y]]
            )
          ),
        2
      );
    }
    setDraggingState({
      cursorPosition: matrix.applyToPoint(inverseViewTransformation, {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      }),
      nodePinPositionKDTree,
    });
  };

  let draggingView: ReactNode = null;
  if (draggingState) {
    const nearestNodePinId =
      draggingState.nodePinPositionKDTree.nearestNeighbor([
        draggingState.cursorPosition.x,
        draggingState.cursorPosition.y,
      ]);
    const nearestNodePin = nullthrows(store.nodePins.get(nearestNodePinId));
    const nearestNodePinPosition = nullthrows(
      getNodeGeometry(store, nearestNodePin.nodeId).nodePinPositionById.get(
        nearestNodePinId
      )
    );
    const distance = Math.hypot(
      nearestNodePinPosition.x - position.x,
      nearestNodePinPosition.y - position.y
    );
    draggingView = (
      <CCComponentEditorRendererConnectionCore
        from={position}
        to={
          distance < NODE_PIN_POSITION_SENSITIVITY
            ? nearestNodePinPosition
            : position
        }
      />
    );
  }

  return (
    <>
      <circle
        cx={position.x}
        cy={position.y}
        r={5}
        fill="white"
        stroke="black"
        strokeWidth={2}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onDrag(e);
        }}
        onPointerMove={draggingState ? onDrag : undefined}
        onLostPointerCapture={() => {
          setDraggingState(null);
        }}
      />
      {draggingView}
    </>
  );
}
