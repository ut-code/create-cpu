import {
	AppBar,
	Box,
	Chip,
	Link,
	ToggleButton,
	ToggleButtonGroup,
} from "@mui/material";
import type { CSSProperties } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import {
	type Language,
	languages,
	messagesByLanguage,
	useLanguage,
	useMessages,
} from "../i18n";
import { theme } from "../style";

export type GlobalHeaderProps = {
	style: CSSProperties;
};

type Mode = "free" | "tutorial";

function modeOfPath(pathname: string): Mode | null {
	if (pathname.startsWith("/tutorial")) return "tutorial";
	if (pathname.startsWith("/free")) return "free";
	return null;
}

export default function GlobalHeader({ style }: GlobalHeaderProps) {
	const { language, setLanguage } = useLanguage();
	const messages = useMessages();
	const mode = modeOfPath(useLocation().pathname);

	return (
		<AppBar
			color="default"
			position="static"
			elevation={0}
			style={style}
			sx={{
				px: 2,
				py: 1,
				gap: 2,
				flexDirection: "row",
				alignItems: "center",
				background:
					mode === "tutorial"
						? theme.colors.tutorialBackground
						: theme.colors.white,
				borderBottom: "1px solid",
				borderColor: "divider",
			}}
		>
			<Link component={RouterLink} to="/" color="inherit" underline="hover">
				CreateCPU
			</Link>
			{mode && (
				<Chip
					label={messages.header.modes[mode]}
					size="small"
					variant={mode === "tutorial" ? "filled" : "outlined"}
					sx={
						mode === "tutorial"
							? { background: theme.colors.tutorial, color: theme.colors.white }
							: {}
					}
				/>
			)}
			<Box sx={{ flexGrow: 1 }} />
			<ToggleButtonGroup
				value={language}
				exclusive
				size="small"
				aria-label={messages.header.language}
				onChange={(_, value: Language | null) => {
					if (value) setLanguage(value);
				}}
			>
				{languages.map((option) => (
					<ToggleButton
						key={option}
						value={option}
						lang={option}
						sx={{ py: 0.25 }}
					>
						{messagesByLanguage[option].languageName}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
		</AppBar>
	);
}
