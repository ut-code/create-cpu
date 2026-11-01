import { uniqBy } from "es-toolkit";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import { expect } from "vitest";
import CCStore from ".";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "./component";
import type { CCComponentPin } from "./componentPin";
import { CCConnectionStore } from "./connection";
import { input, output } from "./intrinsics/definitions";
import { type CCNode, CCNodeStore } from "./node";
import { type CCNodePinId, CCNodePinStore } from "./nodePin";
import type { SimulationValue } from "./simulation";

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

/**
 * Builders for the circuits used in tests. They go through the same stores the editor
 * uses, so a circuit built with them behaves like one drawn by hand.
 */

/** A store with the intrinsic components registered and the stores mounted. */
export function createTestStore(): CCStore {
	const store = new CCStore();
	store.mount();
	return store;
}

let nextTestPosition = 0;
function testPosition() {
	nextTestPosition += 1;
	return { x: nextTestPosition * 150, y: 0 };
}

export function registerTestComponent(
	store: CCStore,
	name: string,
): CCComponent {
	const component = CCComponentStore.create({ name });
	store.components.register(component);
	return component;
}

/**
 * Add a node of `componentId` to `parentComponentId`. Mounting the store takes care of
 * the node pins and, for `Input` and `Output` nodes, of the pin of the parent component.
 */
export function registerTestNode(
	store: CCStore,
	parentComponentId: CCComponentId,
	componentId: CCComponentId,
	config?: CCNode["config"],
): CCNode {
	const node = CCNodeStore.create({
		parentComponentId,
		componentId,
		position: testPosition(),
	});
	if (config !== undefined) node.config = config;
	store.nodes.register(node);
	return node;
}

/** The pin of `node` instantiating `componentPin` (the `index`-th one if it is split). */
export function testNodePin(
	store: CCStore,
	node: CCNode,
	componentPin: CCComponentPin,
	index = 0,
): CCNodePinId {
	const nodePins = store.nodePins
		.getManyByNodeIdAndComponentPinId(node.id, componentPin.id)
		.toSorted((a, b) => a.order - b.order);
	return nullthrows(nodePins[index], "node pin not found").id;
}

/** Split a configurable pin of `node` into pins of the given bit widths. */
export function splitTestNodePin(
	store: CCStore,
	node: CCNode,
	componentPin: CCComponentPin,
	widths: number[],
): void {
	const existing = store.nodePins.getManyByNodeIdAndComponentPinId(
		node.id,
		componentPin.id,
	);
	invariant(existing.length === 1 && existing[0]);
	store.nodePins.update(existing[0].id, {
		manualBitWidth: nullthrows(widths[0]),
	});
	for (let i = 1; i < widths.length; i += 1) {
		store.nodePins.register(
			CCNodePinStore.create({
				nodeId: node.id,
				componentPinId: componentPin.id,
				order: i,
				manualBitWidth: nullthrows(widths[i]),
			}),
		);
	}
}

export function connectTestNodePins(
	store: CCStore,
	parentComponentId: CCComponentId,
	from: CCNodePinId,
	to: CCNodePinId,
): void {
	const connection = CCConnectionStore.create({
		from,
		to,
		parentComponentId,
		bentPortion: 0.5,
	});
	store.connections.register(connection);
	invariant(
		store.connections.get(connection.id),
		"the store rejected the connection",
	);
}

/** Add an `Input` node, which exposes an input pin on the component it is added to. */
export function registerTestInputNode(
	store: CCStore,
	parentComponentId: CCComponentId,
	name: string,
) {
	const node = registerTestNode(store, parentComponentId, input.component.id);
	const out = testNodePin(store, node, input.outputPin.Out);
	const componentPin = nullthrows(store.componentPins.getByImplementation(out));
	store.componentPins.update(componentPin.id, { name });
	return { node, out, componentPinId: componentPin.id };
}

/** Add an `Output` node, which exposes an output pin on the component it is added to. */
export function registerTestOutputNode(
	store: CCStore,
	parentComponentId: CCComponentId,
	name: string,
) {
	const node = registerTestNode(store, parentComponentId, output.component.id);
	const into = testNodePin(store, node, output.inputPin.In);
	const componentPin = nullthrows(
		store.componentPins.getByImplementation(into),
	);
	store.componentPins.update(componentPin.id, { name });
	return { node, in: into, componentPinId: componentPin.id };
}

/** The pin named `name` of a user-defined component. */
export function testComponentPin(
	store: CCStore,
	component: CCComponent,
	name: string,
): CCComponentPin {
	return nullthrows(
		store.componentPins
			.getManyByComponentId(component.id)
			.find((pin) => pin.name === name),
		`Component ${component.name} has no pin named ${name}`,
	);
}

/** MSB-first bit array of `value` in `width` bits. */
export function testBits(value: number, width: number): SimulationValue {
	return Array.from(
		{ length: width },
		(_, i) => ((value >> (width - 1 - i)) & 1) === 1,
	);
}

/** Decimal reading of an MSB-first bit array. */
export function testNumber(value: SimulationValue | undefined): number | null {
	if (!value) return null;
	return Number.parseInt(value.map((bit) => (bit ? "1" : "0")).join(""), 2);
}
