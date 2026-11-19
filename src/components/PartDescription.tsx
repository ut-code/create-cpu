import { Box, Typography } from "@mui/material";
import { type Messages, useMessages } from "../i18n";
import type { CCComponent } from "../store/component";
import { definitionByComponentId } from "../store/intrinsics/definitions";
import { truthTableOf } from "../store/intrinsics/truthTable";
import { theme } from "../style";

type Summaries = Messages["parts"]["summaries"];

export function partSummary(
	messages: Messages,
	component: CCComponent,
): string | null {
	const type = component.intrinsicType;
	return type && type in messages.parts.summaries
		? messages.parts.summaries[type as keyof Summaries]
		: null;
}

export function PartDescription({ component }: { component: CCComponent }) {
	const messages = useMessages();
	const summary = partSummary(messages, component);
	const definition = definitionByComponentId.get(component.id);
	const table = definition && truthTableOf(definition);
	const columns = table ? [...table.inputs, ...table.outputs] : [];
	const cellSx = (column: number) =>
		({
			px: 1,
			py: 0.25,
			textAlign: "center",
			...(column === table?.inputs.length && {
				borderLeft: 1,
				borderColor: "divider",
			}),
		}) as const;

	return (
		<div>
			<Typography variant="subtitle2">{component.name}</Typography>
			{summary && <Typography variant="body2">{summary}</Typography>}
			{table && (
				<Box
					component="table"
					sx={{ mt: 0.5, borderCollapse: "collapse", fontSize: "0.875rem" }}
				>
					<thead>
						<tr>
							{columns.map((name, i) => (
								<Box
									key={name}
									component="th"
									sx={{ ...cellSx(i), borderBottom: 1, borderColor: "divider" }}
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
										key={columns[i]}
										component="td"
										sx={{
											...cellSx(i),
											...(value && {
												color: theme.colors.primary,
												fontWeight: "bold",
											}),
										}}
									>
										{value ? messages.common.on : messages.common.off}
									</Box>
								))}
							</tr>
						))}
					</tbody>
				</Box>
			)}
		</div>
	);
}
