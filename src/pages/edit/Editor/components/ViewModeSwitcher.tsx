import { Edit, PlayArrow } from "@mui/icons-material";
import { Fab } from "@mui/material";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorViewModeSwitcher() {
	const componentEditorState = useComponentEditorStore()();

	return (
		<Fab
			style={{ position: "absolute", bottom: "40px", right: "40px" }}
			color="primary"
			onClick={() => {
				componentEditorState.setEditorMode(
					componentEditorState.editorMode === "edit" ? "play" : "edit",
				);
				componentEditorState.setTimeStep(0);
			}}
		>
			{componentEditorState.editorMode === "edit" ? <PlayArrow /> : <Edit />}
		</Fab>
	);
}
