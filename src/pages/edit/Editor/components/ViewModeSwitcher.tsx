import { Edit, PlayArrow } from "@mui/icons-material";
import { Fab } from "@mui/material";
import { useMessages } from "../../../../i18n";
import { useIsEachInputPinConnected } from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorViewModeSwitcher() {
	const componentEditorState = useComponentEditorStore()();
	const texts = useMessages().editor.viewMode;
	const isEditing = componentEditorState.editorMode === "edit";
	const isEachInputPinConnected = useIsEachInputPinConnected(
		componentEditorState.componentId,
	);
	// Pressed even when pale, so that the simulation names the free pin
	const looksDisabled = isEditing && !isEachInputPinConnected;

	return (
		<Fab
			style={{ position: "absolute", bottom: "40px", right: "40px" }}
			color="primary"
			onClick={() => {
				componentEditorState.setEditorMode(isEditing ? "play" : "edit");
				componentEditorState.setTimeStep(0);
			}}
			aria-label={isEditing ? texts.play : texts.edit}
			aria-disabled={looksDisabled}
			sx={
				looksDisabled
					? {
							color: "action.disabled",
							bgcolor: "action.disabledBackground",
							boxShadow: "none",
							"&:hover": { bgcolor: "action.disabledBackground" },
							"&:active": { boxShadow: "none" },
						}
					: {}
			}
		>
			{isEditing ? <PlayArrow /> : <Edit />}
		</Fab>
	);
}
