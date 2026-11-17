import { describe, expect, it } from "vitest";
import {
	aggregate,
	and,
	const_,
	true_,
} from "../../../../../../store/intrinsics/definitions";
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
import { stubResizeObserver } from "../../testUtils";

stubResizeObserver();

/** A root component with an input whose bit width is not fixed yet. */
function setUp() {
	const store = createTestStore();
	const root = registerTestComponent(store, "Root");
	const input = registerTestInputNode(store, root.id, "In");
	const editorStore = createEditorStore(root.id, store);
	const andNode = registerTestNode(store, root.id, and.component.id);
	const andOut = testNodePin(store, andNode, and.outputPin.Out);
	/**
	 * Fix the bit width of the input by ANDing it with a constant of `bitWidth` ones. And
	 * requires both operands to be equally wide, so a stale input value fails it.
	 */
	const fixInputBitWidth = (bitWidth: number) => {
		const constant = registerTestNode(store, root.id, const_.component.id, {
			mode: "binary",
			data: new Array(bitWidth).fill(true),
		});
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, constant, const_.outputPin.Out),
			testNodePin(store, andNode, and.inputPin.A),
		);
		connectTestNodePins(
			store,
			root.id,
			input.out,
			testNodePin(store, andNode, and.inputPin.B),
		);
	};
	return { editorStore, input, andOut, fixInputBitWidth };
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
		const { editorStore, input, andOut, fixInputBitWidth } = setUp();
		const key = { componentPinId: input.componentPinId, timeStep: 0 };
		editorStore.getState().setInputValue(key, [true]);
		fixInputBitWidth(8);

		editorStore.getState().setEditorMode("play");

		const state = editorStore.getState();
		expect(state.simulationError).toBeNull();
		expect(state.editorMode).toBe("play");
		expect(state.getNodePinValue(andOut)).toEqual(testBits(1, 8));
	});
});

describe("editor mode", () => {
	it("closes the node pin property editor when the editor mode changes", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const source = registerTestNode(store, root.id, true_.component.id);
		const aggregateNode = registerTestNode(
			store,
			root.id,
			aggregate.component.id,
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, source, true_.outputPin.Out),
			testNodePin(store, aggregateNode, aggregate.inputPin.In),
		);
		const editorStore = createEditorStore(root.id, store);
		editorStore.getState().setNodePinPropertyEditorTarget({
			componentPinId: aggregate.inputPin.In.id,
			nodeId: aggregateNode.id,
		});

		editorStore.getState().setEditorMode("play");

		expect(editorStore.getState().editorMode).toBe("play");
		expect(editorStore.getState().nodePinPropertyEditorTarget).toBeNull();
	});
});
