import { describe, expect, it } from "vitest";
import {
	createTestStore,
	registerTestComponent,
	registerTestNode,
} from "../../store/testUtils";
import { describeComponentDeletion } from "./componentDeletion";

describe("describeComponentDeletion", () => {
	it("only warns that it cannot be undone when the component is not used", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");

		expect(describeComponentDeletion(store, adder.id)).toBe(
			"This cannot be undone.",
		);
	});

	it("tells where the component is used, as its nodes are removed too", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		const alu = registerTestComponent(store, "ALU");
		const cpu = registerTestComponent(store, "CPU");
		registerTestNode(store, alu.id, adder.id);
		registerTestNode(store, alu.id, adder.id);
		registerTestNode(store, cpu.id, adder.id);

		expect(describeComponentDeletion(store, adder.id)).toBe(
			"It is used 3 times in ALU, CPU. Deleting it also removes those nodes and their connections. This cannot be undone.",
		);
	});

	it("tells apart places with the same name", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		const first = registerTestComponent(store, "ALU");
		const second = registerTestComponent(store, "ALU");
		registerTestNode(store, first.id, adder.id);
		registerTestNode(store, second.id, adder.id);

		expect(describeComponentDeletion(store, adder.id)).toMatch(
			/^It is used 2 times in ALU, ALU\./,
		);
	});

	it("names a few places in order and counts the rest", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		for (const name of ["E", "B", "D", "A", "C"]) {
			const place = registerTestComponent(store, name);
			registerTestNode(store, place.id, adder.id);
		}

		expect(describeComponentDeletion(store, adder.id)).toBe(
			"It is used 5 times in A, B, C and 2 other components. Deleting it also removes those nodes and their connections. This cannot be undone.",
		);
	});
});
