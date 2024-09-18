import nullthrows from "nullthrows";
import { useState } from "react";
import { useComponentEditorStore } from "../store";
import { useStore } from "../../../../store/react";
import type { Point } from "../../../../common/types";
import { getCCComponentEditorRendererNodeGeometry } from "./Node";
import { CCComponentEditorRendererConnectionCore } from "./Connection";

export default function CCComponentEditorRendererTemporaryConnectionManager() {
  const { store } = useStore();
  const componentEditorState = useComponentEditorStore()();
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  if (!componentEditorState.isCreatingConnectionFrom) return null;

  const startNodePinId = componentEditorState.isCreatingConnectionFrom;
  const startNodePin = nullthrows(store.nodePins.get(startNodePinId));
  const startNodeGeometry = getCCComponentEditorRendererNodeGeometry(
    store,
    startNodePin.nodeId
  );
  const startNodePinPosition = nullthrows(
    startNodeGeometry.nodePinPositionById.get(startNodePin.id)
  );

  console.log(crypto.randomUUID() + crypto.randomUUID());

  return (
    <CCComponentEditorRendererConnectionCore
      from={startNodePinPosition}
      to={cursorPosition ?? startNodePinPosition}
    />
  );
}
