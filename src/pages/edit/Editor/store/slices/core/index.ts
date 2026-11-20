import { mapValues } from "es-toolkit";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import { valueLabel } from "../../../../../../common/bitLabel";
import { messagesByLanguage } from "../../../../../../i18n/messages";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import {
	type CCConnectionId,
	CCConnectionStore,
} from "../../../../../../store/connection";
import {
	DEFAULT_SIMULATION_BIT_WIDTH,
	SimulationNodeError,
} from "../../../../../../store/netlist";
import type { CCNodeId } from "../../../../../../store/node";
import type { CCNodePinId } from "../../../../../../store/nodePin";
import type {
	SimulationFrame,
	SimulationValue,
} from "../../../../../../store/simulation";
// import type { CCComponentId } from "../../../../../../store/component";
import simulateComponent from "../../../../../../store/simulation";
import { fitSimulationValue } from "../../../components/ValueEditor/value";
import type { ComponentEditorSliceCreator } from "../../types";
import {
	type EditorStoreCoreSlice,
	type InputValueKey,
	type InputValueResetNotice,
	isValidPlaybackSpeed,
	parseInputValueKey,
	serializeInputValueKey,
} from "./types";

export function stringifySimulationValue(value: SimulationValue): string {
	if (value.length <= 4) return valueLabel(value);
	const binary = value.map((v) => (v ? "1" : "0")).join("");
	return `0x${Number.parseInt(binary, 2).toString(16)}`;
}

export const createComponentEditorStoreCoreSlice: ComponentEditorSliceCreator<
	EditorStoreCoreSlice
