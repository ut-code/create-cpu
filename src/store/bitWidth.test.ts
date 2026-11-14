import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import { CCConnectionStore } from "./connection";
import {
	aggregate,
	broadcast,
	const_,
	display,
	not,
} from "./intrinsics/definitions";
import { SimulationBitWidthConflictError } from "./netlist";
import type { CCNodePinId } from "./nodePin";
import simulateComponent from "./simulation";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	registerTestOutputNode,
	splitTestNodePin,
	testBits,
	testComponentPin,
	testNodePin,
	testNumber,
} from "./testUtils";

function registerConst(
	store: CCStore,
	parentComponentId: CCComponentId,
	bitWidth: number,
) {
	const node = registerTestNode(store, parentComponentId, const_.component.id, {
		mode: "binary",
		data: testBits(0, bitWidth),
	});
	return { node, out: testNodePin(store, node, const_.outputPin.Out) };
}

function setConstBitWidth(
	store: CCStore,
	constant: ReturnType<typeof registerConst>,
	bitWidth: number,
) {
	store.nodes.update(constant.node.id, {
		config: { mode: "binary", data: testBits(0, bitWidth) },
	});
}

/** A display whose pixels input takes `width * height` bits. */
function registerDisplay(
	store: CCStore,
	parentComponentId: CCComponentId,
	width: number,
	height: number,
) {
	const node = registerTestNode(
		store,
		parentComponentId,
		display.component.id,
		{
			resolution: { x: width, y: height },
			pixelOrder: "row-major",
		},
	);
	return { node, pixels: testNodePin(store, node, display.inputPin.Pixels) };
}

/** `In` -> Not -> `Out`: a component whose two pins are tied to one bit width. */
function registerInverterComponent(store: CCStore) {
	const component = registerTestComponent(store, "Inverter");
	const into = registerTestInputNode(store, component.id, "In");
	const notNode = registerTestNode(store, component.id, not.component.id);
	const out = registerTestOutputNode(store, component.id, "Out");
	connectTestNodePins(
		store,
		component.id,
		into.out,
		testNodePin(store, notNode, not.inputPin.In),
	);
	connectTestNodePins(
		store,
		component.id,
		testNodePin(store, notNode, not.outputPin.Out),
		out.in,
	);
	return {
		component,
		into: testComponentPin(store, component, "In"),
		out: testComponentPin(store, component, "Out"),
	};
}

