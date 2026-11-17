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
import TransactionManager from "./transaction";

describe("TransactionManager", () => {
	it("keeps announcing removals after a listener throws during one", async () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		for (let i = 0; i < 2; i += 1) {
			connectTestNodePins(
				store,
				root.id,
				testNodePin(
					store,
					registerTestNode(store, root.id, true_.component.id),
					true_.outputPin.Out,
				),
				testNodePin(
					store,
					registerTestNode(store, root.id, not.component.id),
					not.inputPin.In,
				),
			);
		}
		const [first, second] = store.connections.getMany();
		const failure = new Error("listener failed");
		store.connections.on("willUnregister", (connection) => {
			if (connection.id === nullthrows(first).id) throw failure;
		});
		const announced: string[] = [];
		store.connections.on("didUnregister", (removed) =>
			announced.push(removed.id),
		);

		await expect(
			store.connections.unregister([nullthrows(first).id]),
		).rejects.toBe(failure);
		await store.connections.unregister([nullthrows(second).id]);

		expect(announced).toEqual([nullthrows(second).id]);
	});

	it("rejects only the transaction whose function threw, once the whole transaction ends", async () => {
		const transactionManager = new TransactionManager();
		const failure = new Error("inner failed");
		let inner: Promise<void> | undefined;
		let innerSettled = false;
		let innerSettledBeforeOuterEnded: boolean | undefined;

		const outer = transactionManager.runInTransaction(async () => {
			inner = transactionManager.runInTransaction(() => {
				throw failure;
			});
			const markSettled = () => {
				innerSettled = true;
			};
			inner.then(markSettled, markSettled);
			await new Promise((resolve) => setTimeout(resolve, 0));
			innerSettledBeforeOuterEnded = innerSettled;
		});

		await expect(outer).resolves.toBeUndefined();
		await expect(inner).rejects.toBe(failure);
		expect(innerSettledBeforeOuterEnded).toBe(false);
	});
});
