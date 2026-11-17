import type { ComponentEditorSliceCreator } from "../../types";
import { getContextMenuItems, hasContextMenuItems } from "./items";
import type { ContextMenuStoreSlice } from "./types";

const createComponentEditorStoreContextMenuSlice: ComponentEditorSliceCreator<
	ContextMenuStoreSlice
> = ({ store }) => ({
	define: (set) => ({
		contextMenuState: null,
		openContextMenu: (e) => {
			set((state) => ({
				...state,
				contextMenuState: {
					position: {
						x: e.nativeEvent.offsetX,
						y: e.nativeEvent.offsetY,
					},
				},
			}));
		},
		closeContextMenu: () =>
			set((state) => ({ ...state, contextMenuState: null })),
	}),
	// Items depend on the mode, and a menu left without any is not drawn to be clicked away
	postCreate: (editorStore) => {
		editorStore.subscribe((state, previousState) => {
			if (!state.contextMenuState) return;
			if (
				state.editorMode !== previousState.editorMode ||
				!hasContextMenuItems(getContextMenuItems(store, state))
			)
				state.closeContextMenu();
		});
	},
});

export default createComponentEditorStoreContextMenuSlice;
