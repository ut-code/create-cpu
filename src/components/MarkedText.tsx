import {
	ChevronLeft,
	ChevronRight,
	Edit,
	PlayArrow,
} from "@mui/icons-material";
import { Box, Button, type ButtonProps, ToggleButton } from "@mui/material";
import type { ReactNode } from "react";
import {
	type MarkedTextControl,
	type MarkedTextSegment,
	parseMarkedText,
} from "../common/markedText";
import { useMessages } from "../i18n";
import {
	autoToggleButtonLook,
	checkButtonLook,
	pinApplyButtonLook,
	pinFieldButtonLook,
	valueApplyButtonLook,
	withLookSx,
} from "./controlLooks";
import { ValueView } from "./ValueView";
import { visuallyHiddenSx } from "./visuallyHidden";

// The real controls with their looks, smaller and not to be pressed. The label is read
// out from a hidden copy, as the control itself is hidden from screen readers.
const inlineSx = {
	mx: 0.25,
	px: 0.75,
	py: 0,
	minWidth: 0,
	fontSize: "0.8125em",
	lineHeight: 1.6,
	verticalAlign: "baseline",
	boxShadow: "none",
	pointerEvents: "none",
} as const;

const iconSx = {
	display: "inline-flex",
	verticalAlign: "-0.25em",
	mx: 0.25,
} as const;

function InlineControl({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<>
			<Box component="span" aria-hidden>
				{children}
			</Box>
			<Box component="span" sx={visuallyHiddenSx}>
				{label}
			</Box>
		</>
	);
}

function InlineButton({ look, label }: { look: ButtonProps; label: string }) {
	return (
		<InlineControl label={label}>
			<Button
				{...look}
				component="span"
				tabIndex={-1}
				disableRipple
				sx={withLookSx(look, inlineSx)}
			>
				{label}
			</Button>
		</InlineControl>
	);
}

function ControlView({ control }: { control: MarkedTextControl }) {
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
		case "pinAdd":
			return (
				<InlineButton
					look={pinFieldButtonLook}
					label={messages.editor.nodePinBitWidth.add}
				/>
			);
		case "pinRemove":
			return (
				<InlineButton
					look={pinFieldButtonLook}
					label={messages.editor.nodePinBitWidth.remove}
				/>
			);
		case "auto":
			return (
				<InlineControl label={messages.editor.frameControl.auto}>
					<ToggleButton
						{...autoToggleButtonLook}
						value="auto"
						component="span"
						tabIndex={-1}
						disableRipple
						sx={withLookSx(autoToggleButtonLook, inlineSx)}
					>
						{messages.editor.frameControl.auto}
					</ToggleButton>
				</InlineControl>
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

function SegmentView({ segment }: { segment: MarkedTextSegment }) {
	switch (segment.type) {
		case "text":
			return segment.text;
		case "name":
			// Lighter than values, as a text names many pins and parts
			return (
				<Box component="b" sx={{ fontWeight: 500 }}>
					{segment.name}
				</Box>
			);
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

/** A text with the names, values and controls it marks drawn as on the screen */
export function MarkedText({ text }: { text: string }) {
	return parseMarkedText(text).map((segment, index) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: the segments of a text keep their order
		<SegmentView key={index} segment={segment} />
	));
}
