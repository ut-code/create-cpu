import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import CCStore from ".";
import { CCConnectionStore } from "./connection";
import {
	aggregate,
	const_,
	decompose,
	display,
	not,
} from "./intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	registerTestOutputNode,
	splitTestNodePin,
	testBits,
	testComponentPin,
	testNodePin,
} from "./testUtils";

/** Aggregate (split into 2 + 2 bits) -> Decompose (split into 2 + 2 bits) */
function registerAggregateToDecompose(store: CCStore) {
	const root = registerTestComponent(store, "Root");
	const aggregateNode = registerTestNode(
		store,
		root.id,
		aggregate.component.id,
	);
	splitTestNodePin(store, aggregateNode, aggregate.inputPin.In, [2, 2]);
	const decomposeNode = registerTestNode(
		store,
		root.id,
		decompose.component.id,
	);
	splitTestNodePin(store, decomposeNode, decompose.outputPin.Out, [2, 2]);
	connectTestNodePins(
		store,
		root.id,
		testNodePin(store, aggregateNode, aggregate.outputPin.Out),
		testNodePin(store, decomposeNode, decompose.inputPin.In),
	);
	expect(store.connections.getMany()).toHaveLength(1);
	return {
		aggregateIn: (index: number) =>
			testNodePin(store, aggregateNode, aggregate.inputPin.In, index),
	};
}

