import { useNodeIds } from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";
import CCComponentEditorRendererBackground from "./Background";
import CCComponentEditorRendererNode from "./Node";

export default function CCComponentEditorRenderer() {
  const componentEditorState = useComponentEditorStore()();
  const viewBox = componentEditorState.getViewBox();
  const nodesIds = useNodeIds(componentEditorState.componentId);

  return (
    <svg
      ref={componentEditorState.registerRendererElement}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      viewBox={[viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(" ")}
    >
      <CCComponentEditorRendererBackground />
      {nodesIds.map((nodeId) => (
        <CCComponentEditorRendererNode key={nodeId} nodeId={nodeId} />
      ))}
    </svg>
  );
}
