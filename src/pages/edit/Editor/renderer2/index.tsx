import { useMeasure } from "react-use";
import * as matrix from "transformation-matrix";
import { useState } from "react";
import type { CCComponent } from "../../../../store/component";

export type CCComponentEditorComponentRendererProps = {
  componentId: CCComponent;
};

export default function CCComponentEditorRenderer() {
  const [ref, rect] = useMeasure();
  const centeringTransformation = matrix.translate(
    rect.width / 2,
    rect.height / 2
  );
  const [userTransformation, setUserTransformation] = useState(
    matrix.identity()
  );
  const viewTransformation = matrix.compose(
    centeringTransformation,
    userTransformation
  );
  const inverseViewTransformation = matrix.inverse(viewTransformation);
  const viewBoxTopLeft = matrix.applyToPoint(inverseViewTransformation, {
    x: 0,
    y: 0,
  });
  const viewBoxBottomRight = matrix.applyToPoint(inverseViewTransformation, {
    x: rect.width,
    y: rect.height,
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      viewBox={[
        viewBoxTopLeft.x,
        viewBoxTopLeft.y,
        viewBoxBottomRight.x - viewBoxTopLeft.x,
        viewBoxBottomRight.y - viewBoxTopLeft.y,
      ].join(" ")}
    >
      <rect
        x={viewBoxTopLeft.x}
        y={viewBoxTopLeft.y}
        width={viewBoxBottomRight.x - viewBoxTopLeft.x}
        height={viewBoxBottomRight.y - viewBoxTopLeft.y}
        onPointerDown={(pointerDownEvent) => {
          const { currentTarget } = pointerDownEvent;
          const startUserTransformation = userTransformation;
          const startPoint = matrix.applyToPoint(inverseViewTransformation, {
            x: pointerDownEvent.nativeEvent.offsetX,
            y: pointerDownEvent.nativeEvent.offsetY,
          });
          const onPointerMove = (pointerMoveEvent: PointerEvent) => {
            const endPoint = matrix.applyToPoint(inverseViewTransformation, {
              x: pointerMoveEvent.offsetX,
              y: pointerMoveEvent.offsetY,
            });
            setUserTransformation(
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
          const center = matrix.applyToPoint(inverseViewTransformation, {
            x: wheelEvent.nativeEvent.offsetX,
            y: wheelEvent.nativeEvent.offsetY,
          });
          setUserTransformation(
            matrix.compose(
              userTransformation,
              matrix.scale(scale, scale, center.x, center.y)
            )
          );
        }}
        fill="#ddffff"
      />
      <rect x="-100" y="-100" width="200" height="200" fill="red" />
    </svg>
  );
}
