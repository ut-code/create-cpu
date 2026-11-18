import { Alert, Stack } from "@mui/material";
import { useEffect } from "react";
import { useComponentEditorStore } from "../../store";
import { describeConnectionRejection } from "./connectionRejection";

const CONNECTION_REJECTION_DURATION_MS = 4000;

// A refused connection only answers the last attempt, so unlike a simulation error,
// which lasts as long as the circuit stays as it is, its notice hides itself
export default function CCComponentEditorNotifications() {
	const componentEditorState = useComponentEditorStore()();
	const {
		connectionRejectionNotice,
		dismissConnectionRejectionNotice,
		simulationError,
		dismissSimulationError,
	} = componentEditorState;

	const connectionRejectionNoticeId = connectionRejectionNotice?.id;
	useEffect(() => {
		if (connectionRejectionNoticeId === undefined) return;
		const timeoutId = setTimeout(
			dismissConnectionRejectionNotice,
			CONNECTION_REJECTION_DURATION_MS,
		);
		return () => clearTimeout(timeoutId);
	}, [connectionRejectionNoticeId, dismissConnectionRejectionNotice]);

	return (
		<Stack
			spacing={1}
			sx={{
				position: "absolute",
				bottom: "24px",
				left: "16px",
				right: "112px",
				alignItems: "center",
				pointerEvents: "none",
			}}
		>
			{connectionRejectionNotice && (
				<Alert
					key={connectionRejectionNotice.id}
					severity="warning"
					variant="filled"
					sx={{ maxWidth: "600px", pointerEvents: "auto" }}
					onClose={dismissConnectionRejectionNotice}
				>
					{describeConnectionRejection(connectionRejectionNotice.rejection)}
				</Alert>
			)}
			{simulationError !== null && (
				<Alert
					severity="error"
					variant="filled"
					sx={{ maxWidth: "600px", pointerEvents: "auto" }}
					onClose={dismissSimulationError}
				>
					{simulationError}
				</Alert>
			)}
		</Stack>
	);
}
