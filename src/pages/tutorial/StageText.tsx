import {
	ChevronLeft,
	ChevronRight,
	Edit,
	PlayArrow,
} from "@mui/icons-material";
import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { ValueView } from "../../components/ValueView";
import { useMessages } from "../../i18n";
import { theme } from "../../style";
import {
	parseStageText,
	type StageTextControl,
	type StageTextSegment,
} from "../../tutorial/stageText";

// Smaller than the real controls and not clickable, so that they are not taken for them
const buttonSx = {
	display: "inline-block",
	mx: 0.25,
	px: 0.75,
	borderRadius: 1,
	fontSize: "0.8125em",
	fontWeight: 500,
	lineHeight: 1.6,
	letterSpacing: "0.02857em",
	textTransform: "uppercase",
	whiteSpace: "nowrap",
	userSelect: "none",
} as const;

const iconSx = {
	display: "inline-flex",
	verticalAlign: "-0.25em",
	mx: 0.25,
} as const;

function ControlView({ control }: { control: StageTextControl }) {
	const messages = useMessages();
	const button = (label: string, sx: SxProps<Theme>) => (
		<Box component="span" sx={[buttonSx, ...(Array.isArray(sx) ? sx : [sx])]}>
			{label}
		</Box>
	);
	const roundIcon = (icon: ReactNode) => (
		<Box
			component="span"
			aria-hidden
			sx={{
				...iconSx,
				justifyContent: "center",
				alignItems: "center",
				width: "1.4em",
				height: "1.4em",
				borderRadius: "50%",
				background: theme.colors.primary,
				color: theme.colors.white,
				fontSize: "1em",
				"& svg": { fontSize: "1em" },
			}}
		>
			{icon}
		</Box>
	);
	const plainIcon = (icon: ReactNode) => (
		<Box
			component="span"
			aria-hidden
			sx={{
				...iconSx,
				color: "action.active",
				"& svg": { fontSize: "1.25em" },
			}}
		>
			{icon}
		</Box>
	);
	switch (control) {
		case "check":
			return button(messages.tutorial.check, {
				background: theme.colors.tutorial,
				color: theme.colors.white,
			});
		case "constApply":
			return button(messages.common.apply, {
				border: 1,
				borderColor: "primary.main",
				color: "primary.main",
			});
		case "pinApply":
			return button(messages.common.apply, {
				background: theme.colors.primary,
				color: theme.colors.white,
			});
		case "auto":
			return button(messages.editor.frameControl.auto, {
				border: 1,
				borderColor: "divider",
				color: "action.active",
			});
		case "enter":
			return (
				<Box
					component="kbd"
					sx={{
						...buttonSx,
						textTransform: "none",
						fontFamily: "inherit",
						border: 1,
						borderBottomWidth: 2,
						borderColor: "divider",
					}}
				>
					Enter
				</Box>
			);
		case "play":
			return roundIcon(<PlayArrow />);
		case "edit":
			return roundIcon(<Edit />);
		case "previousStep":
			return plainIcon(<ChevronLeft />);
		case "nextStep":
			return plainIcon(<ChevronRight />);
	}
}

function SegmentView({ segment }: { segment: StageTextSegment }) {
	switch (segment.type) {
		case "text":
			return segment.text;
		case "name":
			return <b>{segment.name}</b>;
		case "value":
			// Bold as a whole, so that a value of OFFs stands out of the text too
			return (
				<b>
					<ValueView value={segment.value} notation={segment.notation} />
				</b>
			);
		case "control":
			return <ControlView control={segment.control} />;
	}
}

/** A stage text with the names, values and controls it marks drawn as on the screen */
export function StageText({ text }: { text: string }) {
	return parseStageText(text).map((segment, index) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: the segments of a text keep their order
		<SegmentView key={index} segment={segment} />
	));
}
