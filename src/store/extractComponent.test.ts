import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import { extractNodesIntoNewComponent } from "./extractComponent";
import { aggregate, and, const_, or } from "./intrinsics/definitions";
import type { CCNodePinId } from "./nodePin";
import simulateComponent from "./simulation";
import {
	connectTestNodePins,
	createTestStore,
	expectConsistentStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	registerTestOutputNode,
	splitTestNodePin,
	testBits,
	testNodePin,
} from "./testUtils";

function describeConnections(store: CCStore, componentId: CCComponentId) {
	const describePin = (nodePinId: CCNodePinId) => {
		const nodePin = nullthrows(store.nodePins.get(nodePinId));
		const node = nullthrows(store.nodes.get(nodePin.nodeId));
		const component = nullthrows(store.components.get(node.componentId));
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		return `${component.name}.${componentPin.name}#${nodePin.order}:${nodePin.manualBitWidth}`;
	};
	return store.connections
		.getManyByParentComponentId(componentId)
		.map(
			(connection) =>
				`${describePin(connection.from)} -> ${describePin(connection.to)}`,
		)
		.toSorted();
}

describe("extractNodesIntoNewComponent", () => {
	it("puts a node of the new component in place of the moved nodes, wired to the rest of the circuit", async () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const a = registerTestInputNode(store, root.id, "A");
		const b = registerTestInputNode(store, root.id, "B");
		const andNode = registerTestNode(store, root.id, and.component.id);
		const orNode = registerTestNode(store, root.id, or.component.id);
		const x = registerTestOutputNode(store, root.id, "X");
		const y = registerTestOutputNode(store, root.id, "Y");
		const z = registerTestOutputNode(store, root.id, "Z");
		for (const [from, to] of [
			[a.out, testNodePin(store, andNode, and.inputPin.A)],
			[a.out, testNodePin(store, orNode, or.inputPin.A)],
			[b.out, testNodePin(store, andNode, and.inputPin.B)],
			[b.out, testNodePin(store, orNode, or.inputPin.B)],
			[testNodePin(store, andNode, and.outputPin.Out), x.in],
			[testNodePin(store, orNode, or.outputPin.Out), y.in],
			[testNodePin(store, orNode, or.outputPin.Out), z.in],
		] as const)
			connectTestNodePins(store, root.id, from, to);

		const extracted = await extractNodesIntoNewComponent(
			store,
			[andNode.id, orNode.id],
			"Extracted",
		);

		expect(
			store.componentPins
				.getManyByComponentId(extracted.id)
				.map((pin) => pin.type)
				.toSorted(),
		).toEqual(["input", "input", "output", "output"]);
		expect(
			store.nodes
				.getManyByParentComponentId(root.id)
				.filter((node) => node.componentId === extracted.id),
		).toHaveLength(1);
		for (const [left, right] of [
			[false, false],
			[false, true],
			[true, false],
			[true, true],
		] as const) {
			const frame = simulateComponent(
				store,
				root.id,
				new Map([
					[a.componentPinId, [left]],
					[b.componentPinId, [right]],
				]),
			);
			expect(
				[x.in, y.in, z.in].map((pin) => frame.getNodePinValue(pin)),
			).toEqual([[left && right], [left || right], [left || right]]);
		}
		expectConsistentStore(store);
	});

	it("keeps the configs, the split pins and the names of the exposed pins", async () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const high = registerTestNode(store, root.id, const_.component.id, {
			mode: "binary",
			data: testBits(0b1010, 4),
		});
		const low = registerTestNode(store, root.id, const_.component.id, {
			mode: "binary",
			data: testBits(0b0101, 4),
		});
		const aggregateNode = registerTestNode(
			store,
			root.id,
			aggregate.component.id,
		);
		splitTestNodePin(store, aggregateNode, aggregate.inputPin.In, [4, 4]);
		const result = registerTestOutputNode(store, root.id, "Y");
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, high, const_.outputPin.Out),
			testNodePin(store, aggregateNode, aggregate.inputPin.In, 0),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, low, const_.outputPin.Out),
			testNodePin(store, aggregateNode, aggregate.inputPin.In, 1),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, aggregateNode, aggregate.outputPin.Out),
			result.in,
		);
		const connectionsBefore = describeConnections(store, root.id);

		const extracted = await extractNodesIntoNewComponent(
			store,
			[high.id, low.id, aggregateNode.id, result.node.id],
			"Extracted",
		);

		expect(describeConnections(store, extracted.id)).toEqual(connectionsBefore);
		expect(
			store.nodes
				.getManyByParentComponentId(extracted.id)
				.filter((node) => node.componentId === const_.component.id)
				.map((node) => node.config),
		).toEqual([high.config, low.config]);
		expect(
			store.componentPins
				.getManyByComponentId(extracted.id)
				.map((pin) => pin.name),
		).toEqual(["Y"]);
		expect(store.componentPins.getManyByComponentId(root.id)).toEqual([]);
		expectConsistentStore(store);
	});
});
