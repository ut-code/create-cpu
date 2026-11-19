import { CheckCircle } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActionArea,
	Container,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { Link } from "react-router";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useMessages } from "../../i18n";
import { theme } from "../../style";
import { readClearedStages } from "../../tutorial/progress";
import { resetTutorial } from "../../tutorial/stageStore";
import { tutorialStages } from "../../tutorial/stages";

export default function TutorialPage() {
	const messages = useMessages();
	const texts = messages.tutorial;
	const [clearedStages, setClearedStages] = useState(readClearedStages);
	const [isConfirming, setIsConfirming] = useState(false);
	const [hasFailed, setHasFailed] = useState(false);

	const startOver = () => {
		setIsConfirming(false);
		try {
			resetTutorial();
			setHasFailed(false);
		} catch (error) {
			console.error(error);
			setHasFailed(true);
		}
		setClearedStages(readClearedStages());
	};

	return (
		<div style={{ overflowY: "auto" }}>
			<Container sx={{ px: 2, py: 6 }} maxWidth="md">
				<Typography variant="h2" typography="h4" gutterBottom>
					{messages.header.modes.tutorial}
				</Typography>
				<Typography color="textSecondary">{texts.lead}</Typography>
				<Box
					component="ol"
					sx={{ listStyle: "none", p: 0, mt: 3, display: "grid", gap: 2 }}
				>
					{tutorialStages.map((stage, index) => (
						<li key={stage.id}>
							<Card variant="outlined">
								<CardActionArea
									component={Link}
									to={`/tutorial/${stage.id}`}
									sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}
								>
									<Box sx={{ flexGrow: 1 }}>
										<Typography color="textSecondary" variant="body2">
											{texts.stageNumber(index + 1)}
										</Typography>
										<Typography variant="h3" typography="h6">
											{texts.stageTexts[stage.id].title}
										</Typography>
									</Box>
									{clearedStages.has(stage.id) && (
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 0.5,
												color: theme.colors.primary,
												flexShrink: 0,
											}}
										>
											<CheckCircle fontSize="small" />
											{texts.cleared}
										</Box>
									)}
								</CardActionArea>
							</Card>
						</li>
					))}
				</Box>
				{hasFailed && (
					<Alert severity="error" sx={{ mt: 2 }}>
						{texts.startOverFailed}
					</Alert>
				)}
				<Button
					variant="text"
					color="error"
					sx={{ mt: 3 }}
					onClick={() => setIsConfirming(true)}
				>
					{texts.startOver}
				</Button>
			</Container>
			{isConfirming && (
				<ConfirmDialog
					title={texts.startOverDialog.title}
					confirmLabel={texts.startOverDialog.confirm}
					onConfirm={startOver}
					onCancel={() => setIsConfirming(false)}
				>
					{texts.startOverDialog.body}
				</ConfirmDialog>
			)}
		</div>
	);
}
