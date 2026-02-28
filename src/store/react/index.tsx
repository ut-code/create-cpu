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
import CCStore from "..";
import { CCComponentStore } from "../component";
import { CCConnectionStore } from "../connection";
import { and, input, not, output } from "../intrinsics/definitions";
import { CCNodeStore } from "../node";

function useContextValue() {
	const [store, setStore] = useState(() => {
		const tempStore = new CCStore();
		const isRestored = tempStore.autoSaver.tryRestore();
		tempStore.mount();
		if (!isRestored) {
			const rootComponent = CCComponentStore.create({
				name: "Root",
			});
			tempStore.components.register(rootComponent);

			const sampleAndNode = CCNodeStore.create({
				parentComponentId: rootComponent.id,
				componentId: and.component.id,
				position: { x: -100, y: 0 },
			});
			tempStore.nodes.register(sampleAndNode);

			const sampleNotNode = CCNodeStore.create({
				parentComponentId: rootComponent.id,
				componentId: not.component.id,
				position: { x: 100, y: 0 },
			});
			tempStore.nodes.register(sampleNotNode);

			const sampleInputNode1 = CCNodeStore.create({
				parentComponentId: rootComponent.id,
				componentId: input.component.id,
				position: { x: -300, y: -100 },
			});
			tempStore.nodes.register(sampleInputNode1);

			const sampleInputNode2 = CCNodeStore.create({
				parentComponentId: rootComponent.id,
				componentId: input.component.id,
				position: { x: -300, y: 100 },
			});
			tempStore.nodes.register(sampleInputNode2);

			const sampleOutputNode = CCNodeStore.create({
				parentComponentId: rootComponent.id,
				componentId: output.component.id,
				position: { x: 300, y: 0 },
			});
			tempStore.nodes.register(sampleOutputNode);

			const fromPinOfSampleInputNode1 = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleInputNode1.id)
					.find((nodePin) => nodePin.componentPinId === input.outputPin.Out.id),
			);
			const toPinOfSampleAndNode1 = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleAndNode.id)
					.find((nodePin) => nodePin.componentPinId === and.inputPin.A.id),
			);
			const connection1 = CCConnectionStore.create({
				parentComponentId: rootComponent.id,
				from: fromPinOfSampleInputNode1.id,
				to: toPinOfSampleAndNode1.id,
				bentPortion: 0.5,
			});
			tempStore.connections.register(connection1);

			const fromPinOfSampleInputNode2 = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleInputNode2.id)
					.find((nodePin) => nodePin.componentPinId === input.outputPin.Out.id),
			);
			const toPinOfSampleAndNode2 = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleAndNode.id)
					.find((nodePin) => nodePin.componentPinId === and.inputPin.B.id),
			);
			const connection2 = CCConnectionStore.create({
				parentComponentId: rootComponent.id,
				from: fromPinOfSampleInputNode2.id,
				to: toPinOfSampleAndNode2.id,
				bentPortion: 0.5,
			});
			tempStore.connections.register(connection2);

			const fromPinOfSampleAndNode = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleAndNode.id)
					.find((nodePin) => nodePin.componentPinId === and.outputPin.Out.id),
			);
			const toPinOfSampleNotNode = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleNotNode.id)
					.find((nodePin) => nodePin.componentPinId === not.inputPin.In.id),
			);
			const connection3 = CCConnectionStore.create({
				parentComponentId: rootComponent.id,
				from: fromPinOfSampleAndNode.id,
				to: toPinOfSampleNotNode.id,
				bentPortion: 0.5,
			});
			tempStore.connections.register(connection3);

			const fromPinOfSampleNotNode = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleNotNode.id)
					.find((nodePin) => nodePin.componentPinId === not.outputPin.Out.id),
			);
			const toPinOfSampleOutputNode = nullthrows(
				tempStore.nodePins
					.getManyByNodeId(sampleOutputNode.id)
					.find((nodePin) => nodePin.componentPinId === output.inputPin.In.id),
			);
			const connection4 = CCConnectionStore.create({
				parentComponentId: rootComponent.id,
				from: fromPinOfSampleNotNode.id,
				to: toPinOfSampleOutputNode.id,
				bentPortion: 0.5,
			});
			tempStore.connections.register(connection4);
		}
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

	const resetStore = useCallback((json: string) => {
		const store = new CCStore();
		store.importJson(json);
		store.mount();
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
