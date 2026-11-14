import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Box, IconButton, Paper, TextField, ToggleButton } from "@mui/material";
import { useState } from "react";
import { useInterval } from "react-use";
import { useComponentEditorStore } from "../store";
import {
	isValidPlaybackSpeed,
	MAX_PLAYBACK_SPEED,
	MIN_PLAYBACK_SPEED,
} from "../store/slices/core/types";

export default function CCComponentEditorFrameControl() {
	const componentEditorStore = useComponentEditorStore();
	const componentEditorState = componentEditorStore();
	const [speedInput, setSpeedInput] = useState(
		String(componentEditorState.playbackSpeed),
	);
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
				position: "absolute",
				bottom: "40px",
				left: "16px",
				right: "112px",
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
					value="auto"
					selected={isAutomatic}
					size="small"
					aria-label="自動再生"
					onChange={() => {
						componentEditorState.setPlaybackMode(
							isAutomatic ? "manual" : "auto",
						);
					}}
				>
					Auto
				</ToggleButton>
				<Box sx={{ display: "flex", width: "160px", flexShrink: 0 }}>
					<IconButton
						size="large"
						aria-label="前のステップ"
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
						aria-label="タイムステップ"
						disabled={isAutomatic}
						style={{
							flex: 1,
							minWidth: 0,
							textAlign: "center",
							border: "none",
							outline: "none",
							fontSize: "20px",
						}}
						value={componentEditorState.timeStep + 1}
						onChange={(e) => {
							const value = Number(e.target.value);
							if (Number.isSafeInteger(value) && value > 0) {
								componentEditorState.setTimeStep(value - 1);
							}
						}}
					/>
					<IconButton
						size="large"
						aria-label="次のステップ"
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
					label="クロック周波数 (Hz)"
					type="number"
					size="small"
					sx={{ width: "160px" }}
					value={speedInput}
					error={!isSpeedValid}
					helperText={
						isSpeedValid
							? undefined
							: `${MIN_PLAYBACK_SPEED}〜${MAX_PLAYBACK_SPEED} を入力`
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
