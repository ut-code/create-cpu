import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import invariant from "tiny-invariant";
import nullthrows from "nullthrows";
import CCStore, { type CCStorePropsFromJson } from "..";
import { CCComponentStore } from "../component";
import { CCNodeStore } from "../node";
import {
  andIntrinsicComponentDefinition,
  notIntrinsicComponentDefinition,
} from "../intrinsics";
import { CCConnectionStore } from "../connection";

function useContextValue() {
  const [store, setStore] = useState(() => {
    const tempStore = new CCStore();

    const rootComponent = CCComponentStore.create({
      name: "Root",
    });
    tempStore.components.register(rootComponent);

    const sampleNode1 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: andIntrinsicComponentDefinition.component.id,
      position: { x: -100, y: 0 },
    });
    tempStore.nodes.register(sampleNode1);

    const sampleNode2 = CCNodeStore.create({
      parentComponentId: rootComponent.id,
      componentId: notIntrinsicComponentDefinition.component.id,
      position: { x: 100, y: 0 },
    });
    tempStore.nodes.register(sampleNode2);

    const fromNodePin = nullthrows(
      tempStore.nodePins
        .getManyByNodeId(sampleNode1.id)
        .find(
          (nodePin) =>
            nodePin.componentPinId ===
            andIntrinsicComponentDefinition.outputPins[0]!.id
        )
    );
    const toNodePin = nullthrows(
      tempStore.nodePins
        .getManyByNodeId(sampleNode2.id)
        .find(
          (nodePin) =>
            nodePin.componentPinId ===
            notIntrinsicComponentDefinition.inputPins[0]!.id
        )
    );
    const sampleConnection = CCConnectionStore.create({
      parentComponentId: rootComponent.id,
      from: fromNodePin.id,
      to: toNodePin.id,
      bentPortion: 0.5,
    });
    tempStore.connections.register(sampleConnection);

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
