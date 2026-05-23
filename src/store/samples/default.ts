import nullthrows from "nullthrows";
import type CCStore from "..";
import { CCComponentStore } from "../component";
import { CCConnectionStore } from "../connection";
import { and, input, not, output } from "../intrinsics/definitions";
import { CCNodeStore } from "../node";

export function setupDefaultSample(store: CCStore) {
	const rootComponent = CCComponentStore.create({
		name: "Root",
	});
	store.components.register(rootComponent);

	const sampleAndNode = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: and.component.id,
		position: { x: -100, y: 0 },
	});
	store.nodes.register(sampleAndNode);

	const sampleNotNode = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: not.component.id,
		position: { x: 100, y: 0 },
	});
	store.nodes.register(sampleNotNode);

	const sampleInputNode1 = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: input.component.id,
		position: { x: -300, y: -100 },
	});
	store.nodes.register(sampleInputNode1);

	const sampleInputNode2 = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: input.component.id,
		position: { x: -300, y: 100 },
	});
	store.nodes.register(sampleInputNode2);

	const sampleOutputNode = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: output.component.id,
		position: { x: 300, y: 0 },
	});
	store.nodes.register(sampleOutputNode);

	const fromPinOfSampleInputNode1 = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleInputNode1.id)
			.find((nodePin) => nodePin.componentPinId === input.outputPin.Out.id),
	);
	const toPinOfSampleAndNode1 = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleAndNode.id)
			.find((nodePin) => nodePin.componentPinId === and.inputPin.A.id),
	);
	const connection1 = CCConnectionStore.create({
		parentComponentId: rootComponent.id,
		from: fromPinOfSampleInputNode1.id,
		to: toPinOfSampleAndNode1.id,
		bentPortion: 0.5,
	});
	store.connections.register(connection1);

	const fromPinOfSampleInputNode2 = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleInputNode2.id)
			.find((nodePin) => nodePin.componentPinId === input.outputPin.Out.id),
	);
	const toPinOfSampleAndNode2 = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleAndNode.id)
			.find((nodePin) => nodePin.componentPinId === and.inputPin.B.id),
	);
	const connection2 = CCConnectionStore.create({
		parentComponentId: rootComponent.id,
		from: fromPinOfSampleInputNode2.id,
		to: toPinOfSampleAndNode2.id,
		bentPortion: 0.5,
	});
	store.connections.register(connection2);

	const fromPinOfSampleAndNode = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleAndNode.id)
			.find((nodePin) => nodePin.componentPinId === and.outputPin.Out.id),
	);
	const toPinOfSampleNotNode = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleNotNode.id)
			.find((nodePin) => nodePin.componentPinId === not.inputPin.In.id),
	);
	const connection3 = CCConnectionStore.create({
		parentComponentId: rootComponent.id,
		from: fromPinOfSampleAndNode.id,
		to: toPinOfSampleNotNode.id,
		bentPortion: 0.5,
	});
	store.connections.register(connection3);

	const fromPinOfSampleNotNode = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleNotNode.id)
			.find((nodePin) => nodePin.componentPinId === not.outputPin.Out.id),
	);
	const toPinOfSampleOutputNode = nullthrows(
		store.nodePins
			.getManyByNodeId(sampleOutputNode.id)
			.find((nodePin) => nodePin.componentPinId === output.inputPin.In.id),
	);
	const connection4 = CCConnectionStore.create({
		parentComponentId: rootComponent.id,
		from: fromPinOfSampleNotNode.id,
		to: toPinOfSampleOutputNode.id,
		bentPortion: 0.5,
	});
	store.connections.register(connection4);
}
