import { Box, type Theme } from "@mui/material";
import { createContext, useContext } from "react";
import { type BitNotation, bitDigit, bitLabel } from "../common/bitLabel";
import type { TruthTable } from "../store/intrinsics/truthTable";
import { theme } from "../style";

const divider = (theme: Theme) => `1px solid ${theme.palette.divider}`;

export const BitNotationContext = createContext<BitNotation>("onOff");

export function TruthTableView({ table }: { table: TruthTable }) {
	const labelOf =
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
					<tr key={row.inputs.join()}>
						{[...row.inputs, ...row.outputs].map((value, i) => (
							<Box
								key={columns[i]?.key}
								component="td"
								sx={{
									...cellSx(i),
									...(value && {
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
