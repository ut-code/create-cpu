import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../../../../../../store/component";
import simulateComponent from "../../../../../../store/componentEvaluator";
import type { CCComponentPinId } from "../../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../../store/connection";
import type { CCNodeId } from "../../../../../../store/node";
import type { CCNodePinId } from "../../../../../../store/nodePin";
import type { ComponentEditorSliceCreator } from "../../types";
import type { EditorStoreCoreSlice } from "./types";

export type SimulationValue = boolean[];
export function stringifySimulationValue(value: SimulationValue): string {
	const binary = value.map((v) => (v ? "1" : "0")).join("");
	if (value.length <= 4) return binary;
	return `0x${Number.parseInt(binary, 2).toString(16)}`;
}
export function wrappingIncrementSimulationValue(
	value: SimulationValue,
): SimulationValue {
	const result = value.slice();
	for (let i = result.length - 1; i >= 0; i--) {
		if (!result[i]) {
			result[i] = true;
			break;
		}
		result[i] = false; // carry the increment
	}
	return result;
}

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
				getInputValue(componentPinId: CCComponentPinId) {
					const value = get().inputValues.get(componentPinId);
					if (!value) {
						const multiplexability =
							store.componentPins.getComponentPinMultiplexability(
								componentPinId,
							);
						if (multiplexability === "undecidable") {
							throw new Error("Cannot determine multiplexability");
						}
						if (multiplexability.isMultiplexable) {
							const newValue = [false];
							return newValue;
						}
						const newValue = new Array(multiplexability.multiplicity).fill(
							false,
						);
						return newValue;
					}
					return value;
				},
				setInputValue(
					componentPinId: CCComponentPinId,
					value: SimulationValue,
				) {
					set((state) => {
						return {
							...state,
							inputValues: new Map(state.inputValues).set(
								componentPinId,
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
						.map((nodePin) => nodePin.userSpecifiedBitWidth || 0)
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
							inputValues.set(pin.id, editorState.getInputValue(pin.id));
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
			store.nodes.on("didRegister", executeSimulation);
			store.nodes.on("didUpdate", executeSimulation);
			store.nodes.on("didUnregister", executeSimulation);
			store.connections.on("didRegister", executeSimulation);
			store.connections.on("didUnregister", executeSimulation);
			editorStore.subscribe(executeSimulation);
		},
	};
};
