import { Box, type Theme } from "@mui/material";
import { useContext } from "react";
import { bitDigit, bitLabel } from "../common/bitLabel";
import type { TruthTable } from "../store/intrinsics/truthTable";
import type { SimulationValue } from "../store/simulation";
import { theme } from "../style";
import { BitNotationContext } from "./bitNotation";

const divider = (muiTheme: Theme) => `1px solid ${muiTheme.palette.divider}`;
const onSx = { color: theme.colors.primary, fontWeight: "bold" } as const;
const binaryOf = (value: SimulationValue) => value.map(bitDigit).join("");

export function TruthTableView({ table }: { table: TruthTable }) {
	const singleBitLabel =
		useContext(BitNotationContext) === "digits" ? bitDigit : bitLabel;
	const columns = [
		...table.inputs.map((name) => ({ key: `in-${name}`, name })),
		...table.outputs.map((name) => ({ key: `out-${name}`, name })),
	];
	const cellSx = (column: number) =>
		({
			px: 1,
			py: 0.25,
			textAlign: "center",
			...(table.inputs.length > 0 &&
				column === table.inputs.length && { borderLeft: divider }),
		}) as const;

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
				{table.rows.map((row) => (
					<tr key={row.inputs.map(binaryOf).join()}>
						{[...row.inputs, ...row.outputs].map((value, i) => (
							<Box key={columns[i]?.key} component="td" sx={cellSx(i)}>
								{value.map((bit, index) => (
									<Box
										// biome-ignore lint/suspicious/noArrayIndexKey: bits are identified by their index
										key={index}
										component="span"
										sx={bit ? onSx : {}}
									>
										{value.length === 1 ? singleBitLabel(bit) : bitDigit(bit)}
									</Box>
								))}
							</Box>
						))}
					</tr>
				))}
			</tbody>
		</Box>
	);
}