describe("Connection store", () => {
	describe("bit width revalidation", () => {
		it("drops a connection that a resized split pin makes inconsistent elsewhere", () => {
			const store = createTestStore();
			const { aggregateIn } = registerAggregateToDecompose(store);

			// The output of the aggregate grows to 5 bits, while the decompose takes 4
			store.nodePins.update(aggregateIn(1), { manualBitWidth: 3 });

			expect(store.connections.getMany()).toHaveLength(0);
		});

		it("keeps a connection that is inconsistent only in the middle of a batch", () => {
			const store = createTestStore();
			const { aggregateIn } = registerAggregateToDecompose(store);

			// 2 + 2 -> 3 + 2 -> 3 + 1: the total is 4 bits again in the end
			store.connections.batchBitWidthChanges(() => {
				store.nodePins.update(aggregateIn(0), { manualBitWidth: 3 });
				store.nodePins.update(aggregateIn(1), { manualBitWidth: 1 });
			});

			expect(store.connections.getMany()).toHaveLength(1);
		});

		it("drops a connection that removing a split pin in a batch makes inconsistent", () => {
			const store = createTestStore();
			const { aggregateIn } = registerAggregateToDecompose(store);

			// 2 + 2 -> 2: the bit widths computed before the removal must not be used
			store.connections.batchBitWidthChanges(() => {
				store.nodePins.unregister(aggregateIn(1));
			});

			expect(store.connections.getMany()).toHaveLength(0);
		});

		it("announces a dropped connection before the change dropping it is announced", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const constant = registerTestNode(store, root.id, const_.component.id, {
				mode: "binary",
				data: testBits(0, 4),
			});
			const displayNode = registerTestNode(
				store,
				root.id,
				display.component.id,
				{ resolution: { x: 2, y: 2 } },
			);
			connectTestNodePins(
				store,
				root.id,
				testNodePin(store, constant, const_.outputPin.Out),
				testNodePin(store, displayNode, display.inputPin.Pixels),
			);
			const events: string[] = [];
			store.connections.on("didUnregister", () =>
				events.push("connection removed"),
			);
			store.nodes.on("didUpdate", () => events.push("node updated"));

			// A renderer subscribed to the display re-renders on "node updated", so by then
			// the list of connections must no longer contain the dropped one
			store.nodes.update(displayNode.id, {
				config: { resolution: { x: 1, y: 2 } },
			});

			expect(events).toEqual(["connection removed", "node updated"]);
		});

		it("drops a connection in a component using one whose constant grew", () => {
			const store = createTestStore();
			const source = registerTestComponent(store, "Source");
			const constant = registerTestNode(store, source.id, const_.component.id, {
				mode: "binary",
				data: testBits(0, 4),
			});
			const out = registerTestOutputNode(store, source.id, "Out");
			connectTestNodePins(
				store,
				source.id,
				testNodePin(store, constant, const_.outputPin.Out),
				out.in,
			);
			const root = registerTestComponent(store, "Root");
			const sourceNode = registerTestNode(store, root.id, source.id);
			const displayNode = registerTestNode(
				store,
				root.id,
				display.component.id,
				{ resolution: { x: 2, y: 2 } },
			);
			connectTestNodePins(
				store,
				root.id,
				testNodePin(store, sourceNode, testComponentPin(store, source, "Out")),
				testNodePin(store, displayNode, display.inputPin.Pixels),
			);

			store.nodes.update(constant.id, {
				config: { mode: "binary", data: testBits(0, 6) },
			});

			expect(store.connections.getManyByParentComponentId(root.id)).toEqual([]);
			expect(
				store.connections.getManyByParentComponentId(source.id),
			).toHaveLength(1);
		});

		it("drops a connection in a component using one that a new connection fixed", () => {
			const store = createTestStore();
			const inner = registerTestComponent(store, "Inner");
			const notNode = registerTestNode(store, inner.id, not.component.id);
			const out = registerTestOutputNode(store, inner.id, "Out");
			connectTestNodePins(
				store,
				inner.id,
				testNodePin(store, notNode, not.outputPin.Out),
				out.in,
			);
			const root = registerTestComponent(store, "Root");
			const innerNode = registerTestNode(store, root.id, inner.id);
			const displayNode = registerTestNode(
				store,
				root.id,
				display.component.id,
				{ resolution: { x: 2, y: 2 } },
			);
			// The output of Inner is not fixed yet, so it adapts to the 4 pixels
			connectTestNodePins(
				store,
				root.id,
				testNodePin(store, innerNode, testComponentPin(store, inner, "Out")),
				testNodePin(store, displayNode, display.inputPin.Pixels),
			);

			const constant = registerTestNode(store, inner.id, const_.component.id, {
				mode: "binary",
				data: testBits(0, 2),
			});
			connectTestNodePins(
				store,
				inner.id,
				testNodePin(store, constant, const_.outputPin.Out),
				testNodePin(store, notNode, not.inputPin.In),
			);

			expect(store.connections.getManyByParentComponentId(root.id)).toEqual([]);
		});

		it("leaves a connection that stays consistent as it is", () => {
			const store = createTestStore();
			const inner = registerTestComponent(store, "Inner");
			const into = registerTestInputNode(store, inner.id, "In");
			const notNode = registerTestNode(store, inner.id, not.component.id);
			connectTestNodePins(
				store,
				inner.id,
				into.out,
				testNodePin(store, notNode, not.inputPin.In),
			);
			const root = registerTestComponent(store, "Root");
			const constant = registerTestNode(store, root.id, const_.component.id, {
				mode: "binary",
				data: testBits(0, 4),
			});
			const innerNode = registerTestNode(store, root.id, inner.id);
			const connection = CCConnectionStore.create({
				parentComponentId: root.id,
				from: testNodePin(store, constant, const_.outputPin.Out),
				to: testNodePin(store, innerNode, testComponentPin(store, inner, "In")),
				bentPortion: 0.3,
			});
			store.connections.register(connection);

			// A change inside Inner that keeps the connection to it valid
			const out = registerTestOutputNode(store, inner.id, "Out");
			connectTestNodePins(
				store,
				inner.id,
				testNodePin(store, notNode, not.outputPin.Out),
				out.in,
			);

			expect(store.connections.getManyByParentComponentId(root.id)).toEqual([
				connection,
			]);
		});

		it("drops the connections of a restored circuit that are already inconsistent", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const constant = registerTestNode(store, root.id, const_.component.id, {
				mode: "binary",
				data: testBits(0, 4),
			});
			const displayNode = registerTestNode(
				store,
				root.id,
				display.component.id,
				{ resolution: { x: 2, y: 2 } },
			);
			connectTestNodePins(
				store,
				root.id,
				testNodePin(store, constant, const_.outputPin.Out),
				testNodePin(store, displayNode, display.inputPin.Pixels),
			);
			// Saved by a version that did not drop the connection when the display grew
			const saved = JSON.parse(store.toJSON());
			nullthrows(
				saved.nodes.find((node: { id: string }) => node.id === displayNode.id),
			).config = { resolution: { x: 3, y: 3 } };

			const restored = new CCStore();
			restored.importJson(JSON.stringify(saved));
			expect(restored.connections.getMany()).toHaveLength(1);
			restored.mount();

			expect(restored.connections.getMany()).toHaveLength(0);
		});
	});
});
