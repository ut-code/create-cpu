import { Box, type Theme } from "@mui/material";
import { useContext } from "react";
import { bitDigit, bitLabel } from "../common/bitLabel";
import { useMessages } from "../i18n";
import type { TruthTable } from "../store/intrinsics/truthTable";
import type { SimulationValue } from "../store/simulation";
import { theme } from "../style";
import { BitNotationContext } from "./bitNotation";
import { truthTableColumnsOf, truthTableLinesOf } from "./truthTableLayout";

const divider = (muiTheme: Theme) => `1px solid ${muiTheme.palette.divider}`;
const onSx = { color: theme.colors.primary, fontWeight: "bold" } as const;

export function TruthTableView({ table }: { table: TruthTable }) {
	const messages = useMessages();
	const singleBitLabel =
		useContext(BitNotationContext) === "digits" ? bitDigit : bitLabel;
	const columns = truthTableColumnsOf(table, messages.truthTable.timeStep);
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
				{truthTableLinesOf(table).map((line) => {
					const cells =
						line.type === "gap"
							? columns.map(() => "⋮")
							: [
									...(line.stepLabel === null ? [] : [line.stepLabel]),
									...line.values.map(valueCell),
								];
					return (
						<tr key={line.key}>
							{cells.map((cell, i) => (
								<Box key={columns[i]?.key} component="td" sx={cellSx(i)}>
									{cell}
								</Box>
							))}
						</tr>
					);
				})}
			</tbody>
		</Box>
	);
}
