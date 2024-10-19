import type { MouseEvent } from "react";
import type { Point } from "../../../../../../common/types";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { CCNodeId } from "../../../../../../store/node";

export type ContextMenuStateBase = {
  position: Point;
};
export type ContextMenuStateNode = {
  type: "Node";
  nodeId: CCNodeId;
};
export type ContextMenuStateConnection = {
  type: "Connection";
  connectionId: CCConnectionId;
};
export type ContextMenuState =
  | ContextMenuStateNode
  | ContextMenuStateConnection;

export type ContextMenuStoreSlice = {
  contextMenuState: (ContextMenuStateBase & ContextMenuState) | null;
  openContextMenu: (e: MouseEvent, state: ContextMenuState) => void;
  closeContextMenu: () => void;
};
