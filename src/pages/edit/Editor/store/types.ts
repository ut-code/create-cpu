import type { StoreApi } from "zustand";
import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import type { CCNodeId } from "../../../../store/node";
import type { ContextMenuStoreSlice } from "./slices/contextMenu/types";
import type { EditorStoreCoreSlice } from "./slices/core/types";
import type { PerspectiveStoreSlice } from "./slices/perspective/types";

export type ComponentEditorStoreValue = {
	readonly componentId: CCComponentId;
	/** a node the player can neither delete nor rename the pin of */
	readonly isProtectedNode: (nodeId: CCNodeId) => boolean;
} & EditorStoreCoreSlice &
	PerspectiveStoreSlice &
	ContextMenuStoreSlice;

export type ComponentEditorSliceCreator<T> = (props: {
	store: CCStore;
	componentId: CCComponentId;
}) => {
	define: (
		set: (reducer: (state: T) => T) => void,
		get: () => ComponentEditorStoreValue,
	) => T;
	postCreate?: (editorStore: StoreApi<ComponentEditorStoreValue>) => void;
};
