import { describe, expect, it } from "vitest";
import type { TruthTable } from "../store/intrinsics/truthTable";
import { truthTableColumnsOf, truthTableLinesOf } from "./truthTableLayout";

const overTime: TruthTable = {
	inputs: [],
	outputs: ["Count"],
	rows: [1, 2, 16, 17].map((stepNumber) => ({
		inputs: [],
		outputs: [[stepNumber % 2 === 0]],
		stepNumber,
	})),
};

describe("truthTableColumnsOf", () => {
	it("parts the inputs from the outputs", () => {
		const table: TruthTable = { inputs: ["A"], outputs: ["Out"], rows: [] };

		expect(truthTableColumnsOf(table, "Step")).toEqual([
			{ key: "in-A", name: "A", startsGroup: false },
			{ key: "out-Out", name: "Out", startsGroup: true },
		]);
	});

	it("puts the time steps first, parted from a table without inputs", () => {
		expect(truthTableColumnsOf(overTime, "Step")).toEqual([
			{ key: "step", name: "Step", startsGroup: false },
			{ key: "out-Count", name: "Count", startsGroup: true },
		]);
	});
});

describe("truthTableLinesOf", () => {
	it("puts a gap only where steps are skipped, and keys rows by their step", () => {
		expect(
			truthTableLinesOf(overTime).map((line) =>
				line.type === "gap" ? "gap" : `${line.key}:${line.stepLabel}`,
			),
		).toEqual(["1:1", "2:2", "gap", "16:16", "17:17"]);
	});

	it("gives no step to a table that does not run over time", () => {
		const table: TruthTable = {
			inputs: ["A"],
			outputs: ["Out"],
			rows: [false, true].map((a) => ({ inputs: [[a]], outputs: [[!a]] })),
		};

		expect(truthTableLinesOf(table)).toEqual([
			{ type: "row", key: "0", stepLabel: null, values: [[false], [true]] },
			{ type: "row", key: "1", stepLabel: null, values: [[true], [false]] },
		]);
	});
});
