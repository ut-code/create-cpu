import { useCallback, useRef, useSyncExternalStore } from "react";
import {
	type CCComponent,
	type CCComponentId,
	isEachInputPinConnected,
} from "../component";
import type { CCComponentPin, CCComponentPinId } from "../componentPin";
import type { CCConnectionId } from "../connection";
import type { CCNode, CCNodeId } from "../node";
import { useStore } from ".";
import { reuseIfSameItems } from "./snapshot";

/** Read on every render, since a removal is announced only after its transaction. */
function useStoreList<T>(
	read: () => readonly T[],
	subscribe: (onStoreChange: () => void) => () => void,
): readonly T[] {
	const previousRef = useRef<readonly T[] | null>(null);
	const getSnapshot = useCallback(() => {
		const list = reuseIfSameItems(previousRef.current, read());
		previousRef.current = list;
		return list;
	}, [read]);
	return useSyncExternalStore(subscribe, getSnapshot);
}

export function useComponents() {
	const { store } = useStore();
	const read = useCallback(() => store.components.getMany(), [store]);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			store.components.on("didRegister", onStoreChange);
			store.components.on("didUpdate", onStoreChange);
			store.components.on("didUnregister", onStoreChange);
			return () => {
				store.components.off("didRegister", onStoreChange);
				store.components.off("didUpdate", onStoreChange);
				store.components.off("didUnregister", onStoreChange);
			};
		},
		[store],
	);
	return useStoreList(read, subscribe);
}

export function useNodeIds(parentComponentId: CCComponentId) {
	const { store } = useStore();
	const read = useCallback(
		() =>
			store.nodes
				.getManyByParentComponentId(parentComponentId)
				.map((node) => node.id),
		[store, parentComponentId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			store.nodes.on("didRegister", onStoreChange);
			store.nodes.on("didUnregister", onStoreChange);
			return () => {
				store.nodes.off("didRegister", onStoreChange);
				store.nodes.off("didUnregister", onStoreChange);
			};
		},
		[store],
	);
	return useStoreList(read, subscribe);
}

export function useConnectionIds(parentComponentId: CCComponentId) {
	const { store } = useStore();
	const read = useCallback(
		() =>
			store.connections
				.getManyByParentComponentId(parentComponentId)
				.map((connection) => connection.id),
		[store, parentComponentId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			store.connections.on("didRegister", onStoreChange);
			store.connections.on("didUnregister", onStoreChange);
			return () => {
				store.connections.off("didRegister", onStoreChange);
				store.connections.off("didUnregister", onStoreChange);
			};
		},
		[store],
	);
	return useStoreList(read, subscribe);
}

export function useComponent(componentId: CCComponentId | undefined) {
	const { store } = useStore();
	const getSnapshot = useCallback(
		() =>
			componentId === undefined ? undefined : store.components.get(componentId),
		[store, componentId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const handler = (component: CCComponent) => {
				if (component.id === componentId) onStoreChange();
			};
			store.components.on("didUpdate", handler);
			return () => {
				store.components.off("didUpdate", handler);
			};
		},
		[store, componentId],
	);
	return useSyncExternalStore(subscribe, getSnapshot);
}

export function useNode(nodeId: CCNodeId | undefined) {
	const { store } = useStore();
	const getSnapshot = useCallback(
		() => (nodeId === undefined ? undefined : store.nodes.get(nodeId)),
		[store, nodeId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const handler = (node: CCNode) => {
				if (node.id === nodeId) onStoreChange();
			};
			store.nodes.on("didUpdate", handler);
			return () => {
				store.nodes.off("didUpdate", handler);
			};
		},
		[store, nodeId],
	);
	return useSyncExternalStore(subscribe, getSnapshot);
}

export function useComponentPin(componentPinId: CCComponentPinId | undefined) {
	const { store } = useStore();
	const getSnapshot = useCallback(
		() =>
			componentPinId === undefined
				? undefined
				: store.componentPins.get(componentPinId),
		[store, componentPinId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const handler = (componentPin: CCComponentPin) => {
				if (componentPin.id === componentPinId) onStoreChange();
			};
			store.componentPins.on("didUpdate", handler);
			return () => {
				store.componentPins.off("didUpdate", handler);
			};
		},
		[store, componentPinId],
	);
	return useSyncExternalStore(subscribe, getSnapshot);
}

export function useCanSimulate(componentId: CCComponentId) {
	const { store } = useStore();
	const getSnapshot = useCallback(
		() => isEachInputPinConnected(store, componentId),
		[store, componentId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			store.subscribeToCircuitChanges(onStoreChange),
		[store],
	);
	return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Whether the pins a connection ties together fix different bit widths. A change
 * anywhere in the circuit can cause or resolve a conflict, e.g. inside a component used
 * by a node at one end, so this is recomputed on every change of the circuit.
 */
export function useIsConnectionInBitWidthConflict(
	connectionId: CCConnectionId,
) {
	const { store } = useStore();
	const getSnapshot = useCallback(
		() =>
			// The connection can be gone before its renderer is unmounted
			store.connections.get(connectionId) !== undefined &&
			store.connections.isInBitWidthConflict(connectionId),
		[store, connectionId],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			store.subscribeToCircuitChanges(onStoreChange),
		[store],
	);
	return useSyncExternalStore(subscribe, getSnapshot);
}
