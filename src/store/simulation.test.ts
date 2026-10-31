import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import type CCStore from ".";
import { and, const_, flipflop, not } from "./intrinsics/definitions";
import {
	SimulationCombinationalLoopError,
	SimulationUnconnectedPinError,
} from "./netlist";
import simulateComponent, { type SimulationFrame } from "./simulation";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	registerTestOutputNode,
	testBits,
	testComponentPin,
	testNodePin,
	testNumber,
} from "./testUtils";

/** `D` -> flip-flop -> `Q`: a component that holds its input for one time step. */
function registerDelayComponent(store: CCStore) {
	const component = registerTestComponent(store, "Delay");
	const d = registerTestInputNode(store, component.id, "D");
	const ff = registerTestNode(store, component.id, flipflop.component.id);
	const q = registerTestOutputNode(store, component.id, "Q");
	connectTestNodePins(
		store,
		component.id,
		d.out,
		testNodePin(store, ff, flipflop.inputPin.In),
	);
	connectTestNodePins(
		store,
		component.id,
		testNodePin(store, ff, flipflop.outputPin.Out),
		q.in,
	);
	return {
		component,
		ff,
		d: testComponentPin(store, component, "D"),
		q: testComponentPin(store, component, "Q"),
	};
}

/** `In` -> `Out`: a component that only passes a value through. */
function registerBufferComponent(store: CCStore) {
	const component = registerTestComponent(store, "Buffer");
	const into = registerTestInputNode(store, component.id, "In");
	const out = registerTestOutputNode(store, component.id, "Out");
	connectTestNodePins(store, component.id, into.out, out.in);
	return {
		component,
		into: testComponentPin(store, component, "In"),
		out: testComponentPin(store, component, "Out"),
	};
}

/** Simulate `steps` time steps in a row, feeding the same input values to each. */
function simulateSteps(
	store: CCStore,
	componentId: Parameters<typeof simulateComponent>[1],
	inputValues: Parameters<typeof simulateComponent>[2],
	steps: number,
): SimulationFrame[] {
	const frames: SimulationFrame[] = [];
	let previous: SimulationFrame | null = null;
	for (let timeStep = 0; timeStep < steps; timeStep += 1) {
		previous = simulateComponent(store, componentId, inputValues, previous);
		frames.push(previous);
	}
	return frames;
}

