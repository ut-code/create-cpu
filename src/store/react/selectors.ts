import { useCallback, useSyncExternalStore } from "react";
import { useStore } from ".";

export default function useAllComponents() {
  const { store } = useStore();
  const getSnapshot = useCallback(() => store.components.getAll(), [store]);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      store.components.on("didRegister", onStoreChange);
      store.components.on("didUpdate", onStoreChange);
      store.components.on("didUnregister", onStoreChange);
      return () => {
        store.components.off("didRegister", onStoreChange);
        store.components.on("didUpdate", onStoreChange);
        store.components.off("didUnregister", onStoreChange);
      };
    },
    [store]
  );
  return [...useSyncExternalStore(subscribe, getSnapshot).values()];
}
