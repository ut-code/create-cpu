import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../../store/connection";
import { DEFAULT_SIMULATION_BIT_WIDTH } from "../../../../../../store/netlist";
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
	isValidPlaybackSpeed,
	serializeInputValueKey,
} from "./types";

export function stringifySimulationValue(value: SimulationValue): string {
	const binary = value.map((v) => (v ? "1" : "0")).join("");
	if (value.length <= 4) return binary;
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
					const componentPin = nullthrows(
						store.componentPins.get(inputValueKey.componentPinId),
					);
					const bitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
						nullthrows(
							componentPin.implementation,
							"Cannot get input value for intrinsic component pin",
						),
					);
					const bitWidth = bitWidthStatus.isFixed
						? bitWidthStatus.bitWidth
						: DEFAULT_SIMULATION_BIT_WIDTH;

					// The value set for the current time step, or else the latest earlier one,
					// inherited without updating the store during simulation
					let value = get().inputValues.get(
						serializeInputValueKey(inputValueKey),
					);
					if (!value) {
						const prefix = `${inputValueKey.componentPinId}:`;
						let latestTimeStep = -1;
						for (const [key, previousValue] of get().inputValues) {
							if (!key.startsWith(prefix)) continue;
							const timeStep = Number(key.slice(prefix.length));
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
					// the pin to one of a fixed width. Keep the value if it fits the new width,
					// and start over from zero if it does not.
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
					set((state) => ({ ...state, simulationError: null }));
				},
				setEditorMode(mode) {
					hasSimulationFailed = false;
					set((state) => ({
						...state,
						editorMode: mode,
						playbackMode: "manual",
						simulationError: null,
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
						simulationError:
							error instanceof Error ? error.message : String(error),
					}));
					return;
				}
				if (isUpdated) editorStore.setState((s) => ({ ...s }));
			};
			editorStore.subscribe(executeSimulation);
		},
	};
};
