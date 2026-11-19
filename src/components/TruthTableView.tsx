import { Box, type Theme } from "@mui/material";
import { Fragment, useContext } from "react";
import { bitDigit, bitLabel } from "../common/bitLabel";
import { useMessages } from "../i18n";
import type { TruthTable } from "../store/intrinsics/truthTable";
import type { SimulationValue } from "../store/simulation";
import { theme } from "../style";
import { BitNotationContext } from "./bitNotation";

const divider = (muiTheme: Theme) => `1px solid ${muiTheme.palette.divider}`;
const onSx = { color: theme.colors.primary, fontWeight: "bold" } as const;
const binaryOf = (value: SimulationValue) => value.map(bitDigit).join("");

export function TruthTableView({ table }: { table: TruthTable }) {
	const messages = useMessages();
	const singleBitLabel =
		useContext(BitNotationContext) === "digits" ? bitDigit : bitLabel;
	const { stepNumbers } = table;
	const groups = [
		...(stepNumbers
			? [[{ key: "step", name: messages.tutorial.timeStepColumn }]]
			: []),
		table.inputs.map((name) => ({ key: `in-${name}`, name })),
		table.outputs.map((name) => ({ key: `out-${name}`, name })),
	].filter((group) => group.length > 0);
	const columns = groups.flatMap((group, groupIndex) =>
		group.map((column, index) => ({
			...column,
			startsGroup: groupIndex > 0 && index === 0,
		})),
	);
	const cellSx = (column: number) =>
		({
			px: 1,
			py: 0.25,
			textAlign: "center",
			...(columns[column]?.startsGroup && { borderLeft: divider }),
		}) as const;
	const valueCell = (value: SimulationValue) =>
		value.map((bit, index) => (
			<Box
				// biome-ignore lint/suspicious/noArrayIndexKey: bits are identified by their index
				key={index}
				component="span"
				sx={bit ? onSx : {}}
			>
				{value.length === 1 ? singleBitLabel(bit) : bitDigit(bit)}
			</Box>
		));

	return (
		<Box
			component="table"
			sx={{
				borderCollapse: "collapse",
				fontSize: "0.875rem",
				fontVariantNumeric: "tabular-nums",
			}}
		>
			<thead>
				<tr>
					{columns.map(({ key, name }, i) => (
						<Box
							key={key}
							component="th"
							sx={{ ...cellSx(i), borderBottom: divider }}
						>
							{name}
						</Box>
					))}
				</tr>
			</thead>
			<tbody>
				{table.rows.map((row, rowIndex) => {
					const stepNumber = stepNumbers?.[rowIndex];
					const previousStepNumber = stepNumbers?.[rowIndex - 1];
					const cells = [
						...(stepNumber === undefined ? [] : [String(stepNumber)]),
						...[...row.inputs, ...row.outputs].map(valueCell),
					];
					return (
						<Fragment key={stepNumber ?? row.inputs.map(binaryOf).join()}>
							{stepNumber !== undefined &&
								previousStepNumber !== undefined &&
								stepNumber > previousStepNumber + 1 && (
									<tr>
										{columns.map(({ key }, i) => (
											<Box key={key} component="td" sx={cellSx(i)}>
												⋮
											</Box>
										))}
									</tr>
								)}
							<tr>
								{cells.map((cell, i) => (
									<Box key={columns[i]?.key} component="td" sx={cellSx(i)}>
										{cell}
									</Box>
								))}
							</tr>
						</Fragment>
					);
				})}
			</tbody>
		</Box>
	);
}
