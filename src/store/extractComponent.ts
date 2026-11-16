import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type CCStore from ".";
import { type CCComponent, CCComponentStore } from "./component";
import { CCConnectionStore } from "./connection";
import { type CCNodeId, CCNodeStore } from "./node";
import { type CCNodePinId, CCNodePinStore } from "./nodePin";

export async function extractNodesIntoNewComponent(
	store: CCStore,
	nodeIds: CCNodeId[],
	name: string,
): Promise<CCComponent> {
	const oldNodes = nodeIds.map((nodeId) => nullthrows(store.nodes.get(nodeId)));
	const [firstNode] = oldNodes;
	invariant(firstNode, "no nodes to extract");
	const parentComponentId = firstNode.parentComponentId;
	invariant(
		oldNodes.every((node) => node.parentComponentId === parentComponentId),
		"the nodes to extract belong to different components",
	);

	const newComponent = CCComponentStore.create({ name });
	store.components.register(newComponent);

	const oldToNewNodePinIds = new Map<CCNodePinId, CCNodePinId>();
	for (const oldNode of oldNodes) {
		const newNode = CCNodeStore.create({
			parentComponentId: newComponent.id,
			position: oldNode.position,
			componentId: oldNode.componentId,
		});
		newNode.config = oldNode.config;
		store.nodes.register(newNode);

		for (const oldNodePin of store.nodePins.getManyByNodeId(oldNode.id)) {
			// Registering a node creates only the first pin of a split pin
			const registeredNodePin = store.nodePins
				.getManyByNodeIdAndComponentPinId(newNode.id, oldNodePin.componentPinId)
				.find((nodePin) => nodePin.order === oldNodePin.order);
			let newNodePinId: CCNodePinId;
			if (registeredNodePin) {
				newNodePinId = registeredNodePin.id;
				store.nodePins.update(newNodePinId, {
					manualBitWidth: oldNodePin.manualBitWidth,
				});
			} else {
				const newNodePin = CCNodePinStore.create({
					nodeId: newNode.id,
					componentPinId: oldNodePin.componentPinId,
					order: oldNodePin.order,
					manualBitWidth: oldNodePin.manualBitWidth,
				});
				store.nodePins.register(newNodePin);
				newNodePinId = newNodePin.id;
			}
			oldToNewNodePinIds.set(oldNodePin.id, newNodePinId);

			const oldExposedPin = store.componentPins.getByImplementation(
				oldNodePin.id,
			);
			const newExposedPin =
				store.componentPins.getByImplementation(newNodePinId);
			if (oldExposedPin && newExposedPin)
				store.componentPins.update(newExposedPin.id, {
					name: oldExposedPin.name,
				});
		}
	}

	const oldConnections = store.connections
		.getManyByParentComponentId(parentComponentId)
		.filter(
			(connection) =>
				oldToNewNodePinIds.has(connection.from) &&
				oldToNewNodePinIds.has(connection.to),
		);
	for (const oldConnection of oldConnections) {
		// Keep a conflicting connection, since the original is removed
		store.connections.register(
			CCConnectionStore.create({
				parentComponentId: newComponent.id,
				from: nullthrows(oldToNewNodePinIds.get(oldConnection.from)),
				to: nullthrows(oldToNewNodePinIds.get(oldConnection.to)),
				bentPortion: oldConnection.bentPortion,
			}),
			{ allowBitWidthConflict: true },
		);
	}

	await store.nodes.unregister(nodeIds);
	return newComponent;
}
