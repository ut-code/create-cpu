import type { MouseEvent } from "react";
import type { Vector2 } from "../../../../../../common/vector2";

export type ContextMenuState = {
	position: Vector2;
};

export type ContextMenuStoreSlice = {
	contextMenuState: ContextMenuState | null;
	openContextMenu: (e: MouseEvent) => void;
	closeContextMenu: () => void;
};
