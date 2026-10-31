import { Alert, Snackbar } from "@mui/material";
import { useComponentEditorStore } from "../store";

/**
 * Shows why the circuit could not be simulated, e.g. because a loop needs a flip-flop
 * to break it or because an input pin is left unconnected.
 */
export default function CCComponentEditorSimulationErrorAlert() {
	const componentEditorState = useComponentEditorStore()();
	const message = componentEditorState.simulationError;

	return (
		<Snackbar
			open={message !== null}
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
		>
			<Alert
				severity="error"
				variant="filled"
				sx={{ maxWidth: "600px" }}
				onClose={() => {
					componentEditorState.dismissSimulationError();
				}}
			>
				{message}
			</Alert>
		</Snackbar>
	);
}
