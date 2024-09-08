import { useCallback, useMemo, useSyncExternalStore } from "react";
import nullthrows from "nullthrows";
import { useStore } from ".";
import type { CCComponent, CCComponentId } from "../component";
import type { CCNode, CCNodeId } from "../node";

export function useComponents() {
  const { store } = useStore();
  const { subscribe, getSnapshot } = useMemo(() => {
    let cachedSnapshot: CCComponent[] | null = null;
    return {
      subscribe: (onStoreChange: () => void) => {
        const handler = () => {
          cachedSnapshot = null;
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
      getSnapshot: () => {
        cachedSnapshot ??= store.components.getMany();
        return cachedSnapshot;
      },
    };
  }, [store]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useNodeIds(parentComponentId: CCComponentId) {
  const { store } = useStore();
  const { subscribe, getSnapshot } = useMemo(() => {
    let cachedSnapshot: CCNodeId[] | null = null;
    return {
      subscribe: (onStoreChange: () => void) => {
        const handler = () => {
          cachedSnapshot = null;
          onStoreChange();
        };
        store.nodes.on("didRegister", handler);
        store.nodes.on("didUnregister", handler);
        return () => {
          store.nodes.off("didRegister", handler);
          store.nodes.off("didUnregister", handler);
        };
      },
      getSnapshot: () => {
        cachedSnapshot ??= store.nodes
          .getMany()
          .filter((node) => node.parentComponentId === parentComponentId)
          .map((node) => node.id);
        return cachedSnapshot;
      },
    };
  }, [store, parentComponentId]);
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
