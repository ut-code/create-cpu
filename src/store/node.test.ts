import nullthrows from "nullthrows";
import { describe, it } from "vitest";
import { createStoreFixture } from "./fixtures";
import { expectConsistentStore } from "./testUtils";

describe("Node store", () => {
	it("should delete nodes correctly", () => {
		const store = createStoreFixture();
		store.nodes.unregister([nullthrows(store.nodes.getMany()[0]).id]);
		expectConsistentStore(store);
	});
});
