import { ArrowForward, CheckCircle } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActionArea,
	Container,
	Typography,
} from "@mui/material";
import { type ReactNode, useState } from "react";
import { Link } from "react-router";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useMessages } from "../../i18n";
import { theme } from "../../style";
import { nextStageOf, readClearedStages } from "../../tutorial/progress";
import { resetTutorial } from "../../tutorial/stageStore";
import { tutorialStages } from "../../tutorial/stages";
import { StageNumber } from "./StageNumber";

function StageStatus({
	icon,
	label,
	color,
}: {
	icon: ReactNode;
	label: string;
	color: string;
}) {
	return (
		<Typography
			variant="body2"
			sx={{ display: "flex", alignItems: "center", gap: 0.5, color }}
		>
			{icon}
			{label}
		</Typography>
	);
}

export default function TutorialPage() {
	const messages = useMessages();
	const texts = messages.tutorial;
	const [clearedStages, setClearedStages] = useState(readClearedStages);
	const nextStage = nextStageOf(clearedStages);
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
			{/* Wide enough for the longest title on one line in three columns */}
			<Container sx={{ px: 2, py: 6, maxWidth: 960 }} maxWidth={false}>
				<Typography variant="h2" typography="h4" gutterBottom>
					{messages.header.modes.tutorial}
				</Typography>
				{texts.lead.map((sentence) => (
					<Typography key={sentence} color="textSecondary">
						{sentence}
					</Typography>
				))}
				<Box
					component="ol"
					sx={{
						listStyle: "none",
						p: 0,
						mt: 3,
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
						gridAutoRows: "1fr",
						gap: 2,
					}}
				>
					{tutorialStages.map((stage, index) => (
						<li key={stage.id}>
							<Card
								variant="outlined"
								sx={{
									height: "100%",
									...(stage.id === nextStage && {
										borderColor: theme.colors.tutorial,
										// A second pixel of border that does not move the content
										boxShadow: `inset 0 0 0 1px ${theme.colors.tutorial}`,
									}),
								}}
							>
								<CardActionArea
									component={Link}
									to={`/tutorial/${stage.id}`}
									sx={{
										p: 2,
										height: "100%",
										display: "flex",
										alignItems: "center",
										gap: 1.5,
									}}
								>
									<StageNumber number={index + 1} />
									{/* The status goes under the title rather than beside it, to leave the title room */}
									<Box sx={{ flexGrow: 1 }}>
										<Typography
											variant="h3"
											typography="h6"
											sx={{ wordBreak: "auto-phrase" }}
										>
											{texts.stageTexts[stage.id].title}
										</Typography>
										{clearedStages.has(stage.id) && (
											<StageStatus
												icon={<CheckCircle fontSize="inherit" />}
												label={texts.cleared}
												color={theme.colors.primary}
											/>
										)}
										{stage.id === nextStage && (
											<StageStatus
												icon={<ArrowForward fontSize="inherit" />}
												label={texts.upNext}
												color={theme.colors.tutorial}
											/>
										)}
									</Box>
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
