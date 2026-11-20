import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Box, IconButton, Paper, TextField, ToggleButton } from "@mui/material";
import { useState } from "react";
import { useInterval } from "react-use";
import { autoToggleButtonLook } from "../../../../components/controlLooks";
import { useMessages } from "../../../../i18n";
import { useComponentEditorStore } from "../store";
import {
	isValidPlaybackSpeed,
	MAX_PLAYBACK_SPEED,
	MIN_PLAYBACK_SPEED,
	parseTimeStepNumber,
} from "../store/slices/core/types";

export default function CCComponentEditorFrameControl() {
	const componentEditorStore = useComponentEditorStore();
	const componentEditorState = componentEditorStore();
	const messages = useMessages();
	const [speedInput, setSpeedInput] = useState(
		String(componentEditorState.playbackSpeed),
	);
	const [stepDraft, setStepDraft] = useState<string | null>(null);
	const isAutomatic = componentEditorState.playbackMode === "auto";
	const isSpeedValid = isValidPlaybackSpeed(Number(speedInput));

	useInterval(
		() => {
			const state = componentEditorStore.getState();
			if (state.editorMode === "play" && state.playbackMode === "auto") {
				state.setTimeStep(state.timeStep + 1);
			}
		},
		componentEditorState.editorMode === "play" && isAutomatic
			? 1000 / componentEditorState.playbackSpeed
			: null,
	);

	if (componentEditorState.editorMode === "edit") return null;

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				pointerEvents: "none",
			}}
		>
			<Paper
				sx={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "center",
					gap: 1,
					p: 1,
					borderRadius: 3,
					pointerEvents: "auto",
				}}
				elevation={3}
			>
				<ToggleButton
					{...autoToggleButtonLook}
					value="auto"
					selected={isAutomatic}
					aria-label={messages.editor.frameControl.autoPlay}
					onChange={() => {
						componentEditorState.setPlaybackMode(
							isAutomatic ? "manual" : "auto",
						);
					}}
				>
					{messages.editor.frameControl.auto}
				</ToggleButton>
				<Box sx={{ display: "flex", width: "160px", flexShrink: 0 }}>
					<IconButton
						size="large"
						aria-label={messages.editor.frameControl.previousStep}
						disabled={isAutomatic || componentEditorState.timeStep <= 0}
						onClick={() => {
							componentEditorState.setTimeStep(
								componentEditorState.timeStep - 1,
							);
						}}
					>
						<ChevronLeft />
					</IconButton>
					<input
						aria-label={messages.editor.frameControl.timeStep}
						disabled={isAutomatic}
						style={{
							flex: 1,
							minWidth: 0,
							textAlign: "center",
							border: "none",
							outline: "none",
							fontSize: "20px",
						}}
						inputMode="numeric"
						value={stepDraft ?? String(componentEditorState.timeStep + 1)}
						onFocus={(e) => {
							const field = e.currentTarget;
							// After the click, which in WebKit would undo a selection made now
							requestAnimationFrame(() => field.select());
						}}
						onChange={(e) => setStepDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.nativeEvent.isComposing) {
								e.currentTarget.blur();
							}
						}}
						// Every step up to the one entered is simulated, so a step is only
						// gone to once it is typed in full, not at each key
						onBlur={() => {
							const stepNumber =
								stepDraft === null ? null : parseTimeStepNumber(stepDraft);
							if (stepNumber !== null) {
								componentEditorState.setTimeStep(stepNumber - 1);
							}
							setStepDraft(null);
						}}
					/>
					<IconButton
						size="large"
						aria-label={messages.editor.frameControl.nextStep}
						disabled={isAutomatic}
						onClick={() => {
							componentEditorState.setTimeStep(
								componentEditorState.timeStep + 1,
							);
						}}
					>
						<ChevronRight />
					</IconButton>
				</Box>
				<TextField
					label={messages.editor.frameControl.clockFrequency}
					type="number"
					size="small"
					sx={{ width: "160px" }}
					value={speedInput}
					error={!isSpeedValid}
					helperText={
						isSpeedValid
							? undefined
							: messages.editor.frameControl.speedRange(
									MIN_PLAYBACK_SPEED,
									MAX_PLAYBACK_SPEED,
								)
					}
					slotProps={{
						htmlInput: {
							min: MIN_PLAYBACK_SPEED,
							max: MAX_PLAYBACK_SPEED,
							step: "any",
						},
					}}
					onChange={(e) => {
						setSpeedInput(e.target.value);
						componentEditorState.setPlaybackSpeed(Number(e.target.value));
					}}
					onBlur={() => {
						setSpeedInput(
							String(componentEditorStore.getState().playbackSpeed),
						);
					}}
				/>
			</Paper>
		</Box>
	);
}
