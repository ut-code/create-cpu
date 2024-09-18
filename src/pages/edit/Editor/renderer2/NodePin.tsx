import { useState } from "react";
import type { Point } from "../../../../common/types";
import type { CCNodePinId } from "../../../../store/nodePin";
import { CCComponentEditorRendererConnectionCore } from "./Connection";

export type CCComponentEditorRendererNodeProps = {
  nodePinId: CCNodePinId;
  position: Point;
};
export default function CCComponentEditorRendererNodePin({
  nodePinId,
  position,
}: CCComponentEditorRendererNodeProps) {
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);

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
        }}
        onPointerMove={(e) => {
          console.log(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          setCursorPosition({ x: e.clientX, y: e.clientY });
        }}
      />
      {cursorPosition && (
        <CCComponentEditorRendererConnectionCore
          from={position}
          to={{
            x: position.x + 100,
            y: position.y + 100,
          }}
        />
      )}
    </>
  );
}
