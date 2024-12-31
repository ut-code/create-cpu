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
				<MenuItem onClick={componentEditorState.closeContextMenu}>
					Create a node
				</MenuItem>
				{componentEditorState.selectedNodeIds.size > 0 && (
					<MenuItem
						onClick={() => {
							const oldNodes = [...componentEditorState.selectedNodeIds].map(
								(nodeId) => {
									const node = store.nodes.get(nodeId);
									invariant(node);
									return node;
								},
							);
							const oldConnections = [
								...componentEditorState.selectedConnectionIds,
							].map((connectionId) => {
								const connection = store.connections.get(connectionId);
								invariant(connection);
								return connection;
							});
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
							for (const connection of newConnections)
								store.connections.register(connection);
							store.connections.unregister([
								...componentEditorState.selectedConnectionIds,
							]);
							store.nodes.unregister([...componentEditorState.selectedNodeIds]);
							componentEditorState.closeContextMenu();
							onEditComponent(newComponent.id);
						}}
					>
						Create a new component...
					</MenuItem>
				)}
				{(componentEditorState.selectedNodeIds.size > 0 ||
					componentEditorState.selectedConnectionIds.size > 0) && (
					<MenuItem
						onClick={() => {
							if (componentEditorState.selectedNodeIds.size > 0)
								store.nodes.unregister([
									...componentEditorState.selectedNodeIds,
								]);
							if (componentEditorState.selectedConnectionIds.size > 0)
								store.connections.unregister([
									...componentEditorState.selectedConnectionIds,
								]);
							componentEditorState.selectNode([], true);
							componentEditorState.selectConnection([], false);
							componentEditorState.closeContextMenu();
						}}
					>
						Delete
					</MenuItem>
				)}
				{(() => {
					if (componentEditorState.selectedNodeIds.size !== 1) return undefined;
					const iteratorResult = componentEditorState.selectedNodeIds
						.values()
						.next();
					invariant(!iteratorResult.done);
					const targetNode = store.nodes.get(iteratorResult.value);
					invariant(targetNode);
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
