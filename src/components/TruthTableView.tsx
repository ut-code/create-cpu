import { Box, type Theme } from "@mui/material";
import { useContext } from "react";
import { bitDigit, bitLabel } from "../common/bitLabel";
import type { TruthTable } from "../store/intrinsics/truthTable";
import type { SimulationValue } from "../store/simulation";
import { theme } from "../style";
import { BitNotationContext } from "./bitNotation";

const divider = (muiTheme: Theme) => `1px solid ${muiTheme.palette.divider}`;

export function TruthTableView({ table }: { table: TruthTable }) {
	const bitLabelOf =
		useContext(BitNotationContext) === "digits" ? bitDigit : bitLabel;
	const labelOf = (value: SimulationValue) =>
		value.length === 1 && value[0] !== undefined
			? bitLabelOf(value[0])
			: value.map(bitDigit).join("");
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
			sx={{ borderCollapse: "collapse", fontSize: "0.875rem" }}
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
					<tr key={row.inputs.map(labelOf).join()}>
						{[...row.inputs, ...row.outputs].map((value, i) => (
							<Box
								key={columns[i]?.key}
								component="td"
								sx={{
									...cellSx(i),
									...(value.length === 1 &&
										value[0] && {
											color: theme.colors.primary,
											fontWeight: "bold",
										}),
								}}
							>
								{labelOf(value)}
							</Box>
						))}
					</tr>
				))}
			</tbody>
		</Box>
	);
}
