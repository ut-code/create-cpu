import {
	Button,
	Stack,
	styled,
	ToggleButton,
	ToggleButtonGroup,
} from "@mui/material";
import { useState } from "react";
import type { CCIntrinsicComponentConstSpecConfigViewMode as Mode } from "../../../../../store/intrinsics/types";
import type { SimulationValue } from "../../../../../store/simulation";
import {
	fitSimulationValue,
	formatSimulationValue,
	parseSimulationValue,
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
	const [text, setText] = useState(() =>
		formatSimulationValue(props.value, props.mode),
	);

	const parse = (text: string, mode: Mode) => {
		const value = parseSimulationValue(text, mode);
		return value && props.bitWidth !== undefined
			? fitSimulationValue(value, props.bitWidth)
			: value;
	};
	const newValue = parse(text, props.mode);

	const changeMode = (mode: Mode) => {
		props.onModeChange(mode);
		setText(formatSimulationValue(newValue ?? props.value, mode));
	};

	return (
		<Stack sx={{ height: "100%", gap: 0.5 }}>
			<Stack direction="row" sx={{ gap: 0.5 }}>
				<ToggleButtonGroup
					value={props.mode}
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
						Apply
					</Button>
				)}
			</Stack>
			<Editor
				value={text}
				onChange={(e) => setText(e.target.value)}
				spellCheck={false}
				sx={{ borderColor: newValue ? "divider" : "error.main" }}
				readOnly={props.readOnly ?? false}
			/>
		</Stack>
	);
}
