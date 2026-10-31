import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import { describe, expect, it } from "vitest";
import { testBits } from "../testUtils";
import type {
	IntrinsicComponentDefinition,
	IntrinsicEvaluationEnvironment,
	IntrinsicPinValues,
} from "./base";
import {
	aggregate,
	and,
	and_n,
	broadcast,
	const_,
	decompose,
	definitions,
	false_,
	flipflop,
	input,
	not,
	or,
	or_n,
	output,
	true_,
	xor,
} from "./definitions";
import type { CCIntrinsicComponentSpec } from "./types";

function evaluateCombinational<Spec extends CCIntrinsicComponentSpec>(
	definition: IntrinsicComponentDefinition<Spec>,
	inputs: IntrinsicPinValues<Spec["in"]>,
	environment: IntrinsicEvaluationEnvironment<Spec>,
): IntrinsicPinValues<Spec["out"]> {
	const behavior = nullthrows(definition.behavior);
	invariant(behavior.kind === "combinational");
	return behavior.evaluate(inputs, environment);
}

function evaluateSequential<Spec extends CCIntrinsicComponentSpec>(
	definition: IntrinsicComponentDefinition<Spec>,
	previousInputs: IntrinsicPinValues<Spec["in"]> | null,
	environment: IntrinsicEvaluationEnvironment<Spec>,
): IntrinsicPinValues<Spec["out"]> {
	const behavior = nullthrows(definition.behavior);
	invariant(behavior.kind === "sequential");
	return behavior.evaluate(previousInputs, environment);
}

describe("bitwise operators", () => {
	it("applies Not to each bit", () => {
		expect(
			evaluateCombinational(
				not,
				{ In: [testBits(0b0110, 4)] },
				{ outputBitWidths: { Out: [4] }, config: null },
			),
		).toEqual({ Out: [testBits(0b1001, 4)] });
	});

	it.each([
		{ definition: and, expected: 0b1000 },
		{ definition: or, expected: 0b1110 },
		{ definition: xor, expected: 0b0110 },
	])(
		"applies $definition.name to each pair of bits",
		({ definition, expected }) => {
			expect(
				evaluateCombinational(
					definition,
					{ A: [testBits(0b1100, 4)], B: [testBits(0b1010, 4)] },
					{ outputBitWidths: { Out: [4] }, config: null },
				),
			).toEqual({ Out: [testBits(expected, 4)] });
		},
	);

	it("rejects operands of different widths", () => {
		expect(() =>
			evaluateCombinational(
				and,
				{ A: [testBits(0, 4)], B: [testBits(0, 2)] },
				{ outputBitWidths: { Out: [4] }, config: null },
			),
		).toThrow();
	});
});

describe("constants", () => {
	it.each([
		{ definition: true_, bit: true },
		{ definition: false_, bit: false },
	])(
		"fills the output of $definition.name to its bit width",
		({ definition, bit }) => {
			expect(
				evaluateCombinational(
					definition,
					{},
					{ outputBitWidths: { Out: [3] }, config: null },
				),
			).toEqual({ Out: [[bit, bit, bit]] });
		},
	);

	it("outputs the data configured on a Const node", () => {
		const data = testBits(0b101, 3);
		expect(
			evaluateCombinational(
				const_,
				{},
				{ outputBitWidths: { Out: [3] }, config: { mode: "binary", data } },
			),
		).toEqual({ Out: [data] });
	});
});

describe("bit width conversions", () => {
	it("concatenates the split input pins of Aggregate in pin order", () => {
		expect(
			evaluateCombinational(
				aggregate,
				{ In: [testBits(0b10, 2), testBits(0b011, 3)] },
				{ outputBitWidths: { Out: [5] }, config: null },
			),
		).toEqual({ Out: [testBits(0b10011, 5)] });
	});

	it("splits the input of Decompose by the widths of its output pins", () => {
		expect(
			evaluateCombinational(
				decompose,
				{ In: [testBits(0b10011, 5)] },
				{ outputBitWidths: { Out: [2, 3] }, config: null },
			),
		).toEqual({ Out: [testBits(0b10, 2), testBits(0b011, 3)] });
	});

	it("repeats the input bit of Broadcast to the output width", () => {
		expect(
			evaluateCombinational(
				broadcast,
				{ In: [[true]] },
				{ outputBitWidths: { Out: [4] }, config: null },
			),
		).toEqual({ Out: [testBits(0b1111, 4)] });
	});

	it("rejects a Broadcast input wider than one bit", () => {
		expect(() =>
			evaluateCombinational(
				broadcast,
				{ In: [testBits(0b11, 2)] },
				{ outputBitWidths: { Out: [4] }, config: null },
			),
		).toThrow();
	});
});

describe("reductions", () => {
	it("reduces every bit of every input pin of AndN", () => {
		const environment = { outputBitWidths: { Out: [1] }, config: null };
		expect(
			evaluateCombinational(
				and_n,
				{ In: [testBits(0b11, 2), [true]] },
				environment,
			),
		).toEqual({ Out: [[true]] });
		expect(
			evaluateCombinational(
				and_n,
				{ In: [testBits(0b11, 2), [false]] },
				environment,
			),
		).toEqual({ Out: [[false]] });
	});

	it("reduces every bit of every input pin of OrN", () => {
		const environment = { outputBitWidths: { Out: [1] }, config: null };
		expect(
			evaluateCombinational(
				or_n,
				{ In: [testBits(0b00, 2), [true]] },
				environment,
			),
		).toEqual({ Out: [[true]] });
		expect(
			evaluateCombinational(
				or_n,
				{ In: [testBits(0b00, 2), [false]] },
				environment,
			),
		).toEqual({ Out: [[false]] });
	});
});

describe("FlipFlop", () => {
	it("is the only sequential intrinsic", () => {
		const sequential = Object.values(definitions).filter(
			(definition) => definition.behavior?.kind === "sequential",
		);
		expect(sequential).toEqual([flipflop]);
	});

	it("starts from zero before anything has been fed to it", () => {
		expect(
			evaluateSequential(flipflop, null, {
				outputBitWidths: { Out: [3] },
				config: null,
			}),
		).toEqual({ Out: [testBits(0, 3)] });
	});

	it("outputs its input of the previous time step", () => {
		expect(
			evaluateSequential(
				flipflop,
				{ In: [testBits(0b101, 3)] },
				{ outputBitWidths: { Out: [3] }, config: null },
			),
		).toEqual({ Out: [testBits(0b101, 3)] });
	});
});

describe("component boundaries", () => {
	it("leaves Input and Output without a behavior to evaluate", () => {
		expect(input.behavior).toBeNull();
		expect(output.behavior).toBeNull();
	});
});
