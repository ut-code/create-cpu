import { useCallback, useMemo, useSyncExternalStore } from "react";
import memoizeOne from "memoize-one";
import nullthrows from "nullthrows";
import { useStore } from ".";
import type { CCComponentId } from "../component";
import type { CCNode, CCNodeId } from "../node";
import type { CCComponentPin } from "../componentPin";
import type { CCNodePin } from "../nodePin";

export function useComponents() {
  const { store } = useStore();
  const getSnapshot = useMemo(
    () => memoizeOne(() => store.components.getMany()),
    [store]
  );
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => {
        getSnapshot.clear();
        onStoreChange();
      };
      store.components.on("didRegister", handler);
      store.components.on("didUpdate", handler);
      store.components.on("didUnregister", handler);
      return () => {
        store.components.off("didRegister", handler);
        store.components.off("didUpdate", handler);
        store.components.off("didUnregister", handler);
      };
    },
    [getSnapshot, store.components]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useNodeIds(parentComponentId: CCComponentId) {
  const { store } = useStore();
  const getSnapshot = useMemo(
    () =>
      memoizeOne(() =>
        store.nodes
          .getMany()
          .filter((node) => node.parentComponentId === parentComponentId)
          .map((node) => node.id)
      ),
    [store, parentComponentId]
  );
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => {
        getSnapshot.clear();
        onStoreChange();
      };
      store.nodes.on("didRegister", handler);
      store.nodes.on("didUnregister", handler);
      return () => {
        store.nodes.off("didRegister", handler);
        store.nodes.off("didUnregister", handler);
      };
    },
    [getSnapshot, store.nodes]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useConnectionIds(parentComponentId: CCComponentId) {
  const { store } = useStore();
  const getSnapshot = useMemo(
    () =>
      memoizeOne(() =>
        store.connections
          .getMany()
          .filter(
            (connection) => connection.parentComponentId === parentComponentId
          )
          .map((connection) => connection.id)
      ),
    [store, parentComponentId]
  );
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => {
        getSnapshot.clear();
        onStoreChange();
      };
      store.connections.on("didRegister", handler);
      store.connections.on("didUnregister", handler);
      return () => {
        store.connections.off("didRegister", handler);
        store.connections.off("didUnregister", handler);
      };
    },
    [getSnapshot, store.connections]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useNode(nodeId: CCNodeId) {
  const { store } = useStore();
  const getSnapshot = useCallback(
    () => nullthrows(store.nodes.get(nodeId)),
    [store, nodeId]
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
    [store, nodeId]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useComponentPins(componentId: CCComponentId) {
  const { store } = useStore();
  const getSnapshot = useMemo(
    () =>
      memoizeOne(() => store.componentPins.getManyByComponentId(componentId)),
    [store, componentId]
  );
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = (componentPin: CCComponentPin) => {
        if (componentPin.componentId === componentId) onStoreChange();
      };
      store.componentPins.on("didRegister", handler);
      store.componentPins.on("didUpdate", handler);
      store.componentPins.on("didUnregister", handler);
      return () => {
        store.componentPins.off("didRegister", handler);
        store.componentPins.off("didUpdate", handler);
        store.componentPins.off("didUnregister", handler);
      };
    },
    [store, componentId]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useNodePins(nodeId: CCNodeId) {
  const { store } = useStore();
  const getSnapshot = useMemo(
    () => memoizeOne(() => store.nodePins.getManyByNodeId(nodeId)),
    [store, nodeId]
  );
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = (nodePin: CCNodePin) => {
        if (nodePin.nodeId === nodeId) onStoreChange();
      };
      store.nodePins.on("didRegister", handler);
      store.nodePins.on("didUnregister", handler);
      return () => {
        store.nodePins.off("didRegister", handler);
        store.nodePins.off("didUnregister", handler);
      };
    },
    [store, nodeId]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}
