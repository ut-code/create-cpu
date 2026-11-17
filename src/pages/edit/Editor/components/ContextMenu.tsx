import {
	ClickAwayListener,
	Divider,
	MenuItem,
	MenuList,
	Paper,
} from "@mui/material";
import type { CCComponentId } from "../../../../store/component";
import { extractNodesIntoNewComponent } from "../../../../store/extractComponent";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";
import {
	getContextMenuItems,
	hasContextMenuItems,
} from "../store/slices/contextMenu/items";

export type CCComponentEditorContextMenuProps = {
	onEditComponent: (componentId: CCComponentId) => void;
	onComponentCreated: (componentId: CCComponentId) => void;
};

export default function CCComponentEditorContextMenu({
	onEditComponent,
	onComponentCreated,
}: CCComponentEditorContextMenuProps) {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();

	if (!componentEditorState.contextMenuState) return null;
	const items = getContextMenuItems(store, componentEditorState);
	if (!hasContextMenuItems(items)) return null;
	const {
		selectedNodeIds,
		selectedConnectionIds,
		canExtract,
		canDelete,
		componentToEdit,
	} = items;

	return (
		<ClickAwayListener onClickAway={componentEditorState.closeContextMenu}>
			<MenuList
				component={Paper}
				dense
				sx={{
					position: "absolute",
					top: `${componentEditorState.contextMenuState.position.y}px`,
					left: `${componentEditorState.contextMenuState.position.x}px`,
					width: "200px",
				}}
			>
				{/* <MenuItem onClick={componentEditorState.closeContextMenu}>
					Create a node
				</MenuItem> */}
				{canExtract && (
					<MenuItem
						onClick={async () => {
							componentEditorState.closeContextMenu();
							const newComponent = await extractNodesIntoNewComponent(
								store,
								selectedNodeIds,
								"New Component",
							);
							onComponentCreated(newComponent.id);
						}}
					>
						Create a new component...
					</MenuItem>
				)}
				{canDelete && (
					<MenuItem
						onClick={() => {
							if (selectedNodeIds.length > 0)
								store.nodes.unregister(selectedNodeIds);
							if (selectedConnectionIds.length > 0)
								store.connections.unregister(selectedConnectionIds);
							componentEditorState.selectConnection([], true);
							componentEditorState.closeContextMenu();
						}}
					>
						Delete
					</MenuItem>
				)}
				{componentToEdit && (canExtract || canDelete) && <Divider />}
				{componentToEdit && (
					<MenuItem
						onClick={() => {
							componentEditorState.closeContextMenu();
							onEditComponent(componentToEdit.id);
						}}
					>
						Edit...
					</MenuItem>
				)}
			</MenuList>
		</ClickAwayListener>
	);
}
