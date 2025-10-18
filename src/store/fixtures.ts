import nullthrows from "nullthrows";
import CCStore from ".";
import { CCComponentStore } from "./component";
import { CCConnectionStore } from "./connection";
import * as intrinsics from "./intrinsics/definitions";
import { CCNodeStore } from "./node";

export function createStoreFixture(): CCStore {
	const store = new CCStore();
	store.mount();

	const rootComponent = CCComponentStore.create({
		name: "Root",
	});
	store.components.register(rootComponent);

	const sampleNode1 = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: intrinsics.and.component.id,
		position: { x: -100, y: 0 },
	});
	store.nodes.register(sampleNode1);

	const sampleNode2 = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: intrinsics.not.component.id,
		position: { x: 100, y: 0 },
	});
	store.nodes.register(sampleNode2);

	const fromNodePin = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleNode1.id)
			.find(
				(nodePin) => nodePin.componentPinId === intrinsics.and.outputPin.id,
			),
	);
	const toNodePin = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleNode2.id)
			.find(
				(nodePin) => nodePin.componentPinId === intrinsics.not.inputPin.A.id,
			),
	);
	const sampleConnection = CCConnectionStore.create({
		parentComponentId: rootComponent.id,
		from: fromNodePin.id,
		to: toNodePin.id,
		bentPortion: 0.5,
	});
	store.connections.register(sampleConnection);

	return store;
}
