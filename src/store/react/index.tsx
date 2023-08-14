import { createContext, useContext, useState } from "react";
import invariant from "tiny-invariant";
import { Point } from "pixi.js";
import CCStore from "..";
import { CCComponentStore } from "../component";
import { CCPinStore } from "../pin";
import { CCNodeStore } from "../node";
import { CCConnectionStore } from "../connection";

const storeContext = createContext<CCStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => {
    const rootComponent = CCComponentStore.create({
      name: "Root",
    });
    const tempStore = new CCStore(rootComponent);
    const sampleComponent = CCComponentStore.create({
      name: "Sample",
    });
    tempStore.components.register(sampleComponent);
    const sampleComponentInputPin1 = CCPinStore.create({
      type: "input",
      componentId: sampleComponent.id,
      name: "A",
    });
    const sampleComponentInputPin2 = CCPinStore.create({
      type: "input",
      componentId: sampleComponent.id,
      name: "B",
    });
    const sampleComponentOutputPin1 = CCPinStore.create({
      type: "output",
      componentId: sampleComponent.id,
      name: "X",
    });
    tempStore.pins.register(sampleComponentInputPin1);
    tempStore.pins.register(sampleComponentInputPin2);
    tempStore.pins.register(sampleComponentOutputPin1);
    const sampleNode1 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: sampleComponent.id,
      position: new Point(-200, 0),
    });
    const sampleNode2 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: sampleComponent.id,
      position: new Point(200, 0),
    });
    tempStore.nodes.register(sampleNode1);
    tempStore.nodes.register(sampleNode2);
    const sampleConnection = CCConnectionStore.create({
      to: { nodeId: sampleNode2.id, pinId: sampleComponentInputPin1.id },
      from: { nodeId: sampleNode1.id, pinId: sampleComponentOutputPin1.id },
      parentComponentId: rootComponent.id,
    });
    tempStore.connections.register(sampleConnection);
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
