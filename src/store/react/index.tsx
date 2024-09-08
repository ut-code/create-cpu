import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import invariant from "tiny-invariant";
import { Point } from "pixi.js";
import CCStore, { type CCStorePropsFromJson } from "..";
import { CCComponentStore } from "../component";
import { CCNodeStore } from "../node";
import { andIntrinsicComponent, notIntrinsicComponent } from "../intrinsics";

function useContextValue() {
  const [store, setStore] = useState(() => {
    const rootComponent = CCComponentStore.create({
      name: "Root",
    });
    const tempStore = new CCStore();
    tempStore.components.register(rootComponent);
    const sampleNode1 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: andIntrinsicComponent.id,
      position: new Point(-200, 0),
      variablePins: null,
    });
    const sampleNode2 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: notIntrinsicComponent.id,
      position: new Point(200, 0),
      variablePins: null,
    });
    tempStore.nodes.register(sampleNode1);
    tempStore.nodes.register(sampleNode2);
    return tempStore;
  });

  // For debugging
  useEffect(() => {
    // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
    (window as any)._store = store;
  }, [store]);

  const resetStore = useCallback((props: CCStorePropsFromJson) => {
    setStore(new CCStore(props));
  }, []);
  return useMemo(() => ({ store, resetStore }), [store, resetStore]);
}

const context = createContext<ReturnType<typeof useContextValue> | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <context.Provider value={useContextValue()}>{children}</context.Provider>
  );
}

export function useStore() {
  const store = useContext(context);
  invariant(store);
  return store;
}
