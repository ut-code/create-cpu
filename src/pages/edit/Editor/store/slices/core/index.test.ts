import { describe, expect, it } from "vitest";
import {
	aggregate,
	and,
	const_,
	not,
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
		return constant;
	};
	return { store, editorStore, input, andOut, fixInputBitWidth };
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

describe("input values on entering play mode", () => {
	it("resets the values that no longer fit and tells which inputs they were", () => {
		const { store, editorStore, input, fixInputBitWidth } = setUp();
		const constant = fixInputBitWidth(3);
		const key = (timeStep: number) => ({
			componentPinId: input.componentPinId,
			timeStep,
		});
		editorStore.getState().setInputValue(key(0), testBits(0b101, 3));
		editorStore.getState().setInputValue(key(2), testBits(0b001, 3));
		store.nodes.update(constant.id, {
			config: { mode: "binary", data: [true, true] },
		});

		editorStore.getState().setEditorMode("play");

		const state = editorStore.getState();
		expect(state.inputValueResetNotice).toEqual({
			inputs: [{ name: "In", bitWidth: 2 }],
		});
		expect(state.getInputValue(key(1))).toEqual(testBits(0, 2));
		expect(state.getInputValue(key(2))).toEqual(testBits(1, 2));
	});

	it("resets a value to zero rather than to an earlier value that fits", () => {
		const { store, editorStore, input, fixInputBitWidth } = setUp();
		const constant = fixInputBitWidth(3);
		const key = (timeStep: number) => ({
			componentPinId: input.componentPinId,
			timeStep,
		});
		editorStore.getState().setInputValue(key(0), testBits(0b001, 3));
		editorStore.getState().setInputValue(key(1), testBits(0b101, 3));
		store.nodes.update(constant.id, {
			config: { mode: "binary", data: [true, true] },
		});

		editorStore.getState().setEditorMode("play");

		const state = editorStore.getState();
		expect(state.getInputValue(key(0))).toEqual(testBits(1, 2));
		expect(state.getInputValue(key(1))).toEqual(testBits(0, 2));
		expect(state.getInputValue(key(2))).toEqual(testBits(0, 2));
	});

	it("does not bring a reset value back when the bit width is restored", () => {
		const { store, editorStore, input, fixInputBitWidth } = setUp();
		const constant = fixInputBitWidth(3);
		const key = { componentPinId: input.componentPinId, timeStep: 0 };
		editorStore.getState().setInputValue(key, testBits(0b101, 3));
		store.nodes.update(constant.id, {
			config: { mode: "binary", data: [true, true] },
		});
		editorStore.getState().setEditorMode("play");
		editorStore.getState().setEditorMode("edit");
		expect(editorStore.getState().inputValueResetNotice).toBeNull();
		store.nodes.update(constant.id, {
			config: { mode: "binary", data: [true, true, true] },
		});

		editorStore.getState().setEditorMode("play");

		expect(editorStore.getState().inputValueResetNotice).toBeNull();
		expect(editorStore.getState().getInputValue(key)).toEqual(testBits(0, 3));
	});
});

describe("simulation errors", () => {
	it("tells which nodes of the edited component are involved", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const first = registerTestNode(store, root.id, not.component.id);
		const second = registerTestNode(store, root.id, not.component.id);
		registerTestNode(store, root.id, true_.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, first, not.outputPin.Out),
			testNodePin(store, second, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, second, not.outputPin.Out),
			testNodePin(store, first, not.inputPin.In),
		);
		const editorStore = createEditorStore(root.id, store);

		editorStore.getState().setEditorMode("play");

		const { editorMode, simulationError } = editorStore.getState();
		expect(editorMode).toBe("edit");
		expect(simulationError?.messageByLanguage.en).toMatch(
			/^The output of each component outlined in red/,
		);
		expect(simulationError?.messageByLanguage.ja).toMatch(
			/^赤い枠のコンポーネントは、自分の出力が/,
		);
		expect(simulationError?.nodeIds).toEqual(new Set([first.id, second.id]));
	});

	it("tells which pin is free when play is pressed with one", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const source = registerTestNode(store, root.id, true_.component.id);
		const gate = registerTestNode(store, root.id, and.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, source, true_.outputPin.Out),
			testNodePin(store, gate, and.inputPin.A),
		);
		const editorStore = createEditorStore(root.id, store);

		editorStore.getState().setEditorMode("play");

		const { editorMode, simulationError } = editorStore.getState();
		expect(editorMode).toBe("edit");
		expect(simulationError?.messageByLanguage.ja).toBe(
			"And の B のピンがつながっていません。",
		);
		expect(simulationError?.nodeIds).toEqual(new Set([gate.id]));
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

describe("connecting node pins", () => {
	function setUpTwoSources() {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const first = registerTestNode(store, root.id, true_.component.id);
		const second = registerTestNode(store, root.id, true_.component.id);
		const sink = registerTestNode(store, root.id, not.component.id);
		return {
			store,
			editorStore: createEditorStore(root.id, store),
			firstOut: testNodePin(store, first, true_.outputPin.Out),
			secondOut: testNodePin(store, second, true_.outputPin.Out),
			sinkIn: testNodePin(store, sink, not.inputPin.In),
		};
	}

	it("tells why a connection is refused", () => {
		const { store, editorStore, firstOut, secondOut, sinkIn } =
			setUpTwoSources();
		editorStore.getState().connectNodePins(firstOut, sinkIn);
		expect(editorStore.getState().connectionRejectionNotice).toBeNull();

		editorStore.getState().connectNodePins(secondOut, sinkIn);

		expect(editorStore.getState().connectionRejectionNotice?.rejection).toEqual(
			{ type: "inputAlreadyConnected" },
		);
		expect(store.connections.getConnectionsByNodePinId(sinkIn)).toHaveLength(1);
	});

	it("gives a repeated rejection a new notice", () => {
		const { editorStore, firstOut, secondOut } = setUpTwoSources();
		editorStore.getState().connectNodePins(firstOut, secondOut);
		const notice = editorStore.getState().connectionRejectionNotice;

		editorStore.getState().connectNodePins(firstOut, secondOut);

		const repeated = editorStore.getState().connectionRejectionNotice;
		expect(repeated?.rejection).toEqual(notice?.rejection);
		expect(repeated?.id).not.toBe(notice?.id);
	});

	it("drops the notice when the editor mode changes", () => {
		const { editorStore, firstOut, secondOut } = setUpTwoSources();
		editorStore.getState().connectNodePins(firstOut, secondOut);

		editorStore.getState().setEditorMode("play");

		expect(editorStore.getState().connectionRejectionNotice).toBeNull();
	});

	it("drops the notice once a connection succeeds or it is dismissed", () => {
		const { editorStore, firstOut, secondOut, sinkIn } = setUpTwoSources();
		editorStore.getState().connectNodePins(firstOut, secondOut);
		expect(editorStore.getState().connectionRejectionNotice).not.toBeNull();
		editorStore.getState().dismissConnectionRejectionNotice();
		expect(editorStore.getState().connectionRejectionNotice).toBeNull();

		editorStore.getState().connectNodePins(firstOut, secondOut);
		editorStore.getState().connectNodePins(firstOut, sinkIn);

		expect(editorStore.getState().connectionRejectionNotice).toBeNull();
	});
});