describe("simulateComponent", () => {
	it("evaluates a combinational circuit", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const a = registerTestInputNode(store, root.id, "A");
		const b = registerTestInputNode(store, root.id, "B");
		const andNode = registerTestNode(store, root.id, and.component.id);
		const notNode = registerTestNode(store, root.id, not.component.id);
		const out = registerTestOutputNode(store, root.id, "Out");
		connectTestNodePins(
			store,
			root.id,
			a.out,
			testNodePin(store, andNode, and.inputPin.A),
		);
		connectTestNodePins(
			store,
			root.id,
			b.out,
			testNodePin(store, andNode, and.inputPin.B),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, andNode, and.outputPin.Out),
			testNodePin(store, notNode, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, notNode, not.outputPin.Out),
			out.in,
		);

		const nand = (left: boolean, right: boolean) =>
			simulateComponent(
				store,
				root.id,
				new Map([
					[a.componentPinId, [left]],
					[b.componentPinId, [right]],
				]),
			).getNodePinValue(out.in);
		expect(nand(true, true)).toEqual([false]);
		expect(nand(true, false)).toEqual([true]);
		expect(nand(false, false)).toEqual([true]);
	});

	it("simulates a loop that is broken by a flip-flop inside a component", () => {
		// Delay.Q -> Not -> Delay.D. The input of the component depends on its own output,
		// which is only resolvable because the flip-flop inside it needs no input value.
		const store = createTestStore();
		const delay = registerDelayComponent(store);
		const root = registerTestComponent(store, "Root");
		const delayNode = registerTestNode(store, root.id, delay.component.id);
		const notNode = registerTestNode(store, root.id, not.component.id);
		const q = testNodePin(store, delayNode, delay.q);
		connectTestNodePins(
			store,
			root.id,
			q,
			testNodePin(store, notNode, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, notNode, not.outputPin.Out),
			testNodePin(store, delayNode, delay.d),
		);

		const frames = simulateSteps(store, root.id, new Map(), 4);
		expect(frames.map((frame) => frame.getNodePinValue(q))).toEqual([
			[false],
			[true],
			[false],
			[true],
		]);
	});

	it("delays by one time step per flip-flop of a chain", () => {
		const store = createTestStore();
		const delay = registerDelayComponent(store);
		const root = registerTestComponent(store, "Root");
		const source = registerTestInputNode(store, root.id, "In");
		const first = registerTestNode(store, root.id, delay.component.id);
		const second = registerTestNode(store, root.id, delay.component.id);
		connectTestNodePins(
			store,
			root.id,
			source.out,
			testNodePin(store, first, delay.d),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, first, delay.q),
			testNodePin(store, second, delay.d),
		);
		const secondQ = testNodePin(store, second, delay.q);

		const frames = simulateSteps(
			store,
			root.id,
			new Map([[source.componentPinId, [true]]]),
			4,
		);
		expect(frames.map((frame) => frame.getNodePinValue(secondQ))).toEqual([
			[false],
			[false],
			[true],
			[true],
		]);
	});

	it("keeps the state of two nodes of the same component apart", () => {
		const store = createTestStore();
		const delay = registerDelayComponent(store);
		const root = registerTestComponent(store, "Root");
		const a = registerTestInputNode(store, root.id, "A");
		const b = registerTestInputNode(store, root.id, "B");
		const first = registerTestNode(store, root.id, delay.component.id);
		const second = registerTestNode(store, root.id, delay.component.id);
		connectTestNodePins(
			store,
			root.id,
			a.out,
			testNodePin(store, first, delay.d),
		);
		connectTestNodePins(
			store,
			root.id,
			b.out,
			testNodePin(store, second, delay.d),
		);

		const frames = simulateSteps(
			store,
			root.id,
			new Map([
				[a.componentPinId, [true]],
				[b.componentPinId, [false]],
			]),
			2,
		);
		const lastFrame = nullthrows(frames[1]);
		expect(
			lastFrame.getNodePinValue(testNodePin(store, first, delay.q)),
		).toEqual([true]);
		expect(
			lastFrame.getNodePinValue(testNodePin(store, second, delay.q)),
		).toEqual([false]);
		// the same flip-flop inside the two nodes holds two different values
		const flipFlopOut = testNodePin(store, delay.ff, flipflop.outputPin.Out);
		expect(
			lastFrame.getNodePinValueAt([first.id, delay.ff.id], flipFlopOut),
		).toEqual([true]);
		expect(
			lastFrame.getNodePinValueAt([second.id, delay.ff.id], flipFlopOut),
		).toEqual([false]);
	});

	it("takes the bit width of a component node over to the nodes inside it", () => {
		const store = createTestStore();
		const delay = registerDelayComponent(store);
		const root = registerTestComponent(store, "Root");
		const constant = registerTestNode(store, root.id, const_.component.id, {
			mode: "binary",
			data: testBits(0b10100101, 8),
		});
		const delayNode = registerTestNode(store, root.id, delay.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, constant, const_.outputPin.Out),
			testNodePin(store, delayNode, delay.d),
		);
		const q = testNodePin(store, delayNode, delay.q);

		const frames = simulateSteps(store, root.id, new Map(), 2);
		// The width of the flip-flop inside the component is not fixed by the component
		// itself, so it has to be inherited from the node using it.
		expect(nullthrows(frames[0]).getNodePinValue(q)).toEqual(testBits(0, 8));
		expect(testNumber(nullthrows(frames[1]).getNodePinValue(q))).toBe(
			0b10100101,
		);
	});

	it("reports a combinational loop instead of hanging", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const first = registerTestNode(store, root.id, not.component.id);
		const second = registerTestNode(store, root.id, not.component.id);
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

		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			SimulationCombinationalLoopError,
		);
		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			/Insert a FlipFlop/,
		);
	});

	it("reports a combinational loop that runs through components", () => {
		const store = createTestStore();
		const buffer = registerBufferComponent(store);
		const root = registerTestComponent(store, "Root");
		const first = registerTestNode(store, root.id, buffer.component.id);
		const second = registerTestNode(store, root.id, buffer.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, first, buffer.out),
			testNodePin(store, second, buffer.into),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, second, buffer.out),
			testNodePin(store, first, buffer.into),
		);

		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			SimulationCombinationalLoopError,
		);
	});

	it("reports an input pin that is not connected", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const andNode = registerTestNode(store, root.id, and.component.id);
		const out = registerTestOutputNode(store, root.id, "Out");
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, andNode, and.outputPin.Out),
			out.in,
		);

		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			SimulationUnconnectedPinError,
		);
	});

	it("picks up a change of the circuit", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const constant = registerTestNode(store, root.id, const_.component.id, {
			mode: "binary",
			data: testBits(0b0011, 4),
		});
		const out = registerTestOutputNode(store, root.id, "Out");
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, constant, const_.outputPin.Out),
			out.in,
		);
		expect(
			testNumber(
				simulateComponent(store, root.id, new Map()).getNodePinValue(out.in),
			),
		).toBe(0b0011);

		// a new value of the constant has to reach the next simulation
		store.nodes.update(constant.id, {
			config: { mode: "binary", data: testBits(0b1010, 4) },
		});
		expect(
			testNumber(
				simulateComponent(store, root.id, new Map()).getNodePinValue(out.in),
			),
		).toBe(0b1010);

		// and so has a new node
		registerTestNode(store, root.id, and.component.id);
		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			SimulationUnconnectedPinError,
		);
	});

	it("refuses to continue a frame simulated before a change", () => {
		// The values of a frame are keyed by the nets of the netlist it was simulated
		// from, so continuing from it after a change would restore the state of the
		// flip-flops from nets that may no longer mean the same thing.
		const store = createTestStore();
		const delay = registerDelayComponent(store);
		const root = registerTestComponent(store, "Root");
		const source = registerTestInputNode(store, root.id, "In");
		const delayNode = registerTestNode(store, root.id, delay.component.id);
		connectTestNodePins(
			store,
			root.id,
			source.out,
			testNodePin(store, delayNode, delay.d),
		);
		const inputValues = new Map([[source.componentPinId, [true]]]);

		const frame = simulateComponent(store, root.id, inputValues);
		// the circuit stays valid, so only the revision stands in the way
		const observer = registerTestOutputNode(store, root.id, "Out");
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, delayNode, delay.q),
			observer.in,
		);
		expect(() => simulateComponent(store, root.id, inputValues, frame)).toThrow(
			/another revision/,
		);
		// without the stale frame the changed circuit simulates as usual
		expect(
			simulateComponent(store, root.id, inputValues).getNodePinValue(
				testNodePin(store, delayNode, delay.q),
			),
		).toEqual([false]);
	});
});
