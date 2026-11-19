import { bitDigit } from "../common/bitLabel";
import type { TruthTable } from "../store/intrinsics/truthTable";
import type { SimulationValue } from "../store/simulation";

export type TruthTableColumn = {
	key: string;
	name: string;
	/** A line on its left parts it from the columns before */
	startsGroup: boolean;
};

export type TruthTableLine =
	| {
			type: "row";
			key: string;
			/** null when the table has no column of time steps */
			stepLabel: string | null;
			values: SimulationValue[];
	  }
	| { type: "gap"; key: string };

const binaryOf = (value: SimulationValue) => value.map(bitDigit).join("");

const hasStepColumn = (table: TruthTable) =>
	table.rows.some((row) => row.stepNumber !== undefined);

export function truthTableColumnsOf(
	table: TruthTable,
	stepColumnName: string,
): TruthTableColumn[] {
	const groups = [
		hasStepColumn(table) ? [{ key: "step", name: stepColumnName }] : [],
		table.inputs.map((name) => ({ key: `in-${name}`, name })),
		table.outputs.map((name) => ({ key: `out-${name}`, name })),
	].filter((group) => group.length > 0);
	return groups.flatMap((group, groupIndex) =>
		group.map((column, index) => ({
			...column,
			startsGroup: groupIndex > 0 && index === 0,
		})),
	);
}

/** The rows of a table, with a gap where it skips time steps */
export function truthTableLinesOf(table: TruthTable): TruthTableLine[] {
	const hasSteps = hasStepColumn(table);
	return table.rows.flatMap((row, index): TruthTableLine[] => {
		const { stepNumber } = row;
		const previousStepNumber = table.rows[index - 1]?.stepNumber;
		const isAfterGap =
			stepNumber !== undefined &&
			previousStepNumber !== undefined &&
			stepNumber > previousStepNumber + 1;
		const key =
			stepNumber === undefined
				? row.inputs.map(binaryOf).join()
				: String(stepNumber);
		return [
			...(isAfterGap ? [{ type: "gap" as const, key: `gap-${key}` }] : []),
			{
				type: "row",
				key,
				stepLabel: hasSteps ? String(stepNumber ?? "") : null,
				values: [...row.inputs, ...row.outputs],
			},
		];
	});
}
