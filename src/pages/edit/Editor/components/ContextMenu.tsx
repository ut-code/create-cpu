import {
	ClickAwayListener,
	Divider,
	ListItemText,
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
		keptNodeNames,
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
					maxWidth: "280px",
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
				{(canDelete || keptNodeNames.length > 0) && (
					<MenuItem
						disabled={!canDelete}
						onClick={() => {
							if (removableNodeIds.length > 0)
								store.nodes.unregister(removableNodeIds);
							if (selectedConnectionIds.length > 0)
								store.connections.unregister(selectedConnectionIds);
							componentEditorState.selectConnection([], true);
							componentEditorState.closeContextMenu();
						}}
					>
						<ListItemText
							slotProps={{ secondary: { sx: { whiteSpace: "normal" } } }}
							primary={messages.common.delete}
							secondary={
								keptNodeNames.length === 0
									? null
									: canDelete
										? messages.editor.contextMenu.keptOnDelete(keptNodeNames)
										: messages.editor.contextMenu.cannotDelete(keptNodeNames)
							}
						/>
					</MenuItem>
				)}
				{componentToEdit &&
					(canExtract || canDelete || keptNodeNames.length > 0) && <Divider />}
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
