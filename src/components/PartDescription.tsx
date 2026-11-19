import { Box, Typography } from "@mui/material";
import { type Messages, useMessages } from "../i18n";
import type { CCComponent } from "../store/component";
import { definitionByComponentId } from "../store/intrinsics/definitions";
import { type TruthTable, truthTableOf } from "../store/intrinsics/truthTable";
import { TruthTableView } from "./TruthTableView";

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
	const definition = definitionByComponentId.get(component.id);
	return (
		<PartDescriptionView
			name={component.name}
			summary={partSummary(messages, component)}
			table={definition ? truthTableOf(definition) : null}
		/>
	);
}

export function PartDescriptionView({
	name,
	summary,
	table,
}: {
	name: string;
	summary: string | null;
	table: TruthTable | null;
}) {
	return (
		<div>
			<Typography
				variant="subtitle1"
				component="h4"
				sx={{ fontWeight: "bold" }}
			>
				{name}
			</Typography>
			{summary && <Typography variant="body2">{summary}</Typography>}
			{table && (
				<Box sx={{ mt: 0.5 }}>
					<TruthTableView table={table} />
				</Box>
			)}
		</div>
	);
}
