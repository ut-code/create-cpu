import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import invariant from "tiny-invariant";
import CCStore, { type CCStorePropsFromJson } from "..";

function useContextValue() {
  const [store, setStore] = useState(() => new CCStore());

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
