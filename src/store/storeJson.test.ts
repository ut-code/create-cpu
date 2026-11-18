import { describe, expect, it } from "vitest";
import { CCStoreJsonError, parseStoreJson } from ".";
import { createTestStore, registerTestComponent } from "./testUtils";

describe("parseStoreJson", () => {
	it("reads back a store it exported", () => {
		const store = createTestStore();
		const component = registerTestComponent(store, "Adder");

		const json = parseStoreJson(store.toJSON());

		expect(json.components.map(({ id }) => id)).toEqual([component.id]);
	});

	it("refuses text that is not an exported store", () => {
		for (const text of ["not json", "null", "[]", '{"components": []}']) {
			expect(() => parseStoreJson(text)).toThrow(CCStoreJsonError);
		}
	});
});
