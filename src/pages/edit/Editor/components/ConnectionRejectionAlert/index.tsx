import { Alert, Snackbar } from "@mui/material";
import { useComponentEditorStore } from "../../store";
import { describeConnectionRejection } from "./message";

const AUTO_HIDE_DURATION_MS = 4000;

export default function CCComponentEditorConnectionRejectionAlert() {
	const componentEditorState = useComponentEditorStore()();
	const notice = componentEditorState.connectionRejectionNotice;
	if (!notice) return null;

	return (
		<Snackbar
			key={notice.id}
			open
			autoHideDuration={AUTO_HIDE_DURATION_MS}
			anchorOrigin={{ vertical: "top", horizontal: "center" }}
			onClose={(_, reason) => {
				// Stays for its duration while the user goes on editing
				if (reason === "clickaway") return;
				componentEditorState.dismissConnectionRejectionNotice();
			}}
		>
			<Alert
				severity="warning"
				variant="filled"
				sx={{ maxWidth: "600px" }}
				onClose={() => componentEditorState.dismissConnectionRejectionNotice()}
			>
				{describeConnectionRejection(notice.rejection)}
			</Alert>
		</Snackbar>
	);
}
