import { createContext, useContext, useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { Point } from "pixi.js";
import CCStore from "..";
import { CCComponentStore } from "../component";
import { CCNodeStore } from "../node";
import { andIntrinsicComponent, notIntrinsicComponent } from "../intrinsics";
// import { CCConnectionStore } from "../connection";

export const storeContext = createContext<{
  store: CCStore | null;
  setStore: React.Dispatch<React.SetStateAction<CCStore>> | null;
}>({ store: null, setStore: null });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState(() => {
    const rootComponent = CCComponentStore.create({
      name: "Root",
    });
    const tempStore = new CCStore(rootComponent);
    const sampleNode1 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: andIntrinsicComponent.id,
      position: new Point(-200, 0),
    });
    const sampleNode2 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: notIntrinsicComponent.id,
      position: new Point(200, 0),
    });
    tempStore.nodes.register(sampleNode1);
    tempStore.nodes.register(sampleNode2);
    return tempStore;
  });
  const value = useMemo(() => ({ store, setStore }), [store, setStore]);
  return (
    <storeContext.Provider value={value}>{children}</storeContext.Provider>
  );
}

export function useStore(newStore?: CCStore) {
  const { store, setStore } = useContext(storeContext);
  if (newStore) {
    if (newStore && setStore) {
      setStore(newStore);
    }
    return newStore;
  }
  invariant(store);
  return store;
}
