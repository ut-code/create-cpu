import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { IconButton, Paper } from "@mui/material";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorFrameControl() {
	const componentEditorState = useComponentEditorStore()();

	if (componentEditorState.editorMode === "edit") return null;

	return (
		<Paper
			sx={{
				position: "absolute",
				bottom: "40px",
				left: "calc(50% - 80px)",
				width: "160px",
				display: "flex",
				backgroundColor: "background.paper",
				borderRadius: "40px",
			}}
			elevation={3}
		>
			<IconButton
				size="large"
				disabled={componentEditorState.timeStep <= 0}
				onClick={() => {
					componentEditorState.setTimeStep(componentEditorState.timeStep - 1);
				}}
			>
				<ChevronLeft />
			</IconButton>
			<input
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
					const value = Number.parseInt(e.target.value, 10);
					if (!Number.isNaN(value) && value > 0) {
						componentEditorState.setTimeStep(value - 1);
					}
				}}
			/>
			<IconButton
				size="large"
				onClick={() => {
					componentEditorState.setTimeStep(componentEditorState.timeStep + 1);
				}}
			>
				<ChevronRight />
			</IconButton>
		</Paper>
	);
}
