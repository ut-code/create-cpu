import type { Vector2 } from "../../../../../../common/vector2";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { CCNodeId } from "../../../../../../store/node";
import type {
	CCConnectionRejection,
	CCNodePinId,
} from "../../../../../../store/nodePin";
import type { SimulationValue } from "../../../../../../store/simulation";

export type EditorMode = EditorModeEdit | EditorModePlay;
export type EditorModeEdit = "edit";
export type EditorModePlay = "play";

export type PlaybackMode = "manual" | "auto";

export const MIN_PLAYBACK_SPEED = 0.1;
export const MAX_PLAYBACK_SPEED = 60;

export function isValidPlaybackSpeed(speed: number): boolean {
	return (
		Number.isFinite(speed) &&
		speed >= MIN_PLAYBACK_SPEED &&
		speed <= MAX_PLAYBACK_SPEED
	);
}

export type RangeSelect = { start: Vector2; end: Vector2 } | null;

export type TimeStep = number;

export type InputValueKey = {
	componentPinId: CCComponentPinId;
	timeStep: TimeStep;
};
export function serializeInputValueKey(key: InputValueKey): string {
	return `${key.componentPinId}:${key.timeStep}`;
}
export function parseInputValueKey(key: string): InputValueKey {
	const separatorIndex = key.lastIndexOf(":");
	return {
		componentPinId: key.slice(0, separatorIndex) as CCComponentPinId,
		timeStep: Number(key.slice(separatorIndex + 1)),
	};
}

export type NodePinPropertyEditorTarget = {
	nodeId: CCNodeId;
	componentPinId: CCComponentPinId;
};

export type ConnectionRejectionNotice = {
	/** tells a repeated rejection apart from the one shown before */
	id: number;
	rejection: CCConnectionRejection;
};

export type SimulationErrorNotice = {
	message: string;
	/** nodes of the edited component that are, or contain, the nodes involved */
	nodeIds: ReadonlySet<CCNodeId>;
};

export type InputValueResetNotice = {
	inputs: { name: string; bitWidth: number }[];
};

export type EditorStoreCoreSlice = {
	editorMode: EditorMode;
	timeStep: number;
	playbackMode: PlaybackMode;
	/** Simulation steps per second. */
	playbackSpeed: number;
	selectedNodeIds: Set<CCNodeId>;
	rangeSelect: RangeSelect;
	setRangeSelect(rangeSelect: RangeSelect): void;
	selectedConnectionIds: Set<CCConnectionId>;
	nodePinPropertyEditorTarget: NodePinPropertyEditorTarget | null;
	setNodePinPropertyEditorTarget(
		target: NodePinPropertyEditorTarget | null,
	): void;
	inputValues: Map<string, SimulationValue>;
	getInputValue(inputValueKey: InputValueKey): SimulationValue;
	setInputValue(inputValueKey: InputValueKey, value: SimulationValue): void;
	setEditorMode(mode: EditorMode): void;
	setTimeStep(timeStep: number): void;
	setPlaybackMode(mode: PlaybackMode): void;
	setPlaybackSpeed(speed: number): void;
	selectNode(ids: CCNodeId[], exclusive: boolean): void;
	unselectNode(ids: CCNodeId[]): void;
	selectConnection(ids: CCConnectionId[], exclusive: boolean): void;
	/** why the last simulation attempt failed, if it did */
	simulationError: SimulationErrorNotice | null;
	dismissSimulationError(): void;
	connectNodePins(from: CCNodePinId, to: CCNodePinId): void;
	/** why the last attempt to connect pins was refused, until it is dismissed */
	connectionRejectionNotice: ConnectionRejectionNotice | null;
	dismissConnectionRejectionNotice(): void;
	/** inputs whose values were reset on entering play mode, as they no longer fit */
	inputValueResetNotice: InputValueResetNotice | null;
	dismissInputValueResetNotice(): void;
	getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined;
	getComponentPinValue(
		componentPinId: CCComponentPinId,
	): SimulationValue | undefined;
};
