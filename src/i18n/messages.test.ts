import { describe, expect, it } from "vitest";
import { describeConnectionRejection } from "../pages/edit/Editor/components/Notifications/connectionRejection";
import { describeSimulationValueDraftError } from "../pages/edit/Editor/components/ValueEditor/value";
import { and } from "../store/intrinsics/definitions";
import { SimulationUnconnectedPinError } from "../store/netlist";
import simulateComponent from "../store/simulation";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	registerTestOutputNode,
	testComponentPin,
	testNodePin,
	thrownBy,
} from "../store/testUtils";
import { detectLanguage, messagesByLanguage } from "./messages";

describe("detectLanguage", () => {
	it("keeps the language chosen before", () => {
		expect(detectLanguage("ja", ["en-US"])).toBe("ja");
	});

	it("follows the first language of the browser it supports", () => {
		expect(detectLanguage(null, ["fr-FR", "ja-JP", "en"])).toBe("ja");
		expect(detectLanguage("unknown", ["en-GB"])).toBe("en");
	});

	it("falls back to English", () => {
		expect(detectLanguage(null, ["fr", "de"])).toBe("en");
	});
});

describe("Japanese messages", () => {
	const { ja } = messagesByLanguage;

	it("words a simulation error with the nodes named from the outside in", () => {
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

		expect(error.describe(store, ja.simulation)).toBe(
			"Half 内の And の入力ピン B がつながっていません。Half を開いてつないでください。",
		);
	});

	it("lists the inputs reset with their bit widths", () => {
		expect(
			ja.editor.inputValueReset([
				{ name: "A", bitWidth: 2 },
				{ name: "B", bitWidth: 1 },
			]),
		).toBe(
			"ビット幅に収まらなくなった入力値を 0 にリセットしました：A（2 ビット）、B（1 ビット）",
		);
	});

	it("words a refused connection and a rejected value", () => {
		expect(
			describeConnectionRejection(
				{ type: "bitWidthConflict", bitWidths: [[8], [4]] },
				ja,
			),
		).toBe("ビット幅が合いません（8 ビット と 4 ビット）");
		expect(
			describeSimulationValueDraftError(
				{ type: "tooWide", requiredBitWidth: 4, bitWidth: 3 },
				ja,
			),
		).toBe("4 ビット必要ですが、ビット幅は 3 です");
	});
});

describe("English messages", () => {
	it("lists the inputs reset with their bit widths", () => {
		expect(
			messagesByLanguage.en.editor.inputValueReset([
				{ name: "A", bitWidth: 2 },
				{ name: "B", bitWidth: 1 },
			]),
		).toBe(
			"Input values that no longer fit their bit width were reset to 0: A (2 bit), B (1 bit)",
		);
	});
});
