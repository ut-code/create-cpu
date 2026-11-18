import { AppBar, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { CSSProperties } from "react";
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

export default function GlobalHeader({ style }: GlobalHeaderProps) {
	const { language, setLanguage } = useLanguage();
	const messages = useMessages();

	return (
		<AppBar
			color="default"
			position="static"
			elevation={0}
			style={style}
			sx={{
				px: 2,
				py: 1,
				flexDirection: "row",
				alignItems: "center",
				background: theme.colors.white,
				borderBottom: "1px solid",
				borderColor: "divider",
			}}
		>
			CreateCPU
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
