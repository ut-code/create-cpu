import type { SimulationValue } from ".";
import type { Vector2 } from "../../../../../../common/vector2";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { CCNodeId } from "../../../../../../store/node";
import type { CCNodePin, CCNodePinId } from "../../../../../../store/nodePin";

export type EditorMode = EditorModeEdit | EditorModePlay;
export type EditorModeEdit = "edit";
export type EditorModePlay = "play";

export type RangeSelect = { start: Vector2; end: Vector2 } | null;

export type InputValueKey = CCComponentPinId;

export type NodePinPropertyEditorTarget = {
	nodeId: CCNodeId;
	componentPinId: CCComponentPinId;
};

export type EditorStoreCoreSlice = {
	editorMode: EditorMode;
	timeStep: number;
	selectedNodeIds: Set<CCNodeId>;
	rangeSelect: RangeSelect;
	setRangeSelect(rangeSelect: RangeSelect): void;
	selectedConnectionIds: Set<CCConnectionId>;
	nodePinPropertyEditorTarget: NodePinPropertyEditorTarget | null;
	setNodePinPropertyEditorTarget(
		target: NodePinPropertyEditorTarget | null,
	): void;
	inputValues: Map<InputValueKey, SimulationValue>;
	getInputValue(
		componentPinId: CCComponentPinId,
		nodePins: CCNodePin[],
	): SimulationValue;
	setInputValue(componentPinId: CCComponentPinId, value: SimulationValue): void;
	setEditorMode(mode: EditorMode): void;
	resetTimeStep(): void;
	incrementTimeStep(): void;
	selectNode(ids: CCNodeId[], exclusive: boolean): void;
	unselectNode(ids: CCNodeId[]): void;
	selectConnection(ids: CCConnectionId[], exclusive: boolean): void;
	getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined;
	getComponentPinValue(
		componentPinId: CCComponentPinId,
	): SimulationValue | undefined;
};
