import { Edit, PlayArrow, SkipNext } from "@mui/icons-material";
import { Fab } from "@mui/material";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorViewModeSwitcher() {
	const componentEditorState = useComponentEditorStore()();

	return (
		<>
			<Fab
				style={{ position: "absolute", bottom: "40px", right: "40px" }}
				color="primary"
				onClick={() => {
					componentEditorState.setEditorMode(
						componentEditorState.editorMode === "edit" ? "play" : "edit",
					);
					componentEditorState.resetTimeStep();
				}}
			>
				{componentEditorState.editorMode === "edit" ? <PlayArrow /> : <Edit />}
			</Fab>
			{componentEditorState.editorMode === "play" && (
				<Fab
					style={{ position: "absolute", bottom: "40px", right: "120px" }}
					color="primary"
					onClick={() => componentEditorState.incrementTimeStep()}
				>
					<SkipNext />
				</Fab>
			)}
		</>
	);
}
