import nullthrows from "nullthrows";
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
import { CCComponentStore } from "../component";
import { CCConnectionStore } from "../connection";
import { and, not } from "../intrinsics/definitions";
import { CCNodeStore } from "../node";

function useContextValue() {
	const [store, setStore] = useState(() => {
		const tempStore = new CCStore();

		const rootComponent = CCComponentStore.create({
			name: "Root",
		});
		tempStore.components.register(rootComponent);

		const sampleNode1 = CCNodeStore.create({
			parentComponentId: rootComponent.id,
			componentId: and.component.id,
			position: { x: -100, y: 0 },
		});
		tempStore.nodes.register(sampleNode1);

		const sampleNode2 = CCNodeStore.create({
			parentComponentId: rootComponent.id,
			componentId: not.component.id,
			position: { x: 100, y: 0 },
		});
		tempStore.nodes.register(sampleNode2);

		const fromNodePin = nullthrows(
			tempStore.nodePins
				.getManyByNodeId(sampleNode1.id)
				.find((nodePin) => nodePin.componentPinId === and.outputPin.Out.id),
		);
		const toNodePin = nullthrows(
			tempStore.nodePins
				.getManyByNodeId(sampleNode2.id)
				.find((nodePin) => nodePin.componentPinId === not.inputPin.A.id),
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
		Object.defineProperty(window, "_store", {
			value: store,
			enumerable: false,
		});
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
