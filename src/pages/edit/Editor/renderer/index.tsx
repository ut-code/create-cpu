import { parseDataTransferAsComponent } from "../../../../common/serialization";
import {
  useConnectionIds,
  useNodeIds,
} from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";
import CCComponentEditorRendererBackground from "./Background";
import CCComponentEditorRendererConnection from "./Connection";
import CCComponentEditorRendererNode from "./Node";
import { useStore } from "../../../../store/react";
import { CCNodeStore } from "../../../../store/node";
import { vector2 } from "../../../../common/vector2";

export default function CCComponentEditorRenderer() {
  const componentEditorState = useComponentEditorStore()();
  const { store } = useStore();
  const viewBox = componentEditorState.getViewBox();
  const nodeIds = useNodeIds(componentEditorState.componentId);
  const connectionIds = useConnectionIds(componentEditorState.componentId);

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
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        const droppedComponentId = parseDataTransferAsComponent(e.dataTransfer);
        if (!droppedComponentId || componentEditorState.editorMode === "play")
          return;
        store.nodes.register(
          CCNodeStore.create({
            componentId: droppedComponentId,
            parentComponentId: componentEditorState.componentId,
            position: componentEditorState.fromCanvasToStage(
              vector2.fromDomEvent(e.nativeEvent)
            ),
          })
        );
      }}
    >
      <CCComponentEditorRendererBackground />
      {nodeIds.map((nodeId) => (
        <CCComponentEditorRendererNode key={nodeId} nodeId={nodeId} />
      ))}
      {connectionIds.map((connectionId) => (
        <CCComponentEditorRendererConnection
          key={connectionId}
          connectionId={connectionId}
        />
      ))}
    </svg>
  );
}
