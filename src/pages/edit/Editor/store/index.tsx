import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { create } from "zustand";
import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import type { CCNodeId } from "../../../../store/node";
import { useStore } from "../../../../store/react";
import createComponentEditorStoreContextMenuSlice from "./slices/contextMenu";
import { createComponentEditorStoreCoreSlice } from "./slices/core";
import createComponentEditorStorePerspectiveSlice from "./slices/perspective";
import type { ComponentEditorStoreValue } from "./types";

export type EditorStoreOptions = {
	isProtectedNode?: (nodeId: CCNodeId) => boolean;
};

export function createEditorStore(
	componentId: CCComponentId,
	store: CCStore,
	{ isProtectedNode = () => false }: EditorStoreOptions = {},
) {
	const props = { store, componentId };
	const coreSlice = createComponentEditorStoreCoreSlice(props);
	const perspectiveSlice = createComponentEditorStorePerspectiveSlice(props);
	const contextMenuSlice = createComponentEditorStoreContextMenuSlice(props);
	const editorStore = create<ComponentEditorStoreValue>((set, get) => ({
		componentId,
		isProtectedNode,
		...coreSlice.define(set, get),
		...perspectiveSlice.define(set, get),
		...contextMenuSlice.define(set, get),
	}));
	coreSlice.postCreate?.(editorStore);
	perspectiveSlice.postCreate?.(editorStore);
	contextMenuSlice.postCreate?.(editorStore);
	return editorStore;
}

export type ComponentEditorStore = ReturnType<typeof createEditorStore>;

const context = createContext<ComponentEditorStore | null>(null);

export function ComponentEditorStoreProvider({
	componentId,
	options,
	children,
}: {
	componentId: CCComponentId;
	options: EditorStoreOptions;
	children: React.ReactNode;
}) {
	const { store } = useStore();
	const [editorStore] = useState(() =>
		createEditorStore(componentId, store, options),
	);
	return <context.Provider value={editorStore}>{children}</context.Provider>;
}

export function useComponentEditorStore() {
	const store = useContext(context);
	invariant(
		store,
		"useComponentEditorStore must be used within a ComponentEditorStoreProvider",
	);
	return store;
}
