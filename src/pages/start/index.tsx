import { Card, CardActionArea, Container, Typography } from "@mui/material";
import { Link } from "react-router";
import { useMessages } from "../../i18n";
import { theme } from "../../style";

export default function StartPage() {
	const messages = useMessages();
	const choices = [
		{
			to: "/tutorial",
			title: messages.header.modes.tutorial,
			body: messages.start.tutorial,
			color: theme.colors.tutorial,
		},
		{
			to: "/free",
			title: messages.header.modes.free,
			body: messages.start.free,
			color: theme.colors.primary,
		},
	];
	return (
		<div style={{ overflowY: "auto" }}>
			<Container sx={{ px: 2, py: 6 }} maxWidth="md">
				<Typography variant="h2" typography="h4" gutterBottom>
					{messages.start.title}
				</Typography>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
						gap: "16px",
						marginTop: "24px",
					}}
				>
					{choices.map((choice) => (
						<Card
							key={choice.to}
							variant="outlined"
							sx={{ borderTop: `4px solid ${choice.color}` }}
						>
							<CardActionArea component={Link} to={choice.to} sx={{ p: 3 }}>
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
