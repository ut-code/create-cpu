import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import { extractNodesIntoNewComponent } from "./extractComponent";
import { aggregate, const_, not, true_ } from "./intrinsics/definitions";
import type { CCNodePinId } from "./nodePin";
import {
	connectTestNodePins,
	createTestStore,
	expectConsistentStore,
	registerTestComponent,
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
	it("moves the connections between the nodes and drops the ones to the rest of the circuit", async () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const source = registerTestNode(store, root.id, true_.component.id);
		const inverter = registerTestNode(store, root.id, not.component.id);
		const outsider = registerTestNode(store, root.id, not.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, source, true_.outputPin.Out),
			testNodePin(store, inverter, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, inverter, not.outputPin.Out),
			testNodePin(store, outsider, not.inputPin.In),
		);

		const extracted = await extractNodesIntoNewComponent(
			store,
			[source.id, inverter.id],
			"Extracted",
		);

		expect(store.nodes.getManyByParentComponentId(extracted.id)).toHaveLength(
			2,
		);
		expect(describeConnections(store, extracted.id)).toEqual([
			"True.Out#0:null -> Not.In#0:null",
		]);
		expect(
			store.nodes.getManyByParentComponentId(root.id).map((node) => node.id),
		).toEqual([outsider.id]);
		expect(store.connections.getManyByParentComponentId(root.id)).toEqual([]);
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
