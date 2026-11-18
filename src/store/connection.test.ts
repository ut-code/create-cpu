import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import { not, true_ } from "./intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestNode,
	testNodePin,
	tryConnectTestNodePins,
} from "./testUtils";

describe("Connection store", () => {
	it("announces the removal of a connection when its transaction ends, like the other stores", async () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const source = registerTestNode(store, root.id, true_.component.id);
		const sink = registerTestNode(store, root.id, not.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, source, true_.outputPin.Out),
			testNodePin(store, sink, not.inputPin.In),
		);
		const connection = nullthrows(store.connections.getMany()[0]);
		const announced: string[] = [];
		store.connections.on("didUnregister", (removed) =>
			announced.push(removed.id),
		);

		const removal = store.connections.unregister([connection.id]);

		expect(store.connections.get(connection.id)).toBeUndefined();
		expect(announced).toEqual([]);
		await removal;
		expect(announced).toEqual([connection.id]);
	});

	describe("rejects a connection and tells why", () => {
		it("accepts pins that can be connected", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const source = registerTestNode(store, root.id, true_.component.id);
			const sink = registerTestNode(store, root.id, not.component.id);

			expect(
				tryConnectTestNodePins(
					store,
					root.id,
					testNodePin(store, source, true_.outputPin.Out),
					testNodePin(store, sink, not.inputPin.In),
				),
			).toEqual({ rejection: null, isRegistered: true });
		});

		it("between two output pins", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const first = registerTestNode(store, root.id, true_.component.id);
			const second = registerTestNode(store, root.id, true_.component.id);

			expect(
				tryConnectTestNodePins(
					store,
					root.id,
					testNodePin(store, first, true_.outputPin.Out),
					testNodePin(store, second, true_.outputPin.Out),
				),
			).toEqual({
				rejection: { type: "sameDirection" },
				isRegistered: false,
			});
		});

		it("between the pins of one node", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const node = registerTestNode(store, root.id, not.component.id);

			expect(
				tryConnectTestNodePins(
					store,
					root.id,
					testNodePin(store, node, not.outputPin.Out),
					testNodePin(store, node, not.inputPin.In),
				),
			).toEqual({ rejection: { type: "sameNode" }, isRegistered: false });
		});

		it("between nodes of different components", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const other = registerTestComponent(store, "Other");
			const source = registerTestNode(store, root.id, true_.component.id);
			const sink = registerTestNode(store, other.id, not.component.id);

			expect(
				tryConnectTestNodePins(
					store,
					root.id,
					testNodePin(store, source, true_.outputPin.Out),
					testNodePin(store, sink, not.inputPin.In),
				),
			).toEqual({
				rejection: { type: "differentParentComponent" },
				isRegistered: false,
			});
		});

		it("to an input pin that is connected already", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const first = registerTestNode(store, root.id, true_.component.id);
			const second = registerTestNode(store, root.id, true_.component.id);
			const sink = registerTestNode(store, root.id, not.component.id);
			const sinkIn = testNodePin(store, sink, not.inputPin.In);
			connectTestNodePins(
				store,
				root.id,
				testNodePin(store, first, true_.outputPin.Out),
				sinkIn,
			);

			expect(
				tryConnectTestNodePins(
					store,
					root.id,
					sinkIn,
					testNodePin(store, second, true_.outputPin.Out),
				),
			).toEqual({
				rejection: { type: "inputAlreadyConnected" },
				isRegistered: false,
			});
			expect(store.connections.getConnectionsByNodePinId(sinkIn)).toHaveLength(
				1,
			);
		});

		it("to an input pin that is connected already, even when keeping bit width conflicts", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const first = registerTestNode(store, root.id, true_.component.id);
			const second = registerTestNode(store, root.id, true_.component.id);
			const sink = registerTestNode(store, root.id, not.component.id);
			const sinkIn = testNodePin(store, sink, not.inputPin.In);
			connectTestNodePins(
				store,
				root.id,
				testNodePin(store, first, true_.outputPin.Out),
				sinkIn,
			);

			expect(
				tryConnectTestNodePins(
					store,
					root.id,
					testNodePin(store, second, true_.outputPin.Out),
					sinkIn,
					{ allowBitWidthConflict: true },
				),
			).toEqual({
				rejection: { type: "inputAlreadyConnected" },
				isRegistered: false,
			});
		});
	});
});
