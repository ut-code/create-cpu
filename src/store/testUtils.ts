import { uniqBy } from "es-toolkit";
import { expect } from "vitest";
import type CCStore from ".";

export function expectConsistentStore(store: CCStore) {
	const nodes = store.nodes.getMany();
	for (const node of nodes) {
		expect(store.components.get(node.componentId)).toBeDefined();
		expect(store.components.get(node.parentComponentId)).toBeDefined();
	}

	const componentPins = store.componentPins.getMany();
	for (const componentPin of componentPins) {
		expect(store.componentPins.get(componentPin.id)).toBeDefined();
		expect(store.components.get(componentPin.componentId)).toBeDefined();
	}

	const nodePins = store.nodePins.getMany();
	for (const nodePin of nodePins) {
		expect(store.nodes.get(nodePin.nodeId)).toBeDefined();
		expect(store.componentPins.get(nodePin.componentPinId)).toBeDefined();
	}

	const connections = store.connections.getMany();
	for (const connection of store.connections.getMany()) {
		expect(store.nodePins.get(connection.from)).toBeDefined();
		expect(store.nodePins.get(connection.to)).toBeDefined();
	}
	// Ensure an input pin is only connected to one output pin
	expect(connections).toEqual(uniqBy(connections, (c) => c.to));
}
