import type { MouseEvent } from "react";
import type { Point } from "../../../../../../common/types";

export type ContextMenuState = {
  position: Point;
};

export type ContextMenuStoreSlice = {
  contextMenuState: ContextMenuState | null;
  openContextMenu: (e: MouseEvent) => void;
  closeContextMenu: () => void;
};
