import { Box, Typography } from "@mui/material";
import { type Messages, useMessages } from "../i18n";
import type { CCComponent } from "../store/component";
import { IntrinsicComponentDefinition } from "../store/intrinsics/base";
import { definitionByComponentId } from "../store/intrinsics/definitions";
import { type TruthTable, truthTableOf } from "../store/intrinsics/truthTable";
import { MarkedText } from "./MarkedText";
import { TruthTableView } from "./TruthTableView";

export function partSummary(
	messages: Messages,
	component: CCComponent,
): string | null {
	const type = component.intrinsicType;
	return type ? messages.parts.summaries[type] : null;
}

/** How to set the pins whose bit widths the player chooses, which nothing else tells */
export function pinNotesOf(
	messages: Messages,
	definition: IntrinsicComponentDefinition,
): string[] {
	return definition.allPins.flatMap((pin) => {
		const policy = IntrinsicComponentDefinition.getPinAttributesByPinId(
			pin.id,
		)?.bitWidthPolicy;
		return policy?.type === "configurable"
			? [messages.parts.pinBitWidth(pin.name, policy.isSplittable)]
			: [];
	});
}

export function PartDescription({ component }: { component: CCComponent }) {
	const messages = useMessages();
	const definition = definitionByComponentId.get(component.id);
	return (
		<PartDescriptionView
			name={component.name}
			summary={partSummary(messages, component)}
			notes={definition ? pinNotesOf(messages, definition) : []}
			table={definition ? truthTableOf(definition) : null}
		/>
	);
}

export function PartDescriptionView({
	name,
	summary,
	notes = [],
	table,
}: {
	name: string;
	summary: string | null;
	notes?: readonly string[];
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
			{summary && (
				<Typography variant="body2">
					<MarkedText text={summary} />
				</Typography>
			)}
			{notes.map((note) => (
				<Typography key={note} variant="body2" sx={{ mt: 0.5 }}>
					<MarkedText text={note} />
				</Typography>
			))}
			{table && (
				<Box sx={{ mt: 0.5, overflowX: "auto" }}>
					<TruthTableView table={table} />
				</Box>
			)}
		</div>
	);
}
