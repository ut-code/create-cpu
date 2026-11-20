import { Box } from "@mui/material";
import { type BitNotation, bitDigit, bitLabel } from "../common/bitLabel";
import type { SimulationValue } from "../store/simulation";
import { theme } from "../style";

const onSx = { color: theme.colors.primary, fontWeight: "bold" } as const;

/** A value as the tables write it, with the bits that are ON stressed */
export function ValueView({
	value,
	notation,
}: {
	value: SimulationValue;
	notation: BitNotation;
}) {
	const singleBitLabel = notation === "digits" ? bitDigit : bitLabel;
	return value.map((bit, index) => (
		<Box
			// biome-ignore lint/suspicious/noArrayIndexKey: bits are identified by their index
			key={index}
			component="span"
			sx={bit ? onSx : {}}
		>
			{value.length === 1 ? singleBitLabel(bit) : bitDigit(bit)}
		</Box>
	));
}
