import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import invariant from "tiny-invariant";
import CCStore from "..";
import { setupDefaultSample } from "../samples/default";

function useContextValue() {
	const [store, setStore] = useState(() => {
		const tempStore = new CCStore();
		const isRestored = tempStore.autoSaver.tryRestore();
		tempStore.mount();
		if (!isRestored) setupDefaultSample(tempStore);
		tempStore.autoSaver.watch();
		return tempStore;
	});

	// For debugging
	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here to assign the property to the window object.
		(window as any)._store = store;
		return () => {
			// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here to delete the property from the window object.
			delete (window as any)._store;
		};
	}, [store]);

	const resetStore = useCallback((json?: string) => {
		const store = new CCStore();
		if (json) store.importJson(json);
		store.mount();
		if (!json) setupDefaultSample(store);
		store.autoSaver.watch();
		setStore(store);
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
