import { describe, expect, it } from "vitest";
import { reuseIfSameItems } from "./snapshot";

describe("reuseIfSameItems", () => {
	it("hands out the previous list while it holds the same items", () => {
		const item = { id: "a" };
		const previous = [item, "b"];

		expect(reuseIfSameItems(previous, [item, "b"])).toBe(previous);
	});

	it("hands out the next list when an item is added, removed, replaced or moved", () => {
		const previous = ["a", "b"];
		for (const next of [["a", "b", "c"], ["a"], ["a", "c"], ["b", "a"]]) {
			expect(reuseIfSameItems(previous, next)).toBe(next);
		}
	});

	it("tells an updated object from the one it replaced", () => {
		// The stores replace an object on update, so a new object means a change
		const previous = [{ id: "a", name: "old" }];
		const next = [{ id: "a", name: "old" }];

		expect(reuseIfSameItems(previous, next)).toBe(next);
	});

	it("hands out the next list on the first read", () => {
		const next = ["a"];

		expect(reuseIfSameItems(null, next)).toBe(next);
	});
});
