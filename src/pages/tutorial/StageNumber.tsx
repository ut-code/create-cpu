import { Box } from "@mui/material";
import { visuallyHiddenSx } from "../../components/visuallyHidden";
import { useMessages } from "../../i18n";
import { theme } from "../../style";

/** The number of a stage in a circle, as the list and the stage itself show it */
export function StageNumber({ number }: { number: number }) {
	const messages = useMessages();
	return (
		<>
			<Box component="span" sx={visuallyHiddenSx}>
				{messages.tutorial.stageNumber(number)}
			</Box>
			<Box
				component="span"
				aria-hidden
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					flexShrink: 0,
					width: 32,
					height: 32,
					borderRadius: "50%",
					border: 2,
					borderColor: theme.colors.tutorial,
					color: theme.colors.tutorial,
					fontSize: "1.125rem",
					fontWeight: "bold",
				}}
			>
				{/* Trimmed to the digits, which otherwise sit low in their line */}
				<Box
					component="span"
					sx={{ display: "block", textBox: "trim-both cap alphabetic" }}
				>
					{number}
				</Box>
			</Box>
		</>
	);
}
