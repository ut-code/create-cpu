import * as matrix from "transformation-matrix";
import { type ComponentEditorSliceCreator } from "../../types";
import type { PerspectiveStoreSlice } from "./types";
import { vector2 } from "../../../../../../common/vector2";

const createComponentEditorStorePerspectiveSlice: ComponentEditorSliceCreator<
  PerspectiveStoreSlice
> = () => {
  let resizeObserver: ResizeObserver | null;
  let resizeObserverObservedElement: SVGSVGElement | null;
  const registerRendererElement = (element: SVGSVGElement | null) => {
    if (!resizeObserver) return;
    if (resizeObserverObservedElement)
      resizeObserver.unobserve(resizeObserverObservedElement);
    if (element) resizeObserver.observe(element);
    resizeObserverObservedElement = element;
  };
  return {
    define: (set, get) => ({
      perspective: { center: vector2.zero, scale: 1 },
      rendererSize: vector2.zero,
      userPerspectiveTransformation: matrix.identity(),
      setPerspective: (perspective) => set((s) => ({ ...s, perspective })),
      registerRendererElement,
      fromCanvasToStage: (point) =>
        vector2.add(
          vector2.mul(
            vector2.sub(point, vector2.div(get().rendererSize, 2)),
            get().perspective.scale
          ),
          get().perspective.center
        ),
      fromStageToCanvas: (point) =>
        vector2.add(
          vector2.div(
            vector2.sub(point, get().perspective.center),
            get().perspective.scale
          ),
          vector2.div(get().rendererSize, 2)
        ),
      getViewBox: () => {
        const viewBoxTopLeft = get().fromCanvasToStage(vector2.zero);
        const viewBoxBottomRight = get().fromCanvasToStage(get().rendererSize);
        return {
          x: viewBoxTopLeft.x,
          y: viewBoxTopLeft.y,
          width: viewBoxBottomRight.x - viewBoxTopLeft.x,
          height: viewBoxBottomRight.y - viewBoxTopLeft.y,
        };
      },
    }),
    postCreate(editorStore) {
      resizeObserver = new ResizeObserver((entries) => {
        if (!entries[0]) return;
        editorStore.setState({
          rendererSize: {
            x: entries[0].contentRect.width,
            y: entries[0].contentRect.height,
          },
        });
      });
    },
  };
};

export default createComponentEditorStorePerspectiveSlice;
