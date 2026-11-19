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

function useContextValue(initialStore: CCStore) {
	const [store, setStore] = useState(initialStore);

	// For debugging
	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here to assign the property to the window object.
		(window as any)._store = store;
		return () => {
			// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here to delete the property from the window object.
			delete (window as any)._store;
		};
	}, [store]);

	const storeRef = useRef(store);
	const resetStore = useCallback((json?: string) => {
		const newStore = replaceSavedStore(storeRef.current, json);
		storeRef.current = newStore;
		setStore(newStore);
	}, []);
	return useMemo(() => ({ store, resetStore }), [store, resetStore]);
}

const context = createContext<ReturnType<typeof useContextValue> | null>(null);

function ReadyStoreProvider({
	initialStore,
	children,
}: {
	initialStore: CCStore;
	children: ReactNode;
}) {
	return (
		<context.Provider value={useContextValue(initialStore)}>
			{children}
		</context.Provider>
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
		<ReadyStoreProvider initialStore={restored.store}>
			{children}
		</ReadyStoreProvider>
	);
}

export function useStore() {
	const store = useContext(context);
	invariant(store);
	return store;
}