> = ({ store, componentId }) => {
	let simulationCacheKey = "";
	/** index = timeStep */
	let simulationCachedFrames: SimulationFrame[] = [];
	/** set when the circuit cannot be simulated, to not retry on every change */
	let hasSimulationFailed = false;
	let lastConnectionRejectionNoticeId = 0;

	const getInputBitWidth = (componentPinId: CCComponentPinId) => {
		const componentPin = nullthrows(store.componentPins.get(componentPinId));
		const bitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
			nullthrows(
				componentPin.implementation,
				"Cannot get input value for intrinsic component pin",
			),
		);
		return bitWidthStatus.isFixed
			? bitWidthStatus.bitWidth
			: DEFAULT_SIMULATION_BIT_WIDTH;
	};

	// Bit widths change only in edit mode, so a value that stopped fitting is found on
	// entering play mode. It becomes zero rather than being dropped, so that the time
	// steps after it do not inherit an earlier value instead.
	const resetInputValuesNotFitting = (
		inputValues: Map<string, SimulationValue>,
	): {
		inputValues: Map<string, SimulationValue>;
		inputValueResetNotice: InputValueResetNotice | null;
	} => {
		const newInputValues = new Map(inputValues);
		const resetInputs = new Map<
			CCComponentPinId,
			InputValueResetNotice["inputs"][number]
		>();
		for (const [key, value] of inputValues) {
			const { componentPinId } = parseInputValueKey(key);
			const componentPin = store.componentPins.get(componentPinId);
			if (!componentPin) continue;
			const bitWidth = getInputBitWidth(componentPinId);
			if (fitSimulationValue(value, bitWidth)) continue;
			newInputValues.set(key, new Array(bitWidth).fill(false));
			resetInputs.set(componentPinId, { name: componentPin.name, bitWidth });
		}
		return resetInputs.size === 0
			? { inputValues, inputValueResetNotice: null }
			: {
					inputValues: newInputValues,
					inputValueResetNotice: { inputs: [...resetInputs.values()] },
				};
	};

	return {
		define: (set, get) => {
			return {
				editorMode: "edit",
				timeStep: 0,
				playbackMode: "manual",
				playbackSpeed: 1,
				selectedNodeIds: new Set(),
				rangeSelect: null,
				selectedConnectionIds: new Set(),
				nodePinPropertyEditorTarget: null,
				setNodePinPropertyEditorTarget(target) {
					set((state) => ({
						...state,
						nodePinPropertyEditorTarget: target,
					}));
				},
				/** @private */
				inputValues: new Map(),
				getInputValue(inputValueKey: InputValueKey) {
					const bitWidth = getInputBitWidth(inputValueKey.componentPinId);

					// The value set for the current time step, or else the latest earlier one,
					// inherited without updating the store during simulation
					let value = get().inputValues.get(
						serializeInputValueKey(inputValueKey),
					);
					if (!value) {
						let latestTimeStep = -1;
						for (const [key, previousValue] of get().inputValues) {
							const { componentPinId, timeStep } = parseInputValueKey(key);
							if (componentPinId !== inputValueKey.componentPinId) continue;
							if (
								timeStep < inputValueKey.timeStep &&
								timeStep > latestTimeStep
							) {
								latestTimeStep = timeStep;
								value = previousValue;
							}
						}
					}

					// The bit width may have changed since the value was set, e.g. by connecting
					// the pin to one of a fixed width. A value that no longer fits is reset on
					// entering play mode.
					return (
						(value && fitSimulationValue(value, bitWidth)) ??
						new Array(bitWidth).fill(false)
					);
				},
				setInputValue(inputValueKey: InputValueKey, value: SimulationValue) {
					set((state) => {
						return {
							...state,
							inputValues: new Map(state.inputValues).set(
								serializeInputValueKey(inputValueKey),
								value,
							),
						};
					});
				},
				setRangeSelect(rangeSelect) {
					set((state) => ({ ...state, rangeSelect }));
				},
				simulationError: null,
				dismissSimulationError() {
					if (get().simulationError === null) return;
					set((state) => ({ ...state, simulationError: null }));
				},
				connectNodePins(from, to) {
					const rejection = store.connections.register(
						CCConnectionStore.create({
							parentComponentId: componentId,
							from,
							to,
							bentPortion: 0.5,
						}),
					);
					if (rejection) lastConnectionRejectionNoticeId += 1;
					set((state) => ({
						...state,
						connectionRejectionNotice: rejection && {
							id: lastConnectionRejectionNoticeId,
							rejection,
						},
					}));
				},
				inputValueResetNotice: null,
				dismissInputValueResetNotice() {
					set((state) => ({ ...state, inputValueResetNotice: null }));
				},
				connectionRejectionNotice: null,
				dismissConnectionRejectionNotice() {
					set((state) => ({ ...state, connectionRejectionNotice: null }));
				},
				setEditorMode(mode) {
					hasSimulationFailed = false;
					const { inputValues, inputValueResetNotice } =
						mode === "play"
							? resetInputValuesNotFitting(get().inputValues)
							: { inputValues: get().inputValues, inputValueResetNotice: null };
					set((state) => ({
						...state,
						inputValues,
						inputValueResetNotice,
						editorMode: mode,
						playbackMode: "manual",
						simulationError: null,
						nodePinPropertyEditorTarget: null,
						connectionRejectionNotice: null,
					}));
				},
				setTimeStep(timeStep: number) {
					set((state) => ({ ...state, timeStep }));
				},
				setPlaybackMode(playbackMode) {
					if (get().editorMode !== "play") return;
					set((state) => ({ ...state, playbackMode }));
				},
				setPlaybackSpeed(playbackSpeed) {
					if (!isValidPlaybackSpeed(playbackSpeed)) return;
					set((state) => ({ ...state, playbackSpeed }));
				},
				selectNode(ids: CCNodeId[], exclusive: boolean) {
					set((state) => ({
						...state,
						selectedNodeIds: new Set(
							exclusive ? ids : [...state.selectedNodeIds, ...ids],
						),
						selectedConnectionIds: new Set(),
					}));
				},
				unselectNode(ids: CCNodeId[]) {
					set((state) => ({
						...state,
						selectedNodeIds: new Set(
							[...state.selectedNodeIds].filter(
								(nodeId) => !ids.includes(nodeId),
							),
						),
						selectedConnectionIds: new Set(),
					}));
				},
				selectConnection(ids: CCConnectionId[], exclusive: boolean) {
					set((state) => ({
						...state,
						selectedConnectionIds: new Set(
							exclusive ? ids : [...state.selectedConnectionIds, ...ids],
						),
						selectedNodeIds: new Set(),
					}));
				},
				getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined {
					return nullthrows(
						simulationCachedFrames[get().timeStep],
						`Time step ${get().timeStep} has not been simulated`,
					).getNodePinValue(nodePinId);
				},
				getComponentPinValue(
					componentPinId: CCComponentPinId,
				): SimulationValue | undefined {
					const componentPin = nullthrows(
						store.componentPins.get(componentPinId),
					);
					invariant(componentPin.implementation);
					const nodePinId = componentPin.implementation;
					return this.getNodePinValue(nodePinId);
				},
			};
		},
		postCreate: (editorStore) => {
			const executeSimulation = () => {
				if (editorStore.getState().editorMode !== "play") return;

				// The netlist is cached against the revision of the store, so the key only
				// has to cover that revision and the values fed to the input pins.
				const newSimulationCacheKey = [
					store.revision,
					...[...editorStore.getState().inputValues.entries()].map(
						([key, value]) => `${key}${value.join()}`,
					),
				].join("|");
				if (newSimulationCacheKey !== simulationCacheKey) {
					simulationCacheKey = newSimulationCacheKey;
					simulationCachedFrames = [];
					hasSimulationFailed = false;
				}
				if (hasSimulationFailed) return;

				const editorState = editorStore.getState();
				let isUpdated = false;
				try {
					for (
						let timeStep = simulationCachedFrames.length;
						timeStep <= editorState.timeStep;
						timeStep += 1
					) {
						const previousFrame = simulationCachedFrames[timeStep - 1] ?? null;
						const inputValues = new Map<CCComponentPinId, SimulationValue>();
						const pins = store.componentPins.getManyByComponentId(componentId);
						for (const pin of pins) {
							invariant(pin.implementation);
							if (pin.type === "input") {
								inputValues.set(
									pin.id,
									editorState.getInputValue({
										componentPinId: pin.id,
										timeStep,
									}),
								);
							}
						}
						simulationCachedFrames.push(
							simulateComponent(store, componentId, inputValues, previousFrame),
						);
						isUpdated = true;
					}
				} catch (error) {
					// Back to edit mode: without frames the renderers have no values to show.
					hasSimulationFailed = true;
					simulationCachedFrames = [];
					editorStore.setState((state) => ({
						...state,
						editorMode: "edit",
						playbackMode: "manual",
						timeStep: 0,
						simulationError: {
							messageByLanguage: mapValues(messagesByLanguage, (messages) =>
								error instanceof SimulationNodeError
									? error.describe(store, messages.simulation)
									: error instanceof Error
										? error.message
										: String(error),
							),
							nodeIds:
								error instanceof SimulationNodeError
									? error.outlinedNodeIds
									: new Set(),
						},
					}));
					return;
				}
				if (isUpdated) editorStore.setState((s) => ({ ...s }));
			};
			editorStore.subscribe(executeSimulation);
		},
	};
};
