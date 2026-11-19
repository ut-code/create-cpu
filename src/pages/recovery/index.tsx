import { Download as DownloadIcon } from "@mui/icons-material";
import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { useState } from "react";
import { AppLayout } from "../../App";
import { downloadJson } from "../../common/downloadJson";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useMessages } from "../../i18n";
import type { UnrestorableSavedStore } from "../../store/react";

export default function RecoveryPage({
	json,
	startOver,
}: UnrestorableSavedStore) {
	const messages = useMessages();
	const texts = messages.recovery;
	const [isConfirming, setIsConfirming] = useState(false);
	const [error, setError] = useState<"storageFull" | "startOverFailed" | null>(
		null,
	);

	const confirmStartOver = () => {
		setIsConfirming(false);
		try {
			startOver();
		} catch (startOverError) {
			console.error(startOverError);
			setError(
				startOverError instanceof DOMException &&
					startOverError.name === "QuotaExceededError"
					? "storageFull"
					: "startOverFailed",
			);
		}
	};

	return (
		<AppLayout>
			<div style={{ overflowY: "auto" }}>
				<Container sx={{ px: 2, py: 6 }} maxWidth="sm">
					<Typography variant="h2" typography="h4" gutterBottom>
						{texts.title}
					</Typography>
					<Typography>{texts.body}</Typography>
					{error && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{texts.errors[error]}
						</Alert>
					)}
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 3 }}>
						<Button
							variant="contained"
							onClick={() => downloadJson(json, "saved-store.json")}
							startIcon={<DownloadIcon />}
						>
							{texts.download}
						</Button>
						<Button
							variant="text"
							color="error"
							onClick={() => setIsConfirming(true)}
						>
							{texts.startOver}
						</Button>
					</Box>
				</Container>
			</div>
			{isConfirming && (
				<ConfirmDialog
					title={texts.startOverDialog.title}
					confirmLabel={texts.startOverDialog.confirm}
					onConfirm={confirmStartOver}
					onCancel={() => setIsConfirming(false)}
				>
					{texts.startOverDialog.body}
				</ConfirmDialog>
			)}
		</AppLayout>
	);
}
