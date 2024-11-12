import * as matrix from "transformation-matrix";
import { type ComponentEditorSliceCreator } from "../../types";
import type { PerspectiveStoreSlice } from "./types";

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
      rendererSize: { width: 0, height: 0 },
      userPerspectiveTransformation: matrix.identity(),
      registerRendererElement,
      setUserPerspectiveTransformation: (transformation) => {
        set((state) => ({
          ...state,
          userPerspectiveTransformation: transformation,
        }));
      },
      getViewTransformation: () => {
        return matrix.compose(
          matrix.translate(
            get().rendererSize.width / 2,
            get().rendererSize.height / 2
          ),
          get().userPerspectiveTransformation
        );
      },
      getInverseViewTransformation: () =>
        matrix.inverse(get().getViewTransformation()),
      getViewBox: () => {
        const inverseViewTransformation = get().getInverseViewTransformation();
        const viewBoxTopLeft = matrix.applyToPoint(inverseViewTransformation, {
          x: 0,
          y: 0,
        });
        const viewBoxBottomRight = matrix.applyToPoint(
          inverseViewTransformation,
          {
            x: get().rendererSize.width,
            y: get().rendererSize.height,
          }
        );
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
        editorStore.setState({ rendererSize: entries[0].contentRect });
      });
    },
  };
};

export default createComponentEditorStorePerspectiveSlice;
