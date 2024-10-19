import nullthrows from "nullthrows";
import type { CCConnectionId } from "../../../../store/connection";
import { useStore } from "../../../../store/react";
import { useNode } from "../../../../store/react/selectors";
import { getCCComponentEditorRendererNodeGeometry } from "./Node";

export type CCComponentEditorRendererConnectionCoreProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};
export function CCComponentEditorRendererConnectionCore({
  from,
  to,
}: CCComponentEditorRendererConnectionCoreProps) {
  return (
    <path
      d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
      stroke="black"
      strokeWidth="2"
      fill="none"
    />
  );
}

export type CCComponentEditorRendererConnectionProps = {
  connectionId: CCConnectionId;
};
export default function CCComponentEditorRendererConnection({
  connectionId,
}: CCComponentEditorRendererConnectionProps) {
  const { store } = useStore();
  const connection = nullthrows(store.connections.get(connectionId));
  const fromNodePin = nullthrows(store.nodePins.get(connection.from));
  const toNodePin = nullthrows(store.nodePins.get(connection.to));
  const fromNode = useNode(fromNodePin.nodeId);
  const toNode = useNode(toNodePin.nodeId);
  const fromNodeGeometry = getCCComponentEditorRendererNodeGeometry(
    store,
    fromNode.id
  );
  const toNodeGeometry = getCCComponentEditorRendererNodeGeometry(
    store,
    toNode.id
  );
  const fromNodePinPosition = nullthrows(
    fromNodeGeometry.nodePinPositionById.get(fromNodePin.id)
  );
  const toNodePinPosition = nullthrows(
    toNodeGeometry.nodePinPositionById.get(toNodePin.id)
  );

  return (
    <CCComponentEditorRendererConnectionCore
      from={fromNodePinPosition}
      to={toNodePinPosition}
    />
  );
}
