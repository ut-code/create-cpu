import { describe, expect, it } from "vitest";
import { en } from "../../i18n/en";
import { ja } from "../../i18n/ja";
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

		expect(describeComponentDeletion(store, adder.id, en)).toBe(
			"This cannot be undone.",
		);
	});

	it("tells where the component is used, as it is removed from there too", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		const alu = registerTestComponent(store, "ALU");
		const cpu = registerTestComponent(store, "CPU");
		registerTestNode(store, alu.id, adder.id);
		registerTestNode(store, alu.id, adder.id);
		registerTestNode(store, cpu.id, adder.id);

		expect(describeComponentDeletion(store, adder.id, en)).toBe(
			"It is used 3 times in ALU and CPU. Deleting it also removes it from those components, along with the wires connected to it. This cannot be undone.",
		);
	});

	it("tells apart places with the same name", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		const first = registerTestComponent(store, "ALU");
		const second = registerTestComponent(store, "ALU");
		registerTestNode(store, first.id, adder.id);
		registerTestNode(store, second.id, adder.id);

		expect(describeComponentDeletion(store, adder.id, en)).toMatch(
			/^It is used 2 times in ALU and ALU\./,
		);
	});

	it("tells in Japanese where the component is used", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		const alu = registerTestComponent(store, "ALU");
		registerTestNode(store, alu.id, adder.id);

		expect(describeComponentDeletion(store, adder.id, ja)).toBe(
			"ALU で 1 か所使われています。削除すると、使われているところから、つながっている線ごと消えます。元に戻せません。",
		);
	});

	it("names a few places in order and counts the rest", () => {
		const store = createTestStore();
		const adder = registerTestComponent(store, "Adder");
		for (const name of ["E", "B", "D", "A", "C"]) {
			const place = registerTestComponent(store, name);
			registerTestNode(store, place.id, adder.id);
		}

		expect(describeComponentDeletion(store, adder.id, en)).toBe(
			"It is used 5 times in A, B, C and 2 other components. Deleting it also removes it from those components, along with the wires connected to it. This cannot be undone.",
		);
		expect(describeComponentDeletion(store, adder.id, ja)).toMatch(
			/^A、B、C ほか 2 個のコンポーネントで 5 か所使われています。/,
		);
	});
});
