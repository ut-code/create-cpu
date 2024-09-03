import type * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../../../../store/component";
import type { CCComponentPinId } from "../../../../store/componentPin";
import type { CCNodeId } from "../../../../store/node";
import type { CCNodePinId } from "../../../../store/nodePin";
import type { CCConnectionId } from "../../../../store/connection";
import type { SliceCreator } from "./types";

export type EditorMode = EditorModeEdit | EditorModePlay;
export type EditorModeEdit = "edit";
export type EditorModePlay = "play";

export type RangeSelect = { start: PIXI.Point; end: PIXI.Point } | null;

export type InputValueKey = CCComponentPinId;

export type SimulationValue = boolean[];
export type SimulationFrame = {
  componentId: CCComponentId;
  nodes: Map<
    CCNodeId,
    {
      pins: Map<CCNodePinId, SimulationValue>;
      /** null if intrinsic */
      child: SimulationFrame | null;
    }
  >;
};

export type EditorStoreCoreSlice = {
  editorMode: EditorMode;
  timeStep: number;
  selectedNodeIds: Set<CCNodeId>;
  rangeSelect: RangeSelect;
  setRangeSelect(rangeSelect: RangeSelect): void;
  selectedConnectionIds: Set<CCConnectionId>;
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

export const createComponentEditorStoreCoreSlice: SliceCreator<
  EditorStoreCoreSlice
> = ({ store, componentId }, set, get) => {
  return {
    editorMode: "edit",
    timeStep: 0,
    selectedNodeIds: new Set(),
    rangeSelect: null,
    selectedConnectionIds: new Set(),
    /** @private */
    inputValues: new Map(),
    getInputValue(componentPinId: CCComponentPinId) {
      const value = this.inputValues.get(componentPinId);
      if (!value) {
        const multiplexability =
          store.componentPins.getComponentPinMultiplexability(componentPinId);
        if (multiplexability.isMultiplexable) {
          const newValue = [false];
          return newValue;
        }
        const newValue = new Array(multiplexability.multiplicity).fill(false);
        return newValue;
      }
      return value;
    },
    setInputValue(componentPinId: CCComponentPinId, value: SimulationValue) {
      set((state) => {
        return {
          ...state,
          inputValues: new Map(state.inputValues).set(componentPinId, value),
        };
      });
    },
    setRangeSelect(rangeSelect: RangeSelect) {
      set((state) => ({ ...state, rangeSelect }));
    },
    setEditorMode(mode: EditorMode) {
      set((state) => ({ ...state, editorMode: mode }));
    },
    resetTimeStep() {
      set((state) => ({ ...state, timeStep: 0 }));
    },
    incrementTimeStep() {
      set((state) => ({ ...state, timeStep: state.timeStep + 1 }));
    },
    selectNode(ids: CCNodeId[], exclusive: boolean) {
      set((state) => ({
        ...state,
        selectedNodeIds: new Set(
          exclusive ? ids : [...state.selectedNodeIds, ...ids]
        ),
        selectedConnectionIds: new Set(),
      }));
    },
    unselectNode(ids: CCNodeId[]) {
      set((state) => ({
        ...state,
        selectedNodeIds: new Set(
          [...state.selectedNodeIds].filter((nodeId) => !ids.includes(nodeId))
        ),
        selectedConnectionIds: new Set(),
      }));
    },
    selectConnection(ids: CCConnectionId[], exclusive: boolean) {
      set((state) => ({
        ...state,
        selectedConnectionIds: new Set(
          exclusive ? ids : [...state.selectedConnectionIds, ...ids]
        ),
        selectedNodeIds: new Set(),
      }));
    },
    getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined {
      const { nodeId } = store.nodePins.get(nodePinId)!;
      const editorState = editorStore.getState();
      return simulationCachedFrames[editorState.timeStep]!.nodes.get(
        nodeId
      )!.pins.get(nodePinId);
    },
    getComponentPinValue(
      componentPinId: CCComponentPinId
    ): SimulationValue | undefined {
      const componentPin = store.componentPins.get(componentPinId)!;
      invariant(componentPin.implementation);
      const nodePinId = componentPin.implementation;
      return this.getNodePinValue(nodePinId);
    },
  };
};
