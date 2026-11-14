import { beforeAll, describe, expect, it, vi } from "vitest";
import { display } from "../../../../../../store/intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	testBits,
	testNodePin,
} from "../../../../../../store/testUtils";
import { createEditorStore } from "../..";

beforeAll(() => {
	// The perspective slice observes the size of the renderer, which there is none of here
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});

/** A root component with an input whose bit width is not fixed yet. */
function setUp() {
	const store = createTestStore();
	const root = registerTestComponent(store, "Root");
	const input = registerTestInputNode(store, root.id, "In");
	const editorStore = createEditorStore(root.id, store);
	/** Fix the bit width of the input by feeding it to a display of `x` × 1 pixels. */
	const fixInputBitWidth = (x: number) => {
		const displayNode = registerTestNode(store, root.id, display.component.id, {
			resolution: { x, y: 1 },
			pixelOrder: "row-major",
		});
		connectTestNodePins(
			store,
			root.id,
			input.out,
			testNodePin(store, displayNode, display.inputPin.Pixels),
		);
	};
	return { editorStore, input, fixInputBitWidth };
}

describe("input values", () => {
	it("fits a value set before the bit width of the pin was fixed", () => {
		const { editorStore, input, fixInputBitWidth } = setUp();
		const key = { componentPinId: input.componentPinId, timeStep: 0 };
		editorStore.getState().setInputValue(key, [true]);

		fixInputBitWidth(8);

		expect(editorStore.getState().getInputValue(key)).toEqual(testBits(1, 8));
		// A later time step inherits the value, fitted the same way
		expect(
			editorStore.getState().getInputValue({ ...key, timeStep: 3 }),
		).toEqual(testBits(1, 8));
	});

	it("starts over from zero when a value does not fit the new bit width", () => {
		const { editorStore, input, fixInputBitWidth } = setUp();
		const key = { componentPinId: input.componentPinId, timeStep: 0 };
		editorStore.getState().setInputValue(key, testBits(0b100, 3));

		fixInputBitWidth(2);

		expect(editorStore.getState().getInputValue(key)).toEqual(testBits(0, 2));
	});

	it("simulates a circuit whose input got wider after its value was set", () => {
		const { editorStore, input, fixInputBitWidth } = setUp();
		const key = { componentPinId: input.componentPinId, timeStep: 0 };
		editorStore.getState().setInputValue(key, [true]);
		fixInputBitWidth(8);

		editorStore.getState().setEditorMode("play");

		const state = editorStore.getState();
		expect(state.simulationError).toBeNull();
		expect(state.editorMode).toBe("play");
		expect(state.getNodePinValue(input.out)).toEqual(testBits(1, 8));
	});
});
