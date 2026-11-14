import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import { not, true_ } from "./intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestNode,
	testNodePin,
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
});
