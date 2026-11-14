import {
	ClickAwayListener,
	Divider,
	MenuItem,
	MenuList,
	Paper,
} from "@mui/material";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import {
	type CCComponentId,
	CCComponentStore,
} from "../../../../store/component";
import {
	type CCConnection,
	CCConnectionStore,
} from "../../../../store/connection";
import {
	type CCNode,
	type CCNodeId,
	CCNodeStore,
} from "../../../../store/node";
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
						onClick={() => {
							const oldNodes = selectedNodeIds.map((nodeId) =>
								nullthrows(store.nodes.get(nodeId)),
							);
							const oldConnections = selectedConnectionIds.map((connectionId) =>
								nullthrows(store.connections.get(connectionId)),
							);
							const newComponent = CCComponentStore.create({
								name: "New Component",
							});
							store.components.register(newComponent);
							const oldToNewNodeIdMap = new Map<CCNodeId, CCNodeId>();
							const newNodes = oldNodes.map<CCNode>((oldNode) => {
								const newNode = CCNodeStore.create({
									parentComponentId: newComponent.id,
									position: oldNode.position,
									componentId: oldNode.componentId,
								});
								oldToNewNodeIdMap.set(oldNode.id, newNode.id);
								return newNode;
							});
							for (const node of newNodes) store.nodes.register(node);
							const newConnections = oldConnections.flatMap<CCConnection>(
								(oldConnection) => {
									const oldFromNodePin = nullthrows(
										store.nodePins.get(oldConnection.from),
									);
									const oldToNodePin = nullthrows(
										store.nodePins.get(oldConnection.to),
									);
									const newFromNodeId = nullthrows(
										oldToNewNodeIdMap.get(oldFromNodePin.nodeId),
									);
									const newToNodeId = nullthrows(
										oldToNewNodeIdMap.get(oldToNodePin.nodeId),
									);
									return CCConnectionStore.create({
										parentComponentId: newComponent.id,
										from: store.nodePins.getByImplementationNodeIdAndPinId(
											newFromNodeId,
											oldFromNodePin.componentPinId,
										).id,
										to: store.nodePins.getByImplementationNodeIdAndPinId(
											newToNodeId,
											oldToNodePin.componentPinId,
										).id,
										bentPortion: oldConnection.bentPortion,
									});
								},
							);
							// A connection in a bit width conflict is moved as it is, since the
							// original is removed below
							for (const connection of newConnections)
								store.connections.register(connection, {
									allowBitWidthConflict: true,
								});
							store.connections.unregister(selectedConnectionIds);
							store.nodes.unregister(selectedNodeIds);
							componentEditorState.closeContextMenu();
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
