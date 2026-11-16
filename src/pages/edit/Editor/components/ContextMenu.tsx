import {
	ClickAwayListener,
	Divider,
	MenuItem,
	MenuList,
	Paper,
} from "@mui/material";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../../../../store/component";
import { extractNodesIntoNewComponent } from "../../../../store/extractComponent";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";

export type CCComponentEditorContextMenuProps = {
	onEditComponent: (componentId: CCComponentId) => void;
};

export default function CCComponentEditorContextMenu({
	onEditComponent,
}: CCComponentEditorContextMenuProps) {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();

	if (!componentEditorState.contextMenuState) return null;

	// The selection can still hold objects removed since, e.g. along with a node pin
	const selectedNodeIds = [...componentEditorState.selectedNodeIds].filter(
		(nodeId) => store.nodes.get(nodeId),
	);
	const selectedConnectionIds = [
		...componentEditorState.selectedConnectionIds,
	].filter((connectionId) => store.connections.get(connectionId));

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
				{selectedNodeIds.length > 0 && (
					<MenuItem
						onClick={async () => {
							componentEditorState.closeContextMenu();
							const newComponent = await extractNodesIntoNewComponent(
								store,
								selectedNodeIds,
								"New Component",
							);
							onEditComponent(newComponent.id);
						}}
					>
						Create a new component...
					</MenuItem>
				)}
				{(selectedNodeIds.length > 0 || selectedConnectionIds.length > 0) && (
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
				{(() => {
					const [targetNodeId] = selectedNodeIds;
					if (selectedNodeIds.length !== 1 || !targetNodeId) return undefined;
					const targetNode = nullthrows(store.nodes.get(targetNodeId));
					const targetComponent = store.components.get(targetNode.componentId);
					invariant(targetComponent);
					if (targetComponent.intrinsicType) return undefined;
					return (
						<>
							<Divider />
							<MenuItem
								onClick={() => {
									invariant(targetNode);
									componentEditorState.closeContextMenu();
									onEditComponent(targetNode.componentId);
								}}
							>
								Edit...
							</MenuItem>
						</>
					);
				})()}
			</MenuList>
		</ClickAwayListener>
	);
}
