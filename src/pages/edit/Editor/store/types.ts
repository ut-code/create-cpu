import type { StoreApi } from "zustand";
import type CCStore from "../../../../store";
import type { CCComponent, CCComponentId } from "../../../../store/component";
import type { CCNodeId } from "../../../../store/node";
import type { ContextMenuStoreSlice } from "./slices/contextMenu/types";
import type { EditorStoreCoreSlice } from "./slices/core/types";
import type { PerspectiveStoreSlice } from "./slices/perspective/types";

export type ComponentEditorStoreValue = {
	readonly componentId: CCComponentId;
	/** neither deleted nor its pin renamed */
	readonly isProtectedNode: (nodeId: CCNodeId) => boolean;
	readonly isOffered: (component: CCComponent) => boolean;
	readonly hasProperties: (componentId: CCComponentId) => boolean;
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
