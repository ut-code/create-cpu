import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Vector2 } from "../common/vector2";
import type CCStore from ".";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "./component";
import type { CCComponentPinId } from "./componentPin";
import { type CCConnection, CCConnectionStore } from "./connection";
import { input, output } from "./intrinsics/definitions";
import { type CCNode, type CCNodeId, CCNodeStore } from "./node";
import { type CCNodePinId, CCNodePinStore } from "./nodePin";

const interfaceNodeOffsetX = 200;
const interfaceNodeGapY = 50;

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
	const oldToNewNodePinIds = copyNodes(store, oldNodes, newComponent.id);
	const isMoved = (nodePinId: CCNodePinId) => oldToNewNodePinIds.has(nodePinId);
	const movedPin = (nodePinId: CCNodePinId) =>
		nullthrows(oldToNewNodePinIds.get(nodePinId));
	const nodeYOf = (nodePinId: CCNodePinId) =>
		nullthrows(
			store.nodes.get(nullthrows(store.nodePins.get(nodePinId)).nodeId),
		).position.y;

	const parentConnections =
		store.connections.getManyByParentComponentId(parentComponentId);
	for (const connection of parentConnections) {
		if (isMoved(connection.from) && isMoved(connection.to))
			connect(
				store,
				newComponent.id,
				movedPin(connection.from),
				movedPin(connection.to),
				connection,
			);
	}

	// An outside pin feeding several moved pins becomes a single pin of the new component
	const incoming = sortedGroups(
		parentConnections.filter((c) => !isMoved(c.from) && isMoved(c.to)),
		(connections) => nodeYOf(nullthrows(connections[0]).to),
	);
	const outgoing = sortedGroups(
		parentConnections.filter((c) => isMoved(c.from) && !isMoved(c.to)),
		(connections) => nodeYOf(nullthrows(connections[0]).from),
	);

	const bounds = boundsOf(oldNodes.map((node) => node.position));
	const exposedIncoming = incoming.map((connections, index) => {
		const inputPinId = registerInterfaceNode(store, newComponent.id, input, {
			x: bounds.min.x - interfaceNodeOffsetX,
			y: spreadY(bounds, index, incoming.length),
		});
		for (const connection of connections)
			connect(
				store,
				newComponent.id,
				inputPinId,
				movedPin(connection.to),
				connection,
			);
		return { connections, componentPinId: exposedPinOf(store, inputPinId) };
	});
	const exposedOutgoing = outgoing.map((connections, index) => {
		const outputPinId = registerInterfaceNode(store, newComponent.id, output, {
			x: bounds.max.x + interfaceNodeOffsetX,
			y: spreadY(bounds, index, outgoing.length),
		});
		const [first] = connections;
		invariant(first);
		connect(store, newComponent.id, movedPin(first.from), outputPinId, first);
		return { connections, componentPinId: exposedPinOf(store, outputPinId) };
	});

	// An outside input pin takes a new connection only once its old one is removed
	await store.nodes.unregister(nodeIds);

	const replacement = CCNodeStore.create({
		parentComponentId,
		componentId: newComponent.id,
		position: {
			x: (bounds.min.x + bounds.max.x) / 2,
			y: (bounds.min.y + bounds.max.y) / 2,
		},
	});
	store.nodes.register(replacement);
	const replacementPinOf = (componentPinId: CCComponentPinId) =>
		nullthrows(
			store.nodePins.getManyByNodeIdAndComponentPinId(
				replacement.id,
				componentPinId,
			)[0],
		).id;
	for (const { connections, componentPinId } of exposedIncoming) {
		const [first] = connections;
		invariant(first);
		connect(
			store,
			parentComponentId,
			first.from,
			replacementPinOf(componentPinId),
			first,
		);
	}
	for (const { connections, componentPinId } of exposedOutgoing) {
		for (const connection of connections)
			connect(
				store,
				parentComponentId,
				replacementPinOf(componentPinId),
				connection.to,
				connection,
			);
	}
	return newComponent;
}

function copyNodes(
	store: CCStore,
	oldNodes: CCNode[],
	parentComponentId: CCComponentId,
): Map<CCNodePinId, CCNodePinId> {
	const oldToNewNodePinIds = new Map<CCNodePinId, CCNodePinId>();
	for (const oldNode of oldNodes) {
		const newNode = CCNodeStore.create({
			parentComponentId,
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
	return oldToNewNodePinIds;
}

// Keep a conflicting connection, since the original is removed
function connect(
	store: CCStore,
	parentComponentId: CCComponentId,
	from: CCNodePinId,
	to: CCNodePinId,
	original: CCConnection,
): void {
	store.connections.register(
		CCConnectionStore.create({
			parentComponentId,
			from,
			to,
			bentPortion: original.bentPortion,
		}),
		{ allowBitWidthConflict: true },
	);
}

function sortedGroups(
	connections: CCConnection[],
	sortKey: (group: CCConnection[]) => number,
): CCConnection[][] {
	return [...Map.groupBy(connections, (c) => c.from).values()].toSorted(
		(a, b) => sortKey(a) - sortKey(b),
	);
}

function registerInterfaceNode(
	store: CCStore,
	parentComponentId: CCComponentId,
	definition: typeof input | typeof output,
	position: Vector2,
): CCNodePinId {
	const node = CCNodeStore.create({
		parentComponentId,
		componentId: definition.component.id,
		position,
	});
	store.nodes.register(node);
	return nullthrows(store.nodePins.getManyByNodeId(node.id)[0]).id;
}

function exposedPinOf(store: CCStore, nodePinId: CCNodePinId) {
	return nullthrows(store.componentPins.getByImplementation(nodePinId)).id;
}

function boundsOf(positions: Vector2[]) {
	const xs = positions.map((position) => position.x);
	const ys = positions.map((position) => position.y);
	return {
		min: { x: Math.min(...xs), y: Math.min(...ys) },
		max: { x: Math.max(...xs), y: Math.max(...ys) },
	};
}

function spreadY(
	bounds: ReturnType<typeof boundsOf>,
	index: number,
	count: number,
): number {
	return (
		(bounds.min.y + bounds.max.y) / 2 +
		(index - (count - 1) / 2) * interfaceNodeGapY
	);
}
