import { Card, CardActionArea, Container, Typography } from "@mui/material";
import { Link } from "react-router";
import { appName } from "../../common/appName";
import { useMessages } from "../../i18n";
import { theme } from "../../style";

export default function StartPage() {
	const messages = useMessages();
	const choices = [
		{
			to: "/tutorial",
			audience: messages.start.tutorialAudience,
			title: messages.header.modes.tutorial,
			body: messages.start.tutorial,
			color: theme.colors.tutorial,
		},
		{
			to: "/free",
			audience: messages.start.freeAudience,
			title: messages.header.modes.free,
			body: messages.start.free,
			color: theme.colors.primary,
		},
	];
	return (
		<div style={{ overflowY: "auto" }}>
			<Container sx={{ px: 2, py: 6 }} maxWidth="md">
				<Typography variant="h1" typography="h4" gutterBottom>
					{appName}
				</Typography>
				<Typography color="textSecondary">{messages.start.intro}</Typography>
				<Typography variant="h2" typography="h6" sx={{ mt: 4 }}>
					{messages.start.title}
				</Typography>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
						gap: "16px",
						marginTop: "8px",
					}}
				>
					{choices.map((choice) => (
						<Card
							key={choice.to}
							variant="outlined"
							sx={{ display: "flex", borderTop: `4px solid ${choice.color}` }}
						>
							<CardActionArea
								component={Link}
								to={choice.to}
								sx={{ p: 3, flexGrow: 1, alignSelf: "stretch" }}
							>
								<Typography
									variant="body2"
									sx={{ color: choice.color, fontWeight: "bold" }}
								>
									{choice.audience}
								</Typography>
								<Typography variant="h3" typography="h5" gutterBottom>
									{choice.title}
								</Typography>
								<Typography color="textSecondary">{choice.body}</Typography>
							</CardActionArea>
						</Card>
					))}
				</div>
			</Container>
		</div>
	);
}
