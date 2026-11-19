import { describe, expect, it } from "vitest";
import type { CCComponentId } from "../../store/component";
import { and } from "../../store/intrinsics/definitions";
import {
	createTestStore,
	registerTestComponent,
	registerTestNode,
} from "../../store/testUtils";
import { canPlaceComponent } from "./placement";

describe("canPlaceComponent", () => {
	const anything = () => true;

	it("places a component that exists and is offered", () => {
		const store = createTestStore();
		const edited = registerTestComponent(store, "Edited");

		expect(
			canPlaceComponent(store, edited.id, and.component.id, anything),
		).toBe(true);
		expect(
			canPlaceComponent(store, edited.id, and.component.id, () => false),
		).toBe(false);
	});

	it("refuses an id this store does not know, as from another tab", () => {
		const store = createTestStore();
		const edited = registerTestComponent(store, "Edited");

		expect(
			canPlaceComponent(
				store,
				edited.id,
				"elsewhere" as CCComponentId,
				anything,
			),
		).toBe(false);
	});

	it("refuses the edited component and those that use it", () => {
		const store = createTestStore();
		const edited = registerTestComponent(store, "Edited");
		const user = registerTestComponent(store, "User");
		registerTestNode(store, user.id, edited.id);

		expect(canPlaceComponent(store, edited.id, edited.id, anything)).toBe(
			false,
		);
		expect(canPlaceComponent(store, edited.id, user.id, anything)).toBe(false);
	});
});
