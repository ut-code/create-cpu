import {
	ChevronLeft,
	ChevronRight,
	Edit,
	PlayArrow,
} from "@mui/icons-material";
import { Box, Button, type ButtonProps, ToggleButton } from "@mui/material";
import type { ReactNode } from "react";
import {
	autoToggleButtonLook,
	checkButtonLook,
	pinApplyButtonLook,
	valueApplyButtonLook,
} from "../../components/controlLooks";
import { ValueView } from "../../components/ValueView";
import { useMessages } from "../../i18n";
import {
	parseStageText,
	type StageTextControl,
	type StageTextSegment,
} from "../../tutorial/stageText";

// The real controls with their looks, smaller and inert, so that they are not taken
// for controls to press
const inlineSx = {
	mx: 0.25,
	px: 0.75,
	py: 0,
	minWidth: 0,
	fontSize: "0.8125em",
	lineHeight: 1.6,
	verticalAlign: "baseline",
	boxShadow: "none",
} as const;

const iconSx = {
	display: "inline-flex",
	verticalAlign: "-0.25em",
	mx: 0.25,
} as const;

function InlineButton({ look, label }: { look: ButtonProps; label: string }) {
	return (
		<Button
			{...look}
			component="span"
			inert
			disableRipple
			sx={[inlineSx, ...(Array.isArray(look.sx) ? look.sx : [look.sx])]}
		>
			{label}
		</Button>
	);
}

function ControlView({ control }: { control: StageTextControl }) {
	const messages = useMessages();
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
				// As the play button, a Fab of the primary color
				bgcolor: "primary.main",
				color: "primary.contrastText",
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
			return (
				<InlineButton look={checkButtonLook} label={messages.tutorial.check} />
			);
		case "constApply":
			return (
				<InlineButton
					look={valueApplyButtonLook}
					label={messages.common.apply}
				/>
			);
		case "pinApply":
			return (
				<InlineButton look={pinApplyButtonLook} label={messages.common.apply} />
			);
		case "auto":
			return (
				<ToggleButton
					{...autoToggleButtonLook}
					value="auto"
					component="span"
					inert
					disableRipple
					sx={inlineSx}
				>
					{messages.editor.frameControl.auto}
				</ToggleButton>
			);
		case "enter":
			return (
				<Box
					component="kbd"
					sx={{
						...inlineSx,
						display: "inline-block",
						fontFamily: "inherit",
						border: 1,
						borderBottomWidth: 2,
						borderColor: "divider",
						borderRadius: 1,
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
