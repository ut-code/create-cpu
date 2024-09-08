import type { CCNodeId } from "../../../../store/node";
import { useNode } from "../../../../store/react/selectors";

export type CCComponentEditorRendererNodeProps = {
  nodeId: CCNodeId;
};

export default function CCComponentEditorRendererNode({
  nodeId,
}: CCComponentEditorRendererNodeProps) {
  const node = useNode(nodeId);

  return (
    <rect
      x={node.position.x}
      y={node.position.y}
      width="100"
      height="100"
      fill="blue"
    />
  );
}