/** Two independent inverters side by side, so `In1`/`Out1` and `In2`/`Out2`. */
function registerDualInverterComponent(store: CCStore) {
	const component = registerTestComponent(store, "DualInverter");
	for (const suffix of ["1", "2"]) {
		const into = registerTestInputNode(store, component.id, `In${suffix}`);
		const notNode = registerTestNode(store, component.id, not.component.id);
		const out = registerTestOutputNode(store, component.id, `Out${suffix}`);
		connectTestNodePins(
			store,
			component.id,
			into.out,
			testNodePin(store, notNode, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			component.id,
			testNodePin(store, notNode, not.outputPin.Out),
			out.in,
		);
	}
	return {
		component,
		in1: testComponentPin(store, component, "In1"),
		out1: testComponentPin(store, component, "Out1"),
		in2: testComponentPin(store, component, "In2"),
		out2: testComponentPin(store, component, "Out2"),
	};
}

function tryConnect(
	store: CCStore,
	parentComponentId: CCComponentId,
	from: CCNodePinId,
	to: CCNodePinId,
): boolean {
	const connection = CCConnectionStore.create({
		from,
		to,
		parentComponentId,
		bentPortion: 0.5,
	});
	store.connections.register(connection);
	return store.connections.get(connection.id) !== undefined;
}

function conflictingConnectionCount(store: CCStore): number {
	return store.connections
		.getMany()
		.filter((connection) =>
			store.connections.isInBitWidthConflict(connection.id),
		).length;
}

describe("bit width groups", () => {
	it("keeps a connection that a config change makes inconsistent and marks it", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const constant = registerConst(store, root.id, 12);
		const screen = registerDisplay(store, root.id, 4, 3);
		connectTestNodePins(store, root.id, constant.out, screen.pixels);
		expect(conflictingConnectionCount(store)).toBe(0);

		store.nodes.update(screen.node.id, {
			config: { resolution: { x: 4, y: 2 }, pixelOrder: "row-major" },
		});

		expect(store.connections.getMany()).toHaveLength(1);
		expect(conflictingConnectionCount(store)).toBe(1);

		// Going back resolves the conflict without having to connect again
		store.nodes.update(screen.node.id, {
			config: { resolution: { x: 3, y: 4 }, pixelOrder: "row-major" },
		});
		expect(conflictingConnectionCount(store)).toBe(0);
	});

	it("marks the output of an aggregate node whose split inputs are resized", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const aggregateNode = registerTestNode(
			store,
			root.id,
			aggregate.component.id,
		);
		splitTestNodePin(store, aggregateNode, aggregate.inputPin.In, [4, 4]);
		const screen = registerDisplay(store, root.id, 4, 2);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, aggregateNode, aggregate.outputPin.Out),
			screen.pixels,
		);

		store.nodePins.update(
			testNodePin(store, aggregateNode, aggregate.inputPin.In, 1),
			{ manualBitWidth: 3 },
		);

		expect(conflictingConnectionCount(store)).toBe(1);
	});

	it("marks the connections outside a component whose pin changes its width inside", () => {
		const store = createTestStore();
		const source = registerTestComponent(store, "Source");
		const constant = registerConst(store, source.id, 8);
		const sourceOut = registerTestOutputNode(store, source.id, "Out");
		connectTestNodePins(store, source.id, constant.out, sourceOut.in);
		const root = registerTestComponent(store, "Root");
		const sourceNode = registerTestNode(store, root.id, source.id);
		const screen = registerDisplay(store, root.id, 4, 2);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, sourceNode, testComponentPin(store, source, "Out")),
			screen.pixels,
		);
		expect(conflictingConnectionCount(store)).toBe(0);

		setConstBitWidth(store, constant, 4);

		expect(conflictingConnectionCount(store)).toBe(1);
	});

	it("marks every connection of the pins tied to a conflicting width", () => {
		// Const(8) -> Not -> Display(8), then the display shrinks. Which connection is
		// wrong depends on the intent, so both are marked.
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const constant = registerConst(store, root.id, 8);
		const notNode = registerTestNode(store, root.id, not.component.id);
		const screen = registerDisplay(store, root.id, 4, 2);
		connectTestNodePins(
			store,
			root.id,
			constant.out,
			testNodePin(store, notNode, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, notNode, not.outputPin.Out),
			screen.pixels,
		);

		store.nodes.update(screen.node.id, {
			config: { resolution: { x: 2, y: 2 }, pixelOrder: "row-major" },
		});

		expect(conflictingConnectionCount(store)).toBe(2);
		// The pins fixing a width keep it; the pins between them have none to take
		expect(store.nodePins.getNodePinBitWidthStatus(constant.out)).toEqual({
			isFixed: true,
			bitWidth: 8,
		});
		expect(
			store.nodePins.getNodePinBitWidthStatus(
				testNodePin(store, notNode, not.outputPin.Out),
			),
		).toEqual({ isFixed: false });
	});

	it("resolves the conflict when one of the conflicting connections is removed", async () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const constant = registerConst(store, root.id, 8);
		const notNode = registerTestNode(store, root.id, not.component.id);
		const screen = registerDisplay(store, root.id, 4, 2);
		connectTestNodePins(
			store,
			root.id,
			constant.out,
			testNodePin(store, notNode, not.inputPin.In),
		);
		connectTestNodePins(
			store,
			root.id,
			testNodePin(store, notNode, not.outputPin.Out),
			screen.pixels,
		);
		setConstBitWidth(store, constant, 4);
		expect(conflictingConnectionCount(store)).toBe(2);

		const [toScreen] = store.connections.getConnectionsByNodePinId(
			screen.pixels,
		);
		await store.connections.unregister([nullthrows(toScreen).id]);

		expect(conflictingConnectionCount(store)).toBe(0);
	});

	it("refuses a new connection that would tie conflicting widths together", () => {
		const store = createTestStore();
		const inverter = registerInverterComponent(store);
		const root = registerTestComponent(store, "Root");
		const constant = registerConst(store, root.id, 8);
		const inverterNode = registerTestNode(
			store,
			root.id,
			inverter.component.id,
		);
		const screen = registerDisplay(store, root.id, 2, 2);
		connectTestNodePins(
			store,
			root.id,
			constant.out,
			testNodePin(store, inverterNode, inverter.into),
		);

		// The output of the inverter is tied to its input inside, so it is 8 bits wide
		expect(
			store.nodePins.getNodePinBitWidthStatus(
				testNodePin(store, inverterNode, inverter.out),
			),
		).toEqual({ isFixed: true, bitWidth: 8 });
		expect(
			tryConnect(
				store,
				root.id,
				testNodePin(store, inverterNode, inverter.out),
				screen.pixels,
			),
		).toBe(false);
	});

	it("keeps the independent paths of a component apart", () => {
		const store = createTestStore();
		const dual = registerDualInverterComponent(store);
		const root = registerTestComponent(store, "Root");
		const wide = registerConst(store, root.id, 8);
		const narrow = registerConst(store, root.id, 4);
		const dualNode = registerTestNode(store, root.id, dual.component.id);
		const wideScreen = registerDisplay(store, root.id, 4, 2);
		const narrowScreen = registerDisplay(store, root.id, 2, 2);

		for (const [from, to] of [
			[wide.out, testNodePin(store, dualNode, dual.in1)],
			[narrow.out, testNodePin(store, dualNode, dual.in2)],
			[testNodePin(store, dualNode, dual.out1), wideScreen.pixels],
			[testNodePin(store, dualNode, dual.out2), narrowScreen.pixels],
		] as const) {
			expect(tryConnect(store, root.id, from, to)).toBe(true);
		}
		expect(conflictingConnectionCount(store)).toBe(0);
	});
});

