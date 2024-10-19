import type * as matrix from "transformation-matrix";

export type PerspectiveStoreSlice = {
  rendererSize: { width: number; height: number };
  userPerspectiveTransformation: matrix.Matrix;
  registerRendererElement: (element: SVGSVGElement | null) => void;
  setUserPerspectiveTransformation: (transformation: matrix.Matrix) => void;
  getViewTransformation(): matrix.Matrix;
  getInverseViewTransformation(): matrix.Matrix;
  getViewBox(): { x: number; y: number; width: number; height: number };
};
