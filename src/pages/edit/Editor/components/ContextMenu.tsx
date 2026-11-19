import {
	ClickAwayListener,
	Divider,
	MenuItem,
	MenuList,
	Paper,
} from "@mui/material";
import { useMessages } from "../../../../i18n";
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
	const messages = useMessages();
	const componentEditorState = useComponentEditorStore()();

	if (!componentEditorState.contextMenuState) return null;
	const items = getContextMenuItems(store, componentEditorState);
	if (!hasContextMenuItems(items)) return null;
	const {
		selectedConnectionIds,
		removableNodeIds,
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
					minWidth: "200px",
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
								removableNodeIds,
								messages.common.newComponentName,
							);
							onComponentCreated(newComponent.id);
						}}
					>
						{messages.editor.contextMenu.createComponent}
					</MenuItem>
				)}
				{canDelete && (
					<MenuItem
						onClick={() => {
							if (removableNodeIds.length > 0)
								store.nodes.unregister(removableNodeIds);
							if (selectedConnectionIds.length > 0)
								store.connections.unregister(selectedConnectionIds);
							componentEditorState.selectConnection([], true);
							componentEditorState.closeContextMenu();
						}}
					>
						{messages.common.delete}
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
						{messages.editor.contextMenu.edit}
					</MenuItem>
				)}
			</MenuList>
		</ClickAwayListener>
	);
}