describe("simulation of bit width groups", () => {
	it("refuses to simulate a component with a bit width conflict", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const constant = registerConst(store, root.id, 4);
		const screen = registerDisplay(store, root.id, 2, 2);
		connectTestNodePins(store, root.id, constant.out, screen.pixels);
		setConstBitWidth(store, constant, 8);

		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			SimulationBitWidthConflictError,
		);
	});

	it("refuses to simulate a component using one with a bit width conflict", () => {
		const store = createTestStore();
		const inner = registerTestComponent(store, "Inner");
		const constant = registerConst(store, inner.id, 4);
		const screen = registerDisplay(store, inner.id, 2, 2);
		connectTestNodePins(store, inner.id, constant.out, screen.pixels);
		setConstBitWidth(store, constant, 8);
		const root = registerTestComponent(store, "Root");
		registerTestNode(store, root.id, inner.id);

		expect(() => simulateComponent(store, root.id, new Map())).toThrow(
			/in Inner do not match/,
		);
	});

	it("gives each independent path of a component the width it is used with", () => {
		const store = createTestStore();
		const dual = registerDualInverterComponent(store);
		const root = registerTestComponent(store, "Root");
		const wide = registerConst(store, root.id, 8);
		const narrow = registerConst(store, root.id, 2);
		const dualNode = registerTestNode(store, root.id, dual.component.id);
		connectTestNodePins(
			store,
			root.id,
			wide.out,
			testNodePin(store, dualNode, dual.in1),
		);
		connectTestNodePins(
			store,
			root.id,
			narrow.out,
			testNodePin(store, dualNode, dual.in2),
		);

		const frame = simulateComponent(store, root.id, new Map());

		expect(
			testNumber(
				frame.getNodePinValue(testNodePin(store, dualNode, dual.out1)),
			),
		).toBe(0b11111111);
		expect(
			frame.getNodePinValue(testNodePin(store, dualNode, dual.out2)),
		).toEqual(testBits(0b11, 2));
	});

	it("rejects an input value that does not fit its pin", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const into = registerTestInputNode(store, root.id, "In");
		const broadcastNode = registerTestNode(
			store,
			root.id,
			broadcast.component.id,
		);
		connectTestNodePins(
			store,
			root.id,
			into.out,
			testNodePin(store, broadcastNode, broadcast.inputPin.In),
		);

		expect(() =>
			simulateComponent(
				store,
				root.id,
				new Map([[into.componentPinId, testBits(0b101, 3)]]),
			),
		).toThrow(/carries 3 bits, but the pin is 1 bits wide/);
	});
});
