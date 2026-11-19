import {
	Button,
	Stack,
	styled,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { useId, useState } from "react";
import { useMessages } from "../../../../../i18n";
import type { CCIntrinsicComponentConstSpecConfigViewMode as Mode } from "../../../../../store/intrinsics/types";
import type { SimulationValue } from "../../../../../store/simulation";
import {
	changeSimulationValueDraftMode,
	describeSimulationValueDraftError,
	formatSimulationValue,
	formatSimulationValueDraft,
	parseSimulationValueDraft,
} from "./value";

const modes: Record<Mode, string> = {
	binary: "Bin",
	hex: "Hex",
	"utf-8": "UTF-8",
};

const Editor = styled("textarea")(({ theme }) => ({
	padding: theme.spacing(1),
	flex: 1,
	resize: "none",
	borderStyle: "solid",
	borderWidth: "1px",
	borderRadius: theme.shape.borderRadius,
	outline: "none",
	fontFamily: "monospace",
	wordBreak: "break-all",
}));

type Props = {
	value: SimulationValue;
	onChange: (value: SimulationValue) => void;
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	bitWidth?: number;
	readOnly?: boolean;
};

export function CCComponentEditorValueEditor(props: Props) {
	const bitWidthId = useId();
	const messages = useMessages();
	const [readOnlyMode, setReadOnlyMode] = useState(props.mode);
	const mode = props.readOnly ? readOnlyMode : props.mode;
	// Formatted text does not always parse back to the same value, so a mode change formats
	// the kept value instead
	const [draft, setDraft] = useState(() =>
		formatSimulationValueDraft(props.value, props.mode),
	);
	const text = props.readOnly
		? formatSimulationValue(props.value, mode)
		: draft.text;
	const newValue = props.readOnly ? props.value : draft.value;
	const error = props.readOnly ? null : draft.error;

	const changeMode = (newMode: Mode) => {
		if (props.readOnly) {
			setReadOnlyMode(newMode);
			return;
		}
		props.onModeChange(newMode);
		setDraft(changeSimulationValueDraftMode(draft, props.value, newMode));
	};

	return (
		<Stack sx={{ height: "100%", gap: 0.5 }}>
			<Stack direction="row" sx={{ gap: 0.5 }}>
				<ToggleButtonGroup
					value={mode}
					onChange={(_, value) => {
						if (!Object.hasOwn(modes, value)) return;
						changeMode(value as Mode);
					}}
					exclusive
					size="small"
					sx={{ flex: 1 }}
				>
					{Object.entries(modes).map(([mode, label]) => (
						<ToggleButton key={mode} value={mode} sx={{ flex: 1, p: 0.25 }}>
							{label}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				{!props.readOnly && (
					<Button
						variant="outlined"
						size="small"
						disabled={!newValue}
						onClick={() => newValue && props.onChange(newValue)}
						sx={{ py: 0.25 }}
					>
						{messages.common.apply}
					</Button>
				)}
			</Stack>
			<Editor
				value={text}
				onChange={(e) =>
					setDraft(
						parseSimulationValueDraft(e.target.value, mode, props.bitWidth),
					)
				}
				spellCheck={false}
				sx={{ borderColor: newValue ? "divider" : "error.main" }}
				readOnly={props.readOnly ?? false}
				aria-invalid={!newValue}
				aria-describedby={bitWidthId}
			/>
			{/* The text may not tell the width, e.g. 3 bits shown as 5 in hex */}
			<Typography
				id={bitWidthId}
				variant="caption"
				color={error ? "error" : "text.secondary"}
				sx={{ alignSelf: "flex-end", minHeight: "1.66em" }}
			>
				{error
					? describeSimulationValueDraftError(error, messages)
					: newValue && messages.editor.valueEditor.bits(newValue.length)}
			</Typography>
		</Stack>
	);
}
