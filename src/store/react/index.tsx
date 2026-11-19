import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import type CCStore from "..";
import {
	createSavedStore,
	type RestoredStore,
	replaceSavedStore,
} from "../savedStore";

const storeContext = createContext<{ store: CCStore } | null>(null);
const resetStoreContext = createContext<((json?: string) => void) | null>(null);

/** Make `store` the one the components below edit */
export function StoreScope({
	store,
	children,
}: {
	store: CCStore;
	children: ReactNode;
}) {
	// For debugging
	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here to assign the property to the window object.
		(window as any)._store = store;
		return () => {
			// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here to delete the property from the window object.
			delete (window as any)._store;
		};
	}, [store]);
	const value = useMemo(() => ({ store }), [store]);
	return (
		<storeContext.Provider value={value}>{children}</storeContext.Provider>
	);
}

function SavedStoreProvider({
	initialStore,
	children,
}: {
	initialStore: CCStore;
	children: ReactNode;
}) {
	const [store, setStore] = useState(initialStore);
	const storeRef = useRef(store);
	const resetStore = useCallback((json?: string) => {
		const newStore = replaceSavedStore(storeRef.current, json);
		storeRef.current = newStore;
		setStore(newStore);
	}, []);
	return (
		<resetStoreContext.Provider value={resetStore}>
			<StoreScope store={store}>{children}</StoreScope>
		</resetStoreContext.Provider>
	);
}

export type UnrestorableSavedStore = {
	json: string;
	/**
	 * Replace the saved store with the sample and start editing it
	 * @throws if the sample cannot be saved
	 */
	startOver(): void;
};

/**
 * Until the store saved in this browser is one the editor can work on, `recovery` takes
 * the place of `children`, and nothing is saved over it
 * @param initial restored outside rendering, as it saves and React may render twice
 */
export function StoreProvider({
	initial,
	children,
	recovery,
}: {
	initial: RestoredStore;
	children: ReactNode;
	recovery: (saved: UnrestorableSavedStore) => ReactNode;
}) {
	const [restored, setRestored] = useState(initial);
	if (restored.type === "unrestorable") {
		return recovery({
			json: restored.json,
			startOver: () =>
				setRestored({ type: "ready", store: createSavedStore() }),
		});
	}
	return (
		<SavedStoreProvider initialStore={restored.store}>
			{children}
		</SavedStoreProvider>
	);
}

export function useStore() {
	const value = useContext(storeContext);
	invariant(value, "useStore must be used within a StoreScope");
	return value;
}

/** Replace the store saved in this browser with the one of `json`, or with the sample */
export function useResetStore() {
	const resetStore = useContext(resetStoreContext);
	invariant(resetStore, "useResetStore must be used within a StoreProvider");
	return resetStore;
}
