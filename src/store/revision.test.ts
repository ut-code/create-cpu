import { describe, expect, it } from "vitest";
import { const_, not, true_ } from "./intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestNode,
	testBits,
	testNodePin,
} from "./testUtils";

describe("Store revision", () => {
	it("counts a removal as soon as it happens, before it is announced", async () => {
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
		let announced = false;
		store.connections.on("didUnregister", () => {
			announced = true;
		});
		const before = store.revision;

		const removal = store.nodes.unregister([sink.id]);

		expect(announced).toBe(false);
		expect(store.revision).toBeGreaterThan(before);
		await removal;
		expect(announced).toBe(true);
	});

	it("counts a config change but not a move of a node", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const node = registerTestNode(store, root.id, const_.component.id);
		const before = store.revision;

		store.nodes.update(node.id, { position: { x: 1, y: 2 } });
		expect(store.revision).toBe(before);

		store.nodes.update(node.id, {
			config: { mode: "binary", data: testBits(0, 4) },
		});
		expect(store.revision).toBeGreaterThan(before);
	});

	it("announces an update with the updated object", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const names: string[] = [];
		store.components.on("didUpdate", (component) => names.push(component.name));

		store.components.update(root.id, { name: "Renamed" });

		expect(names).toEqual(["Renamed"]);
	});
});
