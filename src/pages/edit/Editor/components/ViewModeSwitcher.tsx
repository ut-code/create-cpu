import { Edit, PlayArrow } from "@mui/icons-material";
import { Fab } from "@mui/material";
import { useIsEachInputPinConnected } from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorViewModeSwitcher() {
	const componentEditorState = useComponentEditorStore()();
	const isEachInputPinConnected = useIsEachInputPinConnected(
		componentEditorState.componentId,
	);
	// Pale while a pin is free, yet pressed all the same, so that the simulation can
	// tell which pin it is
	const looksDisabled =
		componentEditorState.editorMode === "edit" && !isEachInputPinConnected;

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
			aria-disabled={looksDisabled}
			sx={
				looksDisabled
					? {
							color: "action.disabled",
							bgcolor: "action.disabledBackground",
							boxShadow: "none",
							"&:hover": { bgcolor: "action.disabledBackground" },
						}
					: {}
			}
		>
			{componentEditorState.editorMode === "edit" ? <PlayArrow /> : <Edit />}
		</Fab>
	);
}
