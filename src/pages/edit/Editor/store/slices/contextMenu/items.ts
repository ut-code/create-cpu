import nullthrows from "nullthrows";
import type CCStore from "../../../../../../store";
import type { CCComponent } from "../../../../../../store/component";
import type { CCConnectionId } from "../../../../../../store/connection";
import { getExtractableNodeIds } from "../../../../../../store/extractComponent";
import type { CCNodeId } from "../../../../../../store/node";
import type { ComponentEditorStoreValue } from "../../types";

export type ContextMenuItems = {
	selectedNodeIds: CCNodeId[];
	selectedConnectionIds: CCConnectionId[];
	canExtract: boolean;
	canDelete: boolean;
	componentToEdit: CCComponent | null;
};

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
		selectedNodeIds,
		selectedConnectionIds,
		canExtract:
			isEditMode && getExtractableNodeIds(store, selectedNodeIds).length > 0,
		canDelete:
			isEditMode &&
			(selectedNodeIds.length > 0 || selectedConnectionIds.length > 0),
		componentToEdit: targetComponent?.intrinsicType ? null : targetComponent,
	};
}

export function hasContextMenuItems(items: ContextMenuItems): boolean {
	return items.canExtract || items.canDelete || items.componentToEdit !== null;
}
