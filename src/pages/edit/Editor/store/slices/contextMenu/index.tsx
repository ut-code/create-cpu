import type { ComponentEditorSliceCreator } from "../../types";
import type { ContextMenuStoreSlice } from "./types";

const createComponentEditorStoreContextMenuSlice: ComponentEditorSliceCreator<
	ContextMenuStoreSlice
> = () => ({
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
});

export default createComponentEditorStoreContextMenuSlice;
