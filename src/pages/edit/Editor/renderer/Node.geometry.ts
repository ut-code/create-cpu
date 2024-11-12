import nullthrows from "nullthrows";
import type CCStore from "../../../../store";
import type { CCNodeId } from "../../../../store/node";
import type { CCNodePinId } from "../../../../store/nodePin";

export default function getCCComponentEditorRendererNodeGeometry(
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
