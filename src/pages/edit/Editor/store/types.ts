import type { StoreApi } from "zustand";
import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import type { CCNodeId } from "../../../../store/node";
import type { OffersComponent } from "../../placement";
import type { ContextMenuStoreSlice } from "./slices/contextMenu/types";
import type { EditorStoreCoreSlice } from "./slices/core/types";
import type { PerspectiveStoreSlice } from "./slices/perspective/types";

export type ComponentEditorStoreValue = {
	readonly componentId: CCComponentId;
	readonly isProtectedNode: (nodeId: CCNodeId) => boolean;
	readonly isOffered: OffersComponent;
	readonly canCreateComponents: boolean;
	/** whether the view is fitted to the nodes when the editor first gets its size */
	readonly fitsNodesInView: boolean;
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
