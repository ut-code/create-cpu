import { Alert, Grow, Stack } from "@mui/material";
import { useEffect } from "react";
import { useStore } from "../../../../../store/react";
import { useComponentEditorStore } from "../../store";
import { describeConnectionRejection } from "./connectionRejection";
import { describeInputValueReset } from "./inputValueReset";

const CONNECTION_REJECTION_DURATION_MS = 4000;

// Unlike a simulation error, a refused connection only answers the last attempt, so
// its notice hides itself
export default function CCComponentEditorNotifications() {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();
	const {
		connectionRejectionNotice,
		dismissConnectionRejectionNotice,
		inputValueResetNotice,
		dismissInputValueResetNotice,
		simulationError,
		dismissSimulationError,
	} = componentEditorState;

	// Any change of the circuit may have fixed what the error was about
	useEffect(
		() => store.subscribeToCircuitChanges(dismissSimulationError),
		[store, dismissSimulationError],
	);

	const connectionRejectionNoticeId = connectionRejectionNotice?.id;
	useEffect(() => {
		if (connectionRejectionNoticeId === undefined) return;
		const timeoutId = setTimeout(
			dismissConnectionRejectionNotice,
			CONNECTION_REJECTION_DURATION_MS,
		);
		return () => clearTimeout(timeoutId);
	}, [connectionRejectionNoticeId, dismissConnectionRejectionNotice]);

	if (
		!connectionRejectionNotice &&
		!inputValueResetNotice &&
		simulationError === null
	)
		return null;

	return (
		<Stack spacing={1} sx={{ alignItems: "center", pointerEvents: "none" }}>
			{connectionRejectionNotice && (
				// Remounted for each rejection, so that a repeated one shows up again
				<Grow key={connectionRejectionNotice.id} in>
					<Alert
						severity="warning"
						variant="filled"
						sx={{ maxWidth: "600px", pointerEvents: "auto" }}
						onClose={dismissConnectionRejectionNotice}
					>
						{describeConnectionRejection(connectionRejectionNotice.rejection)}
					</Alert>
				</Grow>
			)}
			{inputValueResetNotice && (
				<Alert
					severity="warning"
					variant="filled"
					sx={{ maxWidth: "600px", pointerEvents: "auto" }}
					onClose={dismissInputValueResetNotice}
				>
					{describeInputValueReset(inputValueResetNotice)}
				</Alert>
			)}
			{simulationError !== null && (
				<Alert
					severity="error"
					variant="filled"
					sx={{ maxWidth: "600px", pointerEvents: "auto" }}
					onClose={dismissSimulationError}
				>
					{simulationError.message}
				</Alert>
			)}
		</Stack>
	);
}
