import * as matrix from "transformation-matrix";
import { Color } from "pixi.js";
import { useComponentEditorStore } from "../store";
import { whiteColor } from "../../../../common/theme";

export default function CCComponentEditorRendererBackground() {
  const componentEditorState = useComponentEditorStore()();
  const viewBox = componentEditorState.getViewBox();

  return (
    <rect
      {...viewBox}
      onPointerDown={(pointerDownEvent) => {
        const { currentTarget } = pointerDownEvent;
        const startUserTransformation =
          componentEditorState.userPerspectiveTransformation;
        const startInverseViewTransformation =
          componentEditorState.getInverseViewTransformation();
        const startPoint = matrix.applyToPoint(startInverseViewTransformation, {
          x: pointerDownEvent.nativeEvent.offsetX,
          y: pointerDownEvent.nativeEvent.offsetY,
        });
        const onPointerMove = (pointerMoveEvent: PointerEvent) => {
          const endPoint = matrix.applyToPoint(startInverseViewTransformation, {
            x: pointerMoveEvent.offsetX,
            y: pointerMoveEvent.offsetY,
          });
          componentEditorState.setUserPerspectiveTransformation(
            matrix.compose(
              startUserTransformation,
              matrix.translate(
                endPoint.x - startPoint.x,
                endPoint.y - startPoint.y
              )
            )
          );
        };
        currentTarget.addEventListener("pointermove", onPointerMove);
        const onPointerUp = () => {
          currentTarget.removeEventListener("pointermove", onPointerMove);
          currentTarget.removeEventListener("pointerup", onPointerUp);
        };
        currentTarget.addEventListener("pointerup", onPointerUp);
      }}
      onWheel={(wheelEvent) => {
        const scale = Math.exp(-wheelEvent.deltaY / 256);
        const center = matrix.applyToPoint(
          componentEditorState.getInverseViewTransformation(),
          {
            x: wheelEvent.nativeEvent.offsetX,
            y: wheelEvent.nativeEvent.offsetY,
          }
        );
        componentEditorState.setUserPerspectiveTransformation(
          matrix.compose(
            componentEditorState.userPerspectiveTransformation,
            matrix.scale(scale, scale, center.x, center.y)
          )
        );
      }}
      fill={new Color(whiteColor).toHex()}
    />
  );
}
