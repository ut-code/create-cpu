import { describe, expect, it } from "vitest";
import type { IntrinsicComponentDefinition } from "./base";
import {
	and,
	and_n,
	const_,
	definitions,
	display,
	flipflop,
	input,
	not,
	true_,
	xor,
} from "./definitions";
import { truthTableOf } from "./truthTable";

describe("truthTableOf", () => {
	it("tells the output of a gate for every combination of its inputs", () => {
		expect(truthTableOf(and)).toEqual({
			inputs: ["A", "B"],
			outputs: ["Out"],
			rows: [
				{ inputs: [[false], [false]], outputs: [[false]] },
				{ inputs: [[false], [true]], outputs: [[false]] },
				{ inputs: [[true], [false]], outputs: [[false]] },
				{ inputs: [[true], [true]], outputs: [[true]] },
			],
		});
		expect(truthTableOf(xor)?.rows.map((row) => row.outputs[0])).toEqual([
			[false],
			[true],
			[true],
			[false],
		]);
		expect(truthTableOf(not)?.rows).toEqual([
			{ inputs: [[false]], outputs: [[true]] },
			{ inputs: [[true]], outputs: [[false]] },
		]);
		expect(truthTableOf(true_)?.rows).toEqual([
			{ inputs: [], outputs: [[true]] },
		]);
	});

	it("gives none for components a table would not show", () => {
		expect(truthTableOf(input)).toBeNull();
		expect(truthTableOf(flipflop)).toBeNull();
		expect(truthTableOf(display)).toBeNull();
		expect(truthTableOf(const_)).toBeNull();
		expect(truthTableOf(and_n)).toBeNull();
	});

	it("can be asked of any part", () => {
		for (const definition of Object.values(definitions)) {
			expect(() =>
				truthTableOf(definition as IntrinsicComponentDefinition),
			).not.toThrow();
		}
	});
});
