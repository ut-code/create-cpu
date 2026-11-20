import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
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
	thrownBy,
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

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationCombinationalLoopError,
		);
		expect(error.message).toBe(
			"The output of each part outlined in red comes back to its own input along the wires. Its output would need itself to be worked out, so this cannot run. Reconnect a wire, or put a FlipFlop on the way back.",
		);
		expect(new Set(error.nodePaths.map((path) => path[0]))).toEqual(
			new Set([first.id, second.id]),
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
		const outside = registerTestNode(store, root.id, not.component.id);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, first, buffer.out),
			testNodePin(store, outside, not.inputPin.In),
		);

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationCombinationalLoopError,
		);
		expect(error.message).toBe(
			"The output of each part outlined in red comes back to its own input along the wires. Its output would need itself to be worked out, so this cannot run. Reconnect a wire, or put a FlipFlop on the way back.",
		);
		expect(new Set(error.nodePaths.map((path) => path[0]))).toEqual(
			new Set([first.id, second.id]),
		);
	});

	it("tells which component to open for a loop closed inside it", () => {
		const store = createTestStore();
		const ring = registerTestComponent(store, "Ring");
		const first = registerTestNode(store, ring.id, not.component.id);
		const second = registerTestNode(store, ring.id, not.component.id);
		connectTestNodePins(
			store,
			ring.id,
			testNodePin(store, first, not.outputPin.Out),
			testNodePin(store, second, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			ring.id,
			testNodePin(store, second, not.outputPin.Out),
			testNodePin(store, first, not.inputPin.In),
		);
		const root = registerTestComponent(store, "Root");
		const ringNode = registerTestNode(store, root.id, ring.id);

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationCombinationalLoopError,
		);
		expect(error.message).toBe(
			"Inside Ring, the output of some parts comes back to their own input along the wires. Their output would need itself to be worked out, so this cannot run. Open Ring to reconnect a wire, or put a FlipFlop on the way back.",
		);
		expect(new Set(error.nodePaths.map((path) => path[0]))).toEqual(
			new Set([ringNode.id]),
		);
	});

	describe("a loop closed by the wiring around a component", () => {
		/** `In` -> Not -> Not -> `Out`, which holds no loop by itself */
		function registerChainComponent(store: CCStore) {
			const component = registerTestComponent(store, "Chain");
			const into = registerTestInputNode(store, component.id, "In");
			const first = registerTestNode(store, component.id, not.component.id);
			const second = registerTestNode(store, component.id, not.component.id);
			const out = registerTestOutputNode(store, component.id, "Out");
			connectTestNodePins(
				store,
				component.id,
				into.out,
				testNodePin(store, first, not.inputPin.In),
			);
			connectTestNodePins(
				store,
				component.id,
				testNodePin(store, first, not.outputPin.Out),
				testNodePin(store, second, not.inputPin.In),
			);
			connectTestNodePins(
				store,
				component.id,
				testNodePin(store, second, not.outputPin.Out),
				out.in,
			);
			return {
				component,
				into: testComponentPin(store, component, "In"),
				out: testComponentPin(store, component, "Out"),
			};
		}

		function registerLoop(store: CCStore, parentComponentId: CCComponentId) {
			const chain = registerChainComponent(store);
			const buffer = registerBufferComponent(store);
			const chainNode = registerTestNode(
				store,
				parentComponentId,
				chain.component.id,
			);
			const bufferNode = registerTestNode(
				store,
				parentComponentId,
				buffer.component.id,
			);
			connectTestNodePins(
				store,
				parentComponentId,
				testNodePin(store, chainNode, chain.out),
				testNodePin(store, bufferNode, buffer.into),
			);
			connectTestNodePins(
				store,
				parentComponentId,
				testNodePin(store, bufferNode, buffer.out),
				testNodePin(store, chainNode, chain.into),
			);
			return { chainNode, bufferNode };
		}

		it("outlines every node the loop runs through", () => {
			const store = createTestStore();
			const root = registerTestComponent(store, "Root");
			const { chainNode, bufferNode } = registerLoop(store, root.id);

			const error = thrownBy(
				() => simulateComponent(store, root.id, new Map()),
				SimulationCombinationalLoopError,
			);
			expect(error.message).toMatch(/^The output of each part outlined in red/);
			expect(new Set(error.nodePaths.map((path) => path[0]))).toEqual(
				new Set([chainNode.id, bufferNode.id]),
			);
		});

		it("tells to open the component the wiring is in", () => {
			const store = createTestStore();
			const outer = registerTestComponent(store, "Outer");
			registerLoop(store, outer.id);
			const root = registerTestComponent(store, "Root");
			const outerNode = registerTestNode(store, root.id, outer.id);

			const error = thrownBy(
				() => simulateComponent(store, root.id, new Map()),
				SimulationCombinationalLoopError,
			);
			expect(error.message).toMatch(
				/^Inside Outer, .* Open Outer to reconnect/,
			);
			expect(new Set(error.nodePaths.map((path) => path[0]))).toEqual(
				new Set([outerNode.id]),
			);
		});
	});

	it("tells which component to open for a loop of wires inside it", () => {
		const store = createTestStore();
		const buffer = registerBufferComponent(store);
		const ring = registerTestComponent(store, "Ring");
		const first = registerTestNode(store, ring.id, buffer.component.id);
		const second = registerTestNode(store, ring.id, buffer.component.id);
		const out = registerTestOutputNode(store, ring.id, "Out");
		connectTestNodePins(
			store,
			ring.id,
			testNodePin(store, first, buffer.out),
			testNodePin(store, second, buffer.into),
		);
		connectTestNodePins(
			store,
			ring.id,
			testNodePin(store, second, buffer.out),
			testNodePin(store, first, buffer.into),
		);
		connectTestNodePins(
			store,
			ring.id,
			testNodePin(store, first, buffer.out),
			out.in,
		);
		const root = registerTestComponent(store, "Root");
		const ringNode = registerTestNode(store, root.id, ring.id);

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationCombinationalLoopError,
		);
		expect(error.message).toMatch(/^Inside Ring, .* Open Ring/);
		expect(new Set(error.nodePaths.map((path) => path[0]))).toEqual(
			new Set([ringNode.id]),
		);
	});

	it("names an unconnected Output node by its pin", () => {
		const store = createTestStore();
		const half = registerTestComponent(store, "Half");
		registerTestOutputNode(store, half.id, "Sum");
		const root = registerTestComponent(store, "Root");
		registerTestNode(store, root.id, half.id);

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationUnconnectedPinError,
		);
		expect(error.message).toBe(
			"Sum in Half is not connected. Open Half to connect it.",
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

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationUnconnectedPinError,
		);
		expect(error.message).toMatch(/^Pin [AB] of And is not connected\.$/);
		expect(error.nodePaths).toEqual([[andNode.id]]);
	});

	it("names an unconnected input pin inside a component by the components around it", () => {
		const store = createTestStore();
		const half = registerTestComponent(store, "Half");
		const into = registerTestInputNode(store, half.id, "In");
		const andNode = registerTestNode(store, half.id, and.component.id);
		const out = registerTestOutputNode(store, half.id, "Out");
		connectTestNodePins(
			store,
			half.id,
			into.out,
			testNodePin(store, andNode, and.inputPin.A),
		);
		connectTestNodePins(
			store,
			half.id,
			testNodePin(store, andNode, and.outputPin.Out),
			out.in,
		);
		const root = registerTestComponent(store, "Root");
		const rootIn = registerTestInputNode(store, root.id, "In");
		const halfNode = registerTestNode(store, root.id, half.id);
		connectTestNodePins(
			store,
			root.id,
			rootIn.out,
			testNodePin(store, halfNode, testComponentPin(store, half, "In")),
		);

		const error = thrownBy(
			() => simulateComponent(store, root.id, new Map()),
			SimulationUnconnectedPinError,
		);
		expect(error.message).toBe(
			"Pin B of And in Half is not connected. Open Half to connect it.",
		);
		expect(error.nodePaths).toEqual([[halfNode.id, andNode.id]]);
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
