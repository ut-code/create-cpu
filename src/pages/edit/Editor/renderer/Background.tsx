import { useComponentEditorStore } from "../store";
import { vector2 } from "../../../../common/vector2";

export default function CCComponentEditorRendererBackground() {
  const componentEditorState = useComponentEditorStore()();
  const viewBox = componentEditorState.getViewBox();

  return (
    <rect
      {...viewBox}
      onClick={() => {
        componentEditorState.selectNode([], true);
      }}
      onPointerDown={(pointerDownEvent) => {
        const { currentTarget } = pointerDownEvent;
        const startPerspective = componentEditorState.perspective;
        const startPoint = vector2.fromDomEvent(pointerDownEvent.nativeEvent);
        const onPointerMove = (pointerMoveEvent: PointerEvent) => {
          const endPoint = vector2.fromDomEvent(pointerMoveEvent);
          componentEditorState.setPerspective({
            ...startPerspective,
            center: vector2.sub(
              startPerspective.center,
              vector2.mul(
                vector2.sub(endPoint, startPoint),
                startPerspective.scale
              )
            ),
          });
        };
        currentTarget.addEventListener("pointermove", onPointerMove);
        const onPointerUp = () => {
          currentTarget.removeEventListener("pointermove", onPointerMove);
          currentTarget.removeEventListener("pointerup", onPointerUp);
        };
        currentTarget.addEventListener("pointerup", onPointerUp);
      }}
      onWheel={(wheelEvent) => {
        const scaleDelta = Math.exp(wheelEvent.deltaY / 256);
        const scaleCenter = componentEditorState.fromCanvasToStage(
          vector2.fromDomEvent(wheelEvent.nativeEvent)
        );
        componentEditorState.setPerspective({
          scale: componentEditorState.perspective.scale * scaleDelta,
          center: vector2.add(
            scaleCenter,
            vector2.mul(
              vector2.sub(componentEditorState.perspective.center, scaleCenter),
              scaleDelta
            )
          ),
        });
      }}
      fill="transparent"
    />
  );
}
