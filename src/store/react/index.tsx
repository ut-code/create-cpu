import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { Point } from "pixi.js";
import CCStore from "..";
import { CCComponentStore } from "../component";
import { CCNodeStore } from "../node";
import { andIntrinsicComponent, notIntrinsicComponent } from "../intrinsics";
// import { CCConnectionStore } from "../connection";

export const storeContext = createContext<CCStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => {
    const rootComponent = CCComponentStore.create({
      name: "Root",
    });
    const tempStore = new CCStore(rootComponent);
    const sampleNode1 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: andIntrinsicComponent.id,
      position: new Point(-200, 0),
      intrinsicVariablePinCount: null,
    });
    const sampleNode2 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: notIntrinsicComponent.id,
      position: new Point(200, 0),
      intrinsicVariablePinCount: null,
    });
    tempStore.nodes.register(sampleNode1);
    tempStore.nodes.register(sampleNode2);
    return tempStore;
  });
  return (
    <storeContext.Provider value={store}>{children}</storeContext.Provider>
  );
}

export function useStore() {
  const store = useContext(storeContext);
  invariant(store);
  return store;
}
