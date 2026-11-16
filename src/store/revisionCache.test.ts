import { describe, expect, it } from "vitest";
import { CCRevisionCache } from "./revisionCache";
import { createTestStore, registerTestComponent } from "./testUtils";

describe("CCRevisionCache", () => {
	it("computes a value once per revision of the store", () => {
		const store = createTestStore();
		const cache = new CCRevisionCache<string, { count: number }>(store);
		let count = 0;
		const compute = () => ({ count: ++count });

		const first = cache.get("a", compute);
		expect(cache.get("a", compute)).toBe(first);
		expect(cache.get("b", compute)).not.toBe(first);

		registerTestComponent(store, "Changed");

		expect(cache.get("a", compute)).toEqual({ count: 3 });
	});
});
