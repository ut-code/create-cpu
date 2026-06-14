import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { CCNodeId } from "../../../../../../store/node";
import type { CCNodePinId } from "../../../../../../store/nodePin";
import type {
	SimulationFrame,
	SimulationValue,
} from "../../../../../../store/simulation";
// import type { CCComponentId } from "../../../../../../store/component";
import simulateComponent from "../../../../../../store/simulation";
import type { ComponentEditorSliceCreator } from "../../types";
import {
	type EditorStoreCoreSlice,
	type InputValueKey,
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

	return {
		define: (set, get) => {
			return {
				editorMode: "edit",
				timeStep: 0,
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
					// If value exists for the current time step, return it
					const value = get().inputValues.get(
						serializeInputValueKey(inputValueKey),
					);
					if (value) return value;

					// If not, try to find the value from the previous time step
					const previousTimeStepValue = get().inputValues.get(
						serializeInputValueKey({
							...inputValueKey,
							timeStep: inputValueKey.timeStep - 1,
						}),
					);
					if (previousTimeStepValue) {
						get().setInputValue(inputValueKey, previousTimeStepValue);
						return previousTimeStepValue;
					}

					// If not found, initialize the value based on the bit width of the pin
					const componentPin = nullthrows(
						store.componentPins.get(inputValueKey.componentPinId),
					);
					const bitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
						nullthrows(
							componentPin.implementation,
							"Cannot get input value for intrinsic component pin",
						),
					);
					return bitWidthStatus.isFixed
						? // If the bit width is fixed, initialize the value with the specified bit width
							new Array(bitWidthStatus.bitWidth).fill(false)
						: // If the bit width is not fixed, initialize the single-bit value as false
							[false];
				},
				setInputValue(inputValueKey: InputValueKey, value: SimulationValue) {
					set((state) => {
						return {
							...state,
							inputValues: new Map(state.inputValues).set(
								JSON.stringify(inputValueKey),
								value,
							),
						};
					});
				},
				setRangeSelect(rangeSelect) {
					set((state) => ({ ...state, rangeSelect }));
				},
				setEditorMode(mode) {
					set((state) => ({ ...state, editorMode: mode }));
				},
				setTimeStep(timeStep: number) {
					set((state) => ({ ...state, timeStep }));
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
					const { nodeId } = nullthrows(store.nodePins.get(nodePinId));
					return nullthrows(
						nullthrows(simulationCachedFrames[get().timeStep]).nodes.get(
							nodeId,
						),
					).pins.get(nodePinId);
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

				const newSimulationCacheKey =
					store.nodes
						.getMany()
						.map((node) => node.id)
						.join() +
					store.nodePins
						.getMany()
						.map((nodePin) => `${nodePin.id}_${nodePin.manualBitWidth || 0}`)
						.join(",") +
					store.connections
						.getMany()
						.map((connection) => connection.id)
						.join() +
					[...editorStore.getState().inputValues.entries()]
						.map(([key, value]) => key + value.join())
						.join();
				if (newSimulationCacheKey !== simulationCacheKey) {
					simulationCacheKey = newSimulationCacheKey;
					simulationCachedFrames = [];
				}

				const editorState = editorStore.getState();
				let isUpdated = false;
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
								editorState.getInputValue({ componentPinId: pin.id, timeStep }),
							);
						}
					}
					simulationCachedFrames.push(
						nullthrows(
							simulateComponent(store, componentId, inputValues, previousFrame),
						),
					);
					isUpdated = true;
				}
				if (isUpdated) editorStore.setState((s) => ({ ...s }));
			};
			editorStore.subscribe(executeSimulation);
		},
	};
};
