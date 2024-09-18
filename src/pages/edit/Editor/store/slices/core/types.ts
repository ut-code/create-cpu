import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCNodeId } from "../../../../../../store/node";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { SimulationValue } from ".";
import type { CCNodePinId } from "../../../../../../store/nodePin";
import type { Point } from "../../../../../../common/types";

export type EditorMode = EditorModeEdit | EditorModePlay;
export type EditorModeEdit = "edit";
export type EditorModePlay = "play";

export type RangeSelect = { start: Point; end: Point } | null;

export type InputValueKey = CCComponentPinId;

export type EditorStoreCoreSlice = {
  editorMode: EditorMode;
  timeStep: number;
  selectedNodeIds: Set<CCNodeId>;
  rangeSelect: RangeSelect;
  setRangeSelect(rangeSelect: RangeSelect): void;
  selectedConnectionIds: Set<CCConnectionId>;
  isCreatingConnectionFrom: CCNodePinId | null;
  setIsCreatingConnectionFrom(nodePinId: CCNodePinId | null): void;
  inputValues: Map<InputValueKey, SimulationValue>;
  getInputValue(componentPinId: CCComponentPinId): SimulationValue;
  setInputValue(componentPinId: CCComponentPinId, value: SimulationValue): void;
  setEditorMode(mode: EditorMode): void;
  resetTimeStep(): void;
  incrementTimeStep(): void;
  selectNode(ids: CCNodeId[], exclusive: boolean): void;
  unselectNode(ids: CCNodeId[]): void;
  selectConnection(ids: CCConnectionId[], exclusive: boolean): void;
  getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined;
  getComponentPinValue(
    componentPinId: CCComponentPinId
  ): SimulationValue | undefined;
};
