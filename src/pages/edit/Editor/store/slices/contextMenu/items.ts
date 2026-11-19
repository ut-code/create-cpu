import nullthrows from "nullthrows";
import type CCStore from "../../../../../../store";
import type { CCComponent } from "../../../../../../store/component";
import type { CCConnectionId } from "../../../../../../store/connection";
import { getExtractableNodeIds } from "../../../../../../store/extractComponent";
import type { CCNodeId } from "../../../../../../store/node";
import type { ComponentEditorStoreValue } from "../../types";

export type ContextMenuItems = {
	selectedConnectionIds: CCConnectionId[];
	removableNodeIds: CCNodeId[];
	keptNodeNames: string[];
	canExtract: boolean;
	canDelete: boolean;
	componentToEdit: CCComponent | null;
};

function nameOfNode(store: CCStore, nodeId: CCNodeId): string {
	const exposedPin = store.nodePins
		.getManyByNodeId(nodeId)
		.map((nodePin) => store.componentPins.getByImplementation(nodePin.id))
		.find((componentPin) => componentPin !== undefined);
	if (exposedPin) return exposedPin.name;
	const node = nullthrows(store.nodes.get(nodeId));
	return nullthrows(store.components.get(node.componentId)).name;
}

export function getContextMenuItems(
	store: CCStore,
	state: ComponentEditorStoreValue,
): ContextMenuItems {
	// The selection can still hold objects removed since, e.g. along with a node pin
	const selectedNodeIds = [...state.selectedNodeIds].filter((nodeId) =>
		store.nodes.get(nodeId),
	);
	const selectedConnectionIds = [...state.selectedConnectionIds].filter(
		(connectionId) => store.connections.get(connectionId),
	);
	const isEditMode = state.editorMode === "edit";
	const removableNodeIds = selectedNodeIds.filter(
		(nodeId) => !state.isProtectedNode(nodeId),
	);
	const [targetNodeId] = selectedNodeIds;
	const targetComponent =
		selectedNodeIds.length === 1 && targetNodeId
			? nullthrows(
					store.components.get(
						nullthrows(store.nodes.get(targetNodeId)).componentId,
					),
				)
			: null;
	return {
		selectedConnectionIds,
		removableNodeIds,
		keptNodeNames: isEditMode
			? selectedNodeIds
					.filter((nodeId) => state.isProtectedNode(nodeId))
					.map((nodeId) => nameOfNode(store, nodeId))
			: [],
		canExtract:
			isEditMode &&
			state.canCreateComponents &&
			getExtractableNodeIds(store, removableNodeIds).length > 0,
		canDelete:
			isEditMode &&
			(removableNodeIds.length > 0 || selectedConnectionIds.length > 0),
		componentToEdit: targetComponent?.intrinsicType ? null : targetComponent,
	};
}

export function hasContextMenuItems(items: ContextMenuItems): boolean {
	return (
		items.canExtract ||
		items.canDelete ||
		items.keptNodeNames.length > 0 ||
		items.componentToEdit !== null
	);
}
